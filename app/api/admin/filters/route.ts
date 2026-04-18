import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  await requireAdmin(request)

  const filters = await prisma.filter.findMany({
    orderBy: { name: 'asc' },
    include: {
      filter_values: {
        orderBy: { value: 'asc' },
      },
    },
  })

  return NextResponse.json({ filters })
}

export async function POST(request: Request) {
  await requireAdmin(request)

  const body = (await request.json()) as { name?: string }
  const name = body.name?.trim()

  if (!name) {
    return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  }

  const filter = await prisma.filter.create({
    data: { name },
  })

  return NextResponse.json({ filter }, { status: 201 })
}
