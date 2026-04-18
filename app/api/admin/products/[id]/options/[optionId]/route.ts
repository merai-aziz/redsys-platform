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
    values?: Array<{ id?: number; value?: string; price?: string | number; quantity?: number | string }>
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  }

  const values = Array.isArray(body.values) ? body.values : []

  const current = await prisma.configurationOption.findFirst({
    where: { id: parsedOptionId, product_id: productId },
    select: { id: true },
  })

  if (!current) {
    return NextResponse.json({ error: 'Option introuvable' }, { status: 404 })
  }

  const option = await prisma.$transaction(async (tx: any) => {
    await tx.configurationOption.update({
      where: { id: parsedOptionId },
      data: { name },
    })

    await tx.configurationValue.deleteMany({
      where: { configuration_option_id: parsedOptionId },
    })

    if (values.length > 0) {
      await tx.configurationValue.createMany({
        data: values
          .filter((item) => item.value?.trim())
          .map((item) => ({
            value: (item.value as string).trim(),
            price: Number(item.price ?? 0),
            quantity: Math.max(1, Math.trunc(Number(item.quantity ?? 1))),
            configuration_option_id: parsedOptionId,
          })),
      })
    }

    return tx.configurationOption.findUnique({
      where: { id: parsedOptionId },
      include: { values: true },
    })
  })

  return NextResponse.json({ option })
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
