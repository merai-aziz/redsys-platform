import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  domain: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  condition: z.enum(['A', 'B', 'C']).optional(),
  modelId: z.string().trim().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().trim().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const parsed = querySchema.safeParse({
      page: request.nextUrl.searchParams.get('page') ?? '1',
      limit: request.nextUrl.searchParams.get('limit') ?? '20',
      domain: request.nextUrl.searchParams.get('domain') ?? undefined,
      brand: request.nextUrl.searchParams.get('brand') ?? undefined,
      condition: request.nextUrl.searchParams.get('condition') ?? undefined,
      modelId: request.nextUrl.searchParams.get('modelId') ?? undefined,
      isActive: request.nextUrl.searchParams.get('isActive') ?? undefined,
      search: request.nextUrl.searchParams.get('search') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametres invalides', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { page, limit, domain, brand, condition, modelId, isActive, search } = parsed.data

    const where: Prisma.ProductWhereInput = {
      ...(modelId ? { equipmentModelId: modelId } : {}),
      ...(condition ? { condition } : {}),
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { sku: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...((domain || brand)
        ? {
            equipmentModel: {
              ...(domain
                ? {
                    OR: [
                      { domainId: domain },
                      { domain: { slug: domain } },
                    ],
                  }
                : {}),
              ...(brand
                ? {
                    AND: [
                      {
                        OR: [
                          { brandId: brand },
                          { brand: { slug: brand } },
                        ],
                      },
                    ],
                  }
                : {}),
            },
          }
        : {}),
    }

    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          equipmentModel: {
            select: {
              id: true,
              name: true,
              domain: { select: { label: true } },
              brand: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('GET /api/admin/products error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
