import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  await requireAdmin(request)

  let products
  try {
    products = await prisma.product.findMany({
      orderBy: [{ category_id: 'asc' }, { family_id: 'asc' }, { name: 'asc' }],
      include: {
        brand: true,
        family: true,
        category: true,
        configuration_options: {
          include: { values: true },
        },
        specs: {
          orderBy: [{ spec_key: 'asc' }, { spec_value: 'asc' }],
        },
        product_filter_values: {
          include: {
            filter_value: {
              include: { filter: true },
            },
          },
        },
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      products = await prisma.product.findMany({
        orderBy: [{ category_id: 'asc' }, { family_id: 'asc' }, { name: 'asc' }],
        include: {
          brand: true,
          family: true,
          category: true,
          configuration_options: {
            include: { values: true },
          },
          specs: {
            orderBy: [{ spec_key: 'asc' }, { spec_value: 'asc' }],
          },
          product_filter_values: {
            include: {
              filter_value: {
                include: { filter: true },
              },
            },
          },
        },
      })
    } else {
      throw error
    }
  }

  return NextResponse.json({ products })
}

export async function POST(request: Request) {
  await requireAdmin(request)

  const body = (await request.json()) as {
    name?: string
    base_price?: number | string
    type?: 'STANDARD' | 'CONFIGURABLE'
    brand_id?: number
    family_id?: number
    category_id?: number
    image_url?: string | null
    description?: string | null
    stock_qty?: number
    in_stock?: boolean
    poe?: boolean
    filter_value_ids?: number[]
    compatible_product_ids?: number[]
    specs?: Array<{ key?: string; value?: string }>
  }

  const name = body.name?.trim()
  const basePrice = Number(body.base_price)
  const brandId = Number(body.brand_id)
  const familyId = Number(body.family_id)
  const categoryId = Number(body.category_id)
  const type = body.type
  const imageUrl = body.image_url?.trim() || null
  const description = body.description?.trim() || null
  const stockQty = Number(body.stock_qty ?? 0)
  const inStock = Boolean(body.in_stock)
  const poe = Boolean(body.poe)

  if (
    !name
    || !Number.isFinite(basePrice)
    || !Number.isInteger(brandId)
    || !Number.isInteger(familyId)
    || !Number.isInteger(categoryId)
    || !Number.isFinite(stockQty)
    || stockQty < 0
    || (type !== 'STANDARD' && type !== 'CONFIGURABLE')
  ) {
    return NextResponse.json({ error: 'Champs invalides' }, { status: 400 })
  }

  const filterValueIds = Array.isArray(body.filter_value_ids)
    ? body.filter_value_ids.filter((id): id is number => Number.isInteger(id))
    : []
  const compatibleProductIds = Array.isArray(body.compatible_product_ids)
    ? body.compatible_product_ids.filter((id): id is number => Number.isInteger(id))
    : []

  const specs = Array.isArray(body.specs)
    ? body.specs
      .map((entry) => ({
        key: entry.key?.trim() ?? '',
        value: entry.value?.trim() ?? '',
      }))
      .filter((entry) => entry.key && entry.value)
    : []

  const normalizedStock = inStock ? Math.max(1, Math.trunc(stockQty)) : 0

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name,
        base_price: basePrice,
        type,
        image_url: imageUrl,
        description,
        stock_qty: normalizedStock,
        in_stock: normalizedStock > 0,
        poe,
        brand_id: brandId,
        family_id: familyId,
        category_id: categoryId,
        product_filter_values: type === 'CONFIGURABLE' ? {
          create: filterValueIds.map((filterValueId) => ({
            filter_value_id: filterValueId,
          })),
        } : undefined,
        specs: type === 'STANDARD' ? {
          create: specs.map((entry) => ({
            spec_key: entry.key,
            spec_value: entry.value,
          })),
        } : undefined,
      },
    })

    return tx.product.findUnique({
      where: { id: created.id },
      include: {
        brand: true,
        family: true,
        category: true,
        specs: true,
        configuration_options: {
          include: { values: true },
        },
        product_filter_values: {
          include: {
            filter_value: {
              include: { filter: true },
            },
          },
        },
      },
    })
  })

  if (product && type === 'STANDARD' && compatibleProductIds.length > 0) {
    try {
      await prisma.productCompatibility.createMany({
        data: compatibleProductIds
          .filter((targetProductId) => targetProductId !== product.id)
          .map((targetProductId) => ({
            part_product_id: product.id,
            target_product_id: targetProductId,
          })),
        skipDuplicates: true,
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021')) {
        throw error
      }
    }
  }

  return NextResponse.json({ product }, { status: 201 })
}
