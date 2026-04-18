import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: Params) {
  await requireAdmin(request)
  const { id } = await context.params
  const filterId = Number(id)

  if (!Number.isInteger(filterId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const values = await prisma.filterValue.findMany({
    where: { filter_id: filterId },
    orderBy: { value: 'asc' },
  })

  return NextResponse.json({ values })
}

export async function POST(request: Request, context: Params) {
  await requireAdmin(request)
  const { id } = await context.params
  const filterId = Number(id)

  if (!Number.isInteger(filterId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const body = (await request.json()) as { value?: string }
  const value = body.value?.trim()

  if (!value) {
    return NextResponse.json({ error: 'Valeur requise' }, { status: 400 })
  }

  const filterValue = await prisma.filterValue.create({
    data: {
      value,
      filter_id: filterId,
    },
  })

  return NextResponse.json({ filterValue }, { status: 201 })
}
