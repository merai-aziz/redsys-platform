import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string; optionId: string }>
}

export async function PUT(request: Request, context: Params) {
  await requireAdmin(request)

  const { id, optionId } = await context.params
  const productId = Number(id)
  const parsedOptionId = Number(optionId)

  if (!Number.isInteger(productId) || !Number.isInteger(parsedOptionId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const body = (await request.json()) as {
    name?: string
    allow_none?: boolean
    use_groups?: boolean
    values?: Array<{
      id?: number
      group_name?: string | null
      standard_product_id?: number | string
    }>
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  }

  const allowNone = Boolean(body.allow_none ?? false)
  const useGroups = Boolean(body.use_groups ?? false)

  const rawValues = Array.isArray(body.values) ? body.values : []

  // Même logique de validation que le POST
  const validValues = rawValues
    .filter((item) => Number.isInteger(Number(item.standard_product_id)) && Number(item.standard_product_id) > 0)
    .map((item) => ({
      group_name: useGroups ? (item.group_name?.trim() ?? null) : null,
      standard_product_id: Number(item.standard_product_id),
    }))
    .filter((item) => !useGroups || (item.group_name !== null && item.group_name !== ''))

  if (validValues.length === 0) {
    return NextResponse.json(
      {
        error: useGroups
          ? 'Au moins une valeur avec group_name et standard_product_id est requise'
          : 'Au moins un produit standard est requis',
      },
      { status: 400 },
    )
  }

  const current = await prisma.configurationOption.findFirst({
    where: { id: parsedOptionId, product_id: productId },
    select: { id: true },
  })

  if (!current) {
    return NextResponse.json({ error: 'Option introuvable' }, { status: 404 })
  }

  const standardProductIds = [...new Set(validValues.map((v) => v.standard_product_id))]
  const standardProducts = await prisma.product.findMany({
    where: {
      id: { in: standardProductIds },
      type: 'STANDARD',
    },
    select: { id: true, base_price: true, stock_qty: true },
  })

  const priceMap = new Map(standardProducts.map((p) => [p.id, p.base_price]))
  const stockMap = new Map(standardProducts.map((p) => [p.id, p.stock_qty]))

  const missingIds = standardProductIds.filter((pid) => !priceMap.has(pid))
  if (missingIds.length > 0) {
    return NextResponse.json(
      { error: `Produits standards introuvables ou non STANDARD : ${missingIds.join(', ')}` },
      { status: 400 },
    )
  }

  const option = await prisma.$transaction(async (tx) => {
    // Mettre à jour le nom + les deux nouveaux flags
    await tx.configurationOption.update({
      where: { id: parsedOptionId },
      data: {
        name,
        allow_none: allowNone,
        use_groups: useGroups,
      },
    })

    // Recréer toutes les valeurs (approche delete + createMany)
    await tx.configurationValue.deleteMany({
      where: { configuration_option_id: parsedOptionId },
    })

    await tx.configurationValue.createMany({
      data: validValues.map((item) => ({
        group_name: item.group_name,
        standard_product_id: item.standard_product_id,
        price: priceMap.get(item.standard_product_id)!,
        quantity: Math.max(1, stockMap.get(item.standard_product_id) ?? 1),
        configuration_option_id: parsedOptionId,
      })),
    })

    return tx.configurationOption.findUnique({
      where: { id: parsedOptionId },
      include: {
        values: {
          include: {
            standard_product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                stock_qty: true,
                in_stock: true,
                brand: { select: { id: true, name: true } },
                family: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })
  })

  return NextResponse.json({
    option: option
      ? {
          id: option.id,
          name: option.name,
          allow_none: option.allow_none,
          use_groups: option.use_groups,
          values: option.values.map((v) => ({
            id: v.id,
            group_name: v.group_name,
            price: Number(v.price),
            quantity: v.quantity,
            standard_product: {
              id: v.standard_product.id,
              name: v.standard_product.name,
              base_price: Number(v.standard_product.base_price),
              stock_qty: v.standard_product.stock_qty,
              in_stock: v.standard_product.in_stock,
              brand: v.standard_product.brand,
              family: v.standard_product.family,
            },
          })),
        }
      : null,
  })
}

export async function DELETE(request: Request, context: Params) {
  await requireAdmin(request)

  const { id, optionId } = await context.params
  const productId = Number(id)
  const parsedOptionId = Number(optionId)

  if (!Number.isInteger(productId) || !Number.isInteger(parsedOptionId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const current = await prisma.configurationOption.findFirst({
    where: { id: parsedOptionId, product_id: productId },
    select: { id: true },
  })

  if (!current) {
    return NextResponse.json({ error: 'Option introuvable' }, { status: 404 })
  }

  await prisma.configurationOption.delete({
    where: { id: parsedOptionId },
  })

  return NextResponse.json({ success: true })
}