import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  await requireAdmin(request)

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { families: true, products: true },
      },
    },
  })

  return NextResponse.json({ categories })
}

export async function POST(request: Request) {
  await requireAdmin(request)

  const body = (await request.json()) as { name?: string }
  const name = body.name?.trim()

  if (!name) {
    return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  }

  const category = await prisma.category.create({
    data: { name },
  })

  return NextResponse.json({ category }, { status: 201 })
}
