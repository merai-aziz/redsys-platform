import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

import { prisma } from '@/lib/prisma'
import {
  parseDecimal,
  parseEquipmentSpecs,
  parseEquipmentType,
  parseInteger,
  slugify,
  validateEquipmentSpecs,
} from '@/lib/equipment'
import { EquipmentStatusEnum, Prisma } from '@prisma/client'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

type CatalogType = 'brand' | 'category' | 'subcategory' | 'subsubcategory' | 'equipment'

function normalizeType(value: string | null): CatalogType | null {
  switch (value) {
    case 'brand':
    case 'brands':
      return 'brand'
    case 'category':
    case 'categories':
      return 'category'
    case 'subcategory':
    case 'subcategories':
      return 'subcategory'
    case 'subsubcategory':
    case 'subsubcategories':
    case 'sub-subcategory':
      return 'subsubcategory'
    case 'equipment':
    case 'equipments':
      return 'equipment'
    default:
      return null
  }
}

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, accessSecret)
    if (payload.role !== 'ADMIN') return null
    return payload
  } catch {
    return null
  }
}

function catalogError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

async function resolveLineage(categoryId: string) {
  const byId = new Map<string, { id: string; parentId: string | null }>()
  const categories = await prisma.equipmentCategory.findMany({
    select: { id: true, parentId: true },
  })
  categories.forEach((item) => byId.set(item.id, item))

  const path: string[] = []
  let cursor = byId.get(categoryId)
  while (cursor) {
    path.push(cursor.id)
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
  }

  const rootToLeaf = path.reverse()
  return {
    categoryId: rootToLeaf[0] || '',
    subCategoryId: rootToLeaf[1] || '',
    subSubCategoryId: rootToLeaf[2] || '',
  }
}

type EquipmentWithRelations = Prisma.EquipmentGetPayload<{
  include: { brand: true; category: true; images: true; specs: true }
}>

async function serializeEquipment(item: EquipmentWithRelations) {
  const lineage = await resolveLineage(item.categoryId)
  return {
    id: item.id,
    name: item.name,
    slug: '',
    reference: item.reference,
    description: item.description,
    photo: item.images[0]?.url || null,
    price: item.price ? item.price.toString() : null,
    quantity: item.quantity,
    status: item.status,
    equipmentType: item.equipmentType,
    specs: item.specs.map((spec) => ({
      id: spec.id,
      specKey: spec.specKey,
      specValue: spec.specValue,
      unit: spec.unit,
    })),
    brandId: item.brandId,
    categoryId: lineage.categoryId,
    subCategoryId: lineage.subCategoryId,
    subSubCategoryId: lineage.subSubCategoryId,
    brand: item.brand,
    category: item.category,
  }
}

async function getParentLevel(parentId: string | null) {
  if (!parentId) return 1
  const parent = await prisma.equipmentCategory.findUnique({
    where: { id: parentId },
    select: { level: true },
  })
  if (!parent) throw new Error('Parent category introuvable')
  return parent.level + 1
}

function resolveEquipmentCategoryId(body: Record<string, unknown>) {
  return (
    (body.subSubCategoryId as string | undefined) ||
    (body.subCategoryId as string | undefined) ||
    (body.categoryId as string | undefined) ||
    ''
  )
}

export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req)
  if (!admin) return catalogError('Non autorisé', 401)

  const type = normalizeType(req.nextUrl.searchParams.get('type'))
  if (!type) return catalogError('Type manquant')

  try {
    if (type === 'brand') {
      const brands = await prisma.equipmentBrand.findMany({ orderBy: { name: 'asc' } })
      return NextResponse.json({ brands })
    }

    if (type === 'category') {
      const categories = await prisma.equipmentCategory.findMany({
        where: { parentId: null },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        include: {
          children: {
            orderBy: [{ level: 'asc' }, { name: 'asc' }],
            include: {
              children: {
                orderBy: [{ level: 'asc' }, { name: 'asc' }],
              },
            },
          },
        },
      })

      return NextResponse.json({
        categories: categories.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description,
          icon: item.icon,
          parentId: item.parentId,
          level: item.level,
          subCategories: item.children.map((child) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            parentId: child.parentId,
            level: child.level,
            subCategories: child.children.map((leaf) => ({
              id: leaf.id,
              name: leaf.name,
              slug: leaf.slug,
            })),
          })),
        })),
      })
    }

    if (type === 'subcategory') {
      const categoryId = req.nextUrl.searchParams.get('categoryId') || undefined
      const subcategories = await prisma.equipmentCategory.findMany({
        where: {
          parentId: categoryId,
        },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      })
      return NextResponse.json({
        subcategories: subcategories.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description,
          icon: item.icon,
          categoryId: item.parentId,
        })),
      })
    }

    if (type === 'subsubcategory') {
      const subCategoryId = req.nextUrl.searchParams.get('subCategoryId') || undefined
      const subsubcategories = await prisma.equipmentCategory.findMany({
        where: {
          parentId: subCategoryId,
        },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      })
      return NextResponse.json({
        subsubcategories: subsubcategories.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description,
          icon: item.icon,
          subCategoryId: item.parentId,
        })),
      })
    }

    const search = req.nextUrl.searchParams.get('search')?.trim() || ''
    const brandId = req.nextUrl.searchParams.get('brandId') || undefined
    const categoryId = req.nextUrl.searchParams.get('categoryId') || undefined
    const subCategoryId = req.nextUrl.searchParams.get('subCategoryId') || undefined
    const subSubCategoryId = req.nextUrl.searchParams.get('subSubCategoryId') || undefined
    const status = req.nextUrl.searchParams.get('status') || undefined
    const equipmentType = req.nextUrl.searchParams.get('equipmentType') || undefined
    const effectiveCategoryId = subSubCategoryId || subCategoryId || categoryId

    const equipment = await prisma.equipment.findMany({
      where: {
        ...(brandId ? { brandId } : {}),
        ...(effectiveCategoryId ? { categoryId: effectiveCategoryId } : {}),
        ...(status ? { status: status as EquipmentStatusEnum } : {}),
        ...(equipmentType ? { equipmentType: parseEquipmentType(equipmentType) } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { reference: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { brand: { name: { contains: search, mode: 'insensitive' } } },
                { category: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        brand: true,
        category: true,
        images: {
          orderBy: { id: 'asc' },
        },
        specs: {
          orderBy: { specKey: 'asc' },
        },
      },
    })

    return NextResponse.json({
      equipment: await Promise.all(equipment.map((item) => serializeEquipment(item))),
    })
  } catch (error) {
    console.error(error)
    return catalogError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin(req)
  if (!admin) return catalogError('Non autorisé', 401)

  const type = normalizeType(req.nextUrl.searchParams.get('type'))
  if (!type) return catalogError('Type manquant')

  try {
    const body = (await req.json()) as Record<string, unknown>

    if (type === 'brand') {
      if (!body.name) return catalogError('Nom requis')
      const brand = await prisma.equipmentBrand.create({
        data: {
          name: String(body.name),
          logo: (body.logo as string) || null,
        },
      })
      return NextResponse.json({ brand }, { status: 201 })
    }

    if (type === 'category') {
      if (!body.name) return catalogError('Nom requis')
      const parentId = (body.parentId as string | undefined) || null
      const level = await getParentLevel(parentId)
      const category = await prisma.equipmentCategory.create({
        data: {
          name: String(body.name),
          description: (body.description as string) || null,
          parentId,
          level,
          slug: (body.slug as string) || slugify(String(body.name)),
          icon: (body.icon as string) || null,
        },
      })
      return NextResponse.json({ category }, { status: 201 })
    }

    if (type === 'subcategory') {
      if (!body.name || !body.categoryId) return catalogError('Nom et categorie requis')
      const level = await getParentLevel(String(body.categoryId))
      const subcategory = await prisma.equipmentCategory.create({
        data: {
          name: String(body.name),
          description: (body.description as string) || null,
          parentId: String(body.categoryId),
          level,
          slug: (body.slug as string) || slugify(String(body.name)),
          icon: (body.icon as string) || null,
        },
      })
      return NextResponse.json({ subcategory }, { status: 201 })
    }

    if (type === 'subsubcategory') {
      if (!body.name || !body.subCategoryId) return catalogError('Nom et sous-categorie requis')
      const level = await getParentLevel(String(body.subCategoryId))
      const subsubcategory = await prisma.equipmentCategory.create({
        data: {
          name: String(body.name),
          description: (body.description as string) || null,
          parentId: String(body.subCategoryId),
          level,
          slug: (body.slug as string) || slugify(String(body.name)),
          icon: (body.icon as string) || null,
        },
      })
      return NextResponse.json({ subsubcategory }, { status: 201 })
    }

    const resolvedCategoryId = resolveEquipmentCategoryId(body)
    if (!body.name || !body.reference || !body.brandId || !resolvedCategoryId) {
      return catalogError('Champs obligatoires manquants')
    }

    const equipmentType = parseEquipmentType(body.equipmentType)
    const specs = parseEquipmentSpecs(body.specs)
    const specsValidation = validateEquipmentSpecs(equipmentType, specs)
    if (!specsValidation.ok) {
      return catalogError(specsValidation.message)
    }

    const equipment = await prisma.equipment.create({
      data: {
        name: String(body.name),
        reference: String(body.reference),
        description: (body.description as string) || null,
        price: parseDecimal(body.price) ?? undefined,
        quantity: parseInteger(body.quantity, 0),
        status: (body.status as EquipmentStatusEnum) || 'AVAILABLE',
        equipmentType,
        brandId: String(body.brandId),
        categoryId: resolvedCategoryId,
        ...(specs.length > 0
          ? {
              specs: {
                create: specs,
              },
            }
          : {}),
        ...(body.photo
          ? {
              images: {
                create: [{ url: String(body.photo) }],
              },
            }
          : {}),
      },
      include: {
        brand: true,
        category: true,
        images: true,
        specs: true,
      },
    })

    return NextResponse.json({ equipment: await serializeEquipment(equipment) }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return catalogError('Valeur deja utilisee', 409)
    }
    console.error(error)
    return catalogError('Erreur serveur', 500)
  }
}
