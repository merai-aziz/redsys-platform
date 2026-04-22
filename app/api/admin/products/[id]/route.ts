import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, context: Params) {
  await requireAdmin(request)

  const { id } = await context.params
  const productId = Number(id)
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

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
    ? body.filter_value_ids.filter((value): value is number => Number.isInteger(value))
    : []
  const compatibleProductIds = Array.isArray(body.compatible_product_ids)
    ? body.compatible_product_ids.filter((value): value is number => Number.isInteger(value))
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
    await tx.product.update({
      where: { id: productId },
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
      },
    })

    await tx.productFilterValue.deleteMany({ where: { product_id: productId } })
    await tx.productSpec.deleteMany({ where: { product_id: productId } })

    if (type === 'CONFIGURABLE' && filterValueIds.length > 0) {
      await tx.productFilterValue.createMany({
        data: filterValueIds.map((filterValueId) => ({
          product_id: productId,
          filter_value_id: filterValueId,
        })),
      })
    }

    if (type === 'STANDARD' && specs.length > 0) {
      await tx.productSpec.createMany({
        data: specs.map((entry) => ({
          product_id: productId,
          spec_key: entry.key,
          spec_value: entry.value,
        })),
      })
    }

    return tx.product.findUnique({
      where: { id: productId },
    })
  })

  try {
    await prisma.productCompatibility.deleteMany({ where: { part_product_id: productId } })

    if (type === 'STANDARD' && compatibleProductIds.length > 0) {
      await prisma.productCompatibility.createMany({
        data: compatibleProductIds
          .filter((targetProductId) => targetProductId !== productId)
          .map((targetProductId) => ({
            part_product_id: productId,
            target_product_id: targetProductId,
          })),
        skipDuplicates: true,
      })
    }
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021')) {
      throw error
    }
  }

  return NextResponse.json({ product })
}

export async function DELETE(request: Request, context: Params) {
  await requireAdmin(request)

  const { id } = await context.params
  const productId = Number(id)
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  await prisma.product.delete({ where: { id: productId } })
  return NextResponse.json({ success: true })
}
