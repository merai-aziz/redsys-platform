import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  modelId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  status: z.enum(['AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const parsed = querySchema.safeParse({
      page: request.nextUrl.searchParams.get('page') ?? '1',
      limit: request.nextUrl.searchParams.get('limit') ?? '20',
      modelId: request.nextUrl.searchParams.get('modelId') ?? undefined,
      search: request.nextUrl.searchParams.get('search') ?? undefined,
      status: request.nextUrl.searchParams.get('status') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametres invalides', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { page, limit, modelId, search, status } = parsed.data

    const where: Prisma.EquipmentSkuWhereInput = {
      ...(modelId ? { modelId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const skip = (page - 1) * limit

    const [skus, total] = await Promise.all([
      prisma.equipmentSku.findMany({
        where,
        include: {
          model: {
            select: {
              id: true,
              name: true,
              domain: { select: { label: true } },
              brand: { select: { name: true } },
            },
          },
          images: {
            where: { skuId: { not: null } },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.equipmentSku.count({ where }),
    ])

    return NextResponse.json({
      skus,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('GET /api/admin/skus error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
