import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: Params) {
  await requireAdmin(request)

  const { id } = await context.params
  const productId = Number(id)

  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  let rows: Array<{ target_product_id: number }> = []
  try {
    rows = await prisma.productCompatibility.findMany({
      where: { part_product_id: productId },
      orderBy: { target_product_id: 'asc' },
      select: { target_product_id: true },
    })
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021')) {
      throw error
    }
  }

  return NextResponse.json({ compatibleProductIds: rows.map((row) => row.target_product_id) })
}

export async function PUT(request: Request, context: Params) {
  await requireAdmin(request)

  const { id } = await context.params
  const productId = Number(id)

  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const body = (await request.json()) as { compatibleProductIds?: number[] }
  const compatibleProductIds = Array.isArray(body.compatibleProductIds)
    ? body.compatibleProductIds.filter((targetId): targetId is number => Number.isInteger(targetId) && targetId !== productId)
    : []
  const uniqueIds = Array.from(new Set(compatibleProductIds))

  try {
    await prisma.$transaction([
      prisma.productCompatibility.deleteMany({ where: { part_product_id: productId } }),
      ...uniqueIds.map((targetProductId) =>
        prisma.productCompatibility.create({
          data: {
            part_product_id: productId,
            target_product_id: targetProductId,
          },
        })),
    ])
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021')) {
      throw error
    }
  }

  return NextResponse.json({ success: true })
}
