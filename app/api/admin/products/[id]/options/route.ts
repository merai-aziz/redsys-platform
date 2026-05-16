import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params
  const productId = Number(id)

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const options = await prisma.configurationOption.findMany({
    where: { product_id: productId },
    orderBy: { name: 'asc' },
    include: {
      values: {
        orderBy: { group_name: 'asc' },
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

  return NextResponse.json({
    options: options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      allow_none: opt.allow_none,
      use_groups: opt.use_groups,
      values: opt.values.map((v) => ({
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
    })),
  })
}

export async function POST(request: Request, context: Params) {
  await requireAdmin(request)

  const { id } = await context.params
  const productId = Number(id)

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  // Vérifier que le produit existe et est bien de type CONFIGURABLE
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, type: true },
  })

  if (!product) {
    return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  }

  if (product.type !== 'CONFIGURABLE') {
    return NextResponse.json({ error: 'Ce produit n est pas de type CONFIGURABLE' }, { status: 400 })
  }

  const body = (await request.json()) as {
    name?: string
    allow_none?: boolean
    use_groups?: boolean
    values?: Array<{
      group_name?: string | null
      standard_product_id?: number | string
    }>
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Nom de l option requis' }, { status: 400 })
  }

  const allowNone = Boolean(body.allow_none ?? false)
  const useGroups = Boolean(body.use_groups ?? false)

  const rawValues = Array.isArray(body.values) ? body.values : []

  // Validation adaptée selon le mode :
  // - use_groups = true  → group_name requis (non null, non vide)
  // - use_groups = false → group_name peut être null/absent
  const validValues = rawValues
    .filter((item) => Number.isInteger(Number(item.standard_product_id)) && Number(item.standard_product_id) > 0)
    .map((item) => ({
      // En mode avec groupes on garde le group_name saisi, sinon null
      group_name: useGroups ? (item.group_name?.trim() ?? null) : null,
      standard_product_id: Number(item.standard_product_id),
    }))
    // En mode avec groupes, exclure les lignes sans group_name
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

  // Récupérer les prix des produits standards pour auto-remplir le price
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

  const option = await prisma.configurationOption.create({
    data: {
      name,
      product_id: productId,
      allow_none: allowNone,
      use_groups: useGroups,
      values: {
        create: validValues.map((item) => ({
          group_name: item.group_name,
          standard_product_id: item.standard_product_id,
          price: priceMap.get(item.standard_product_id)!,
          quantity: Math.max(1, stockMap.get(item.standard_product_id) ?? 1),
        })),
      },
    },
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

  return NextResponse.json({
    option: {
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
    },
  }, { status: 201 })
}