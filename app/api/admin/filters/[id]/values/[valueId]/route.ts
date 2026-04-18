import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string; valueId: string }>
}

export async function PUT(request: Request, context: Params) {
  await requireAdmin(request)

  const { id, valueId } = await context.params
  const filterId = Number(id)
  const parsedValueId = Number(valueId)

  if (!Number.isInteger(filterId) || !Number.isInteger(parsedValueId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const body = (await request.json()) as { value?: string }
  const value = body.value?.trim()

  if (!value) {
    return NextResponse.json({ error: 'Valeur requise' }, { status: 400 })
  }

  const exists = await prisma.filterValue.findFirst({
    where: {
      id: parsedValueId,
      filter_id: filterId,
    },
    select: { id: true },
  })

  if (!exists) {
    return NextResponse.json({ error: 'Valeur introuvable' }, { status: 404 })
  }

  const filterValue = await prisma.filterValue.update({
    where: { id: parsedValueId },
    data: { value },
  })

  return NextResponse.json({ filterValue })
}

export async function DELETE(request: Request, context: Params) {
  await requireAdmin(request)

  const { id, valueId } = await context.params
  const filterId = Number(id)
  const parsedValueId = Number(valueId)

  if (!Number.isInteger(filterId) || !Number.isInteger(parsedValueId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const exists = await prisma.filterValue.findFirst({
    where: {
      id: parsedValueId,
      filter_id: filterId,
    },
    select: { id: true },
  })

  if (!exists) {
    return NextResponse.json({ error: 'Valeur introuvable' }, { status: 404 })
  }

  await prisma.filterValue.delete({ where: { id: parsedValueId } })
  return NextResponse.json({ success: true })
}
