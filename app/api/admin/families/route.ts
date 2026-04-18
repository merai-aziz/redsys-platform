import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  await requireAdmin(request)

  const families = await prisma.family.findMany({
    orderBy: [{ category_id: 'asc' }, { name: 'asc' }],
    include: {
      category: true,
      _count: { select: { products: true } },
    },
  })

  return NextResponse.json({ families })
}

export async function POST(request: Request) {
  await requireAdmin(request)

  const body = (await request.json()) as { name?: string; category_id?: number }
  const name = body.name?.trim()
  const categoryId = Number(body.category_id)

  if (!name || !Number.isInteger(categoryId)) {
    return NextResponse.json({ error: 'Nom et category_id requis' }, { status: 400 })
  }

  const family = await prisma.family.create({
    data: {
      name,
      category_id: categoryId,
    },
  })

  return NextResponse.json({ family }, { status: 201 })
}
