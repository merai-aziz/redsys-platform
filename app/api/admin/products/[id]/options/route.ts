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
        orderBy: { value: 'asc' },
        select: { id: true, value: true, price: true, quantity: true },
      },
    },
  })

  return NextResponse.json({
    options: options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      values: opt.values.map((v) => ({
        id: v.id,
        value: v.value,
        price: Number(v.price),
        quantity: v.quantity,
      })),
    })),
  })
}

export async function POST(request: Request, context: Params) {
  await requireAdmin(request)

  const { id } = await context.params
  const productId = Number(id)
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const body = (await request.json()) as {
    name?: string
    values?: Array<{ value?: string; price?: string | number; quantity?: number | string }>
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Nom de l option requis' }, { status: 400 })
  }

  const values = Array.isArray(body.values) ? body.values : []

  const option = await prisma.configurationOption.create({
    data: {
      name,
      product_id: productId,
      values: {
        create: values
          .filter((item) => item.value?.trim())
          .map((item) => ({
            value: (item.value as string).trim(),
            price: Number(item.price ?? 0),
            quantity: Math.max(1, Math.trunc(Number(item.quantity ?? 1))),
          })),
      },
    },
    include: { values: true },
  })

  return NextResponse.json({ option }, { status: 201 })
}