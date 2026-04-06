import { NextRequest, NextResponse } from 'next/server'
import { EquipmentStatusEnum, Prisma } from '@prisma/client'
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

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(req)
  if (!admin) return catalogError('Non autorisé', 401)

  const type = normalizeType(req.nextUrl.searchParams.get('type'))
  if (!type) return catalogError('Type manquant')

  const { id } = await context.params
  if (!id) return catalogError('ID manquant')

  try {
    const body = (await req.json()) as Record<string, unknown>

    if (type === 'brand') {
      const brand = await prisma.equipmentBrand.update({
        where: { id },
        data: {
          name: body.name ? String(body.name) : undefined,
          logo: body.logo === undefined ? undefined : (body.logo as string) || null,
        },
      })
      return NextResponse.json({ brand })
    }

    if (type === 'category') {
      const parentId = body.parentId === undefined ? undefined : ((body.parentId as string) || null)
      const level = body.parentId === undefined ? undefined : await getParentLevel(parentId ?? null)
      const category = await prisma.equipmentCategory.update({
        where: { id },
        data: {
          name: body.name ? String(body.name) : undefined,
          description: body.description === undefined ? undefined : (body.description as string) || null,
          parentId,
          level,
          slug: body.slug ? String(body.slug) : body.name ? slugify(String(body.name)) : undefined,
          icon: body.icon === undefined ? undefined : (body.icon as string) || null,
        },
      })
      return NextResponse.json({ category })
    }

    if (type === 'subcategory') {
      const parentId = body.categoryId === undefined ? undefined : String(body.categoryId)
      const level = body.categoryId === undefined ? undefined : await getParentLevel(String(body.categoryId))
      const subcategory = await prisma.equipmentCategory.update({
        where: { id },
        data: {
          name: body.name ? String(body.name) : undefined,
          description: body.description === undefined ? undefined : (body.description as string) || null,
          parentId,
          level,
          slug: body.slug ? String(body.slug) : body.name ? slugify(String(body.name)) : undefined,
          icon: body.icon === undefined ? undefined : (body.icon as string) || null,
        },
      })
      return NextResponse.json({ subcategory })
    }

    if (type === 'subsubcategory') {
      const parentId = body.subCategoryId === undefined ? undefined : String(body.subCategoryId)
      const level = body.subCategoryId === undefined ? undefined : await getParentLevel(String(body.subCategoryId))
      const subsubcategory = await prisma.equipmentCategory.update({
        where: { id },
        data: {
          name: body.name ? String(body.name) : undefined,
          description: body.description === undefined ? undefined : (body.description as string) || null,
          parentId,
          level,
          slug: body.slug ? String(body.slug) : body.name ? slugify(String(body.name)) : undefined,
          icon: body.icon === undefined ? undefined : (body.icon as string) || null,
        },
      })
      return NextResponse.json({ subsubcategory })
    }

    const resolvedCategoryId = resolveEquipmentCategoryId(body)
    const current = await prisma.equipment.findUnique({
      where: { id },
      select: { equipmentType: true },
    })
    if (!current) return catalogError('Equipement introuvable', 404)

    const nextEquipmentType =
      body.equipmentType !== undefined
        ? parseEquipmentType(body.equipmentType, current.equipmentType)
        : current.equipmentType

    const specsProvided = Object.prototype.hasOwnProperty.call(body, 'specs')
    const parsedSpecs = specsProvided ? parseEquipmentSpecs(body.specs) : null

    if (nextEquipmentType === 'SERVER') {
      const specsToValidate = parsedSpecs
        ? parsedSpecs
        : await prisma.equipmentSpec.findMany({
            where: { equipmentId: id },
            select: { specKey: true, specValue: true, unit: true },
          })
      const specsValidation = validateEquipmentSpecs(nextEquipmentType, specsToValidate)
      if (!specsValidation.ok) {
        return catalogError(specsValidation.message)
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.equipment.update({
        where: { id },
        data: {
          name: body.name ? String(body.name) : undefined,
          reference: body.reference ? String(body.reference) : undefined,
          description: body.description === undefined ? undefined : (body.description as string) || null,
          price: body.price !== undefined ? parseDecimal(body.price) ?? undefined : undefined,
          quantity: body.quantity !== undefined ? parseInteger(body.quantity, 0) : undefined,
          status: body.status as EquipmentStatusEnum | undefined,
          equipmentType: body.equipmentType !== undefined ? nextEquipmentType : undefined,
          brandId: body.brandId ? String(body.brandId) : undefined,
          categoryId: resolvedCategoryId || undefined,
        },
      })

      if (parsedSpecs) {
        await tx.equipmentSpec.deleteMany({ where: { equipmentId: id } })
        if (parsedSpecs.length > 0) {
          await tx.equipmentSpec.createMany({
            data: parsedSpecs.map((spec) => ({
              equipmentId: id,
              specKey: spec.specKey,
              specValue: spec.specValue,
              unit: spec.unit,
            })),
          })
        }
      }
    })

    if (body.photo !== undefined) {
      await prisma.equipmentImage.deleteMany({ where: { equipmentId: id } })
      if (body.photo) {
        await prisma.equipmentImage.create({
          data: {
            equipmentId: id,
            url: String(body.photo),
          },
        })
      }
    }

    const refreshed = await prisma.equipment.findUniqueOrThrow({
      where: { id },
      include: {
        brand: true,
        category: true,
        images: true,
        specs: true,
      },
    })

    return NextResponse.json({ equipment: await serializeEquipment(refreshed) })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return catalogError('Valeur deja utilisee', 409)
    }
    console.error(error)
    return catalogError('Erreur serveur', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(req)
  if (!admin) return catalogError('Non autorisé', 401)

  const type = normalizeType(req.nextUrl.searchParams.get('type'))
  if (!type) return catalogError('Type manquant')

  const { id } = await context.params
  if (!id) return catalogError('ID manquant')

  try {
    if (type === 'brand') {
      await prisma.equipmentBrand.delete({ where: { id } })
      return NextResponse.json({ message: 'Marque supprimee' })
    }

    if (type === 'category' || type === 'subcategory' || type === 'subsubcategory') {
      await prisma.equipmentCategory.delete({ where: { id } })
      return NextResponse.json({ message: 'Categorie supprimee' })
    }

    await prisma.equipment.delete({ where: { id } })
    return NextResponse.json({ message: 'Equipement supprime' })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return catalogError('Suppression impossible car des elements dependent existent', 409)
    }
    console.error(error)
    return catalogError('Erreur serveur', 500)
  }
}
