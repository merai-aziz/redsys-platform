import { NextRequest, NextResponse } from 'next/server'
import { EquipmentStatusEnum, EquipmentTypeEnum } from '@prisma/client'

import { prisma } from '@/lib/prisma'

function emptyCatalogPayload() {
  return {
    brands: [],
    categories: [],
    subcategories: [],
    subsubcategories: [],
    equipment: [],
  }
}

function mapCategoryNode(node: {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  parentId: string | null
  level: number
  children: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    icon: string | null
    parentId: string | null
    level: number
    children?: Array<{ id: string; name: string; slug: string }>
  }>
}) {
  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    description: node.description,
    icon: node.icon,
    parentId: node.parentId,
    level: node.level,
    subCategories: node.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      parentId: child.parentId,
      level: child.level,
      subCategories: (child.children || []).map((leaf) => ({
        id: leaf.id,
        name: leaf.name,
        slug: leaf.slug,
      })),
    })),
  }
}

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search')?.trim() || ''
    const brandId = req.nextUrl.searchParams.get('brandId') || undefined
    const brand = req.nextUrl.searchParams.get('brand')?.trim() || undefined
    const categoryId = req.nextUrl.searchParams.get('categoryId') || undefined
    const category = req.nextUrl.searchParams.get('category')?.trim() || undefined
    const subCategoryId = req.nextUrl.searchParams.get('subCategoryId') || undefined
    const subSubCategoryId = req.nextUrl.searchParams.get('subSubCategoryId') || undefined
    const status = req.nextUrl.searchParams.get('status') || undefined
    const equipmentType = req.nextUrl.searchParams.get('equipmentType') || undefined
    const effectiveCategoryId = subSubCategoryId || subCategoryId || categoryId

    const [brands, categories, subcategories, subsubcategories, equipment] = await Promise.all([
      prisma.equipmentBrand.findMany({ orderBy: { name: 'asc' } }),
      prisma.equipmentCategory.findMany({
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
      }),
      prisma.equipmentCategory.findMany({
        where: { parent: { is: { parentId: null } } },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
        },
      }),
      prisma.equipmentCategory.findMany({
        where: { parent: { is: { parentId: { not: null } } } },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
        },
      }),
      prisma.equipment.findMany({
        where: {
          ...(brandId ? { brandId } : {}),
          ...(!brandId && brand ? { brand: { name: { equals: brand, mode: 'insensitive' } } } : {}),
          ...(effectiveCategoryId ? { categoryId: effectiveCategoryId } : {}),
          ...(!effectiveCategoryId && category
            ? { category: { name: { equals: category, mode: 'insensitive' } } }
            : {}),
          ...(status ? { status: status as EquipmentStatusEnum } : {}),
          ...(equipmentType ? { equipmentType: equipmentType as EquipmentTypeEnum } : {}),
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
          images: true,
          specs: {
            orderBy: { specKey: 'asc' },
          },
        },
      }),
    ])

    return NextResponse.json({
      brands,
      categories: categories.map(mapCategoryNode),
      subcategories: subcategories.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        categoryId: item.parentId,
      })),
      subsubcategories: subsubcategories.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        subCategoryId: item.parentId,
      })),
      equipment: equipment.map((item) => ({
        id: item.id,
        name: item.name,
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
        brand: { id: item.brand.id, name: item.brand.name },
        category: { id: item.category.id, name: item.category.name },
      })),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      {
        ...emptyCatalogPayload(),
        error: 'Erreur serveur',
      },
      { status: 500 }
    )
  }
}
