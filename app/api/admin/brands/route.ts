import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  await requireAdmin(request)

  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { products: true },
      },
    },
  })

  return NextResponse.json({ brands })
}

export async function POST(request: Request) {
  await requireAdmin(request)

  const body = (await request.json()) as { name?: string }
  const name = body.name?.trim()

  if (!name) {
    return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  }

  const brand = await prisma.brand.create({
    data: { name },
  })

  return NextResponse.json({ brand }, { status: 201 })
}
