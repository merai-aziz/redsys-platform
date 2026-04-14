import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'

const querySchema = z.object({
  q: z.string().min(2, 'Le parametre q doit contenir au moins 2 caracteres'),
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

type FinderResult = {
  type: 'model' | 'sku'
  id: string
  reference: string
  name: string
  price: number | null
  condition: string | null
  stock: number
  image: string | null
  domain: { label: string; slug: string }
  brand: { name: string; slug: string }
  modelSlug?: string
}

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? '',
      domain: request.nextUrl.searchParams.get('domain') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? 10,
    })

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Parametres invalides',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const { q, domain, limit } = parsed.data

    const [models, skus] = await Promise.all([
      prisma.equipmentModel.findMany({
        where: {
          ...(domain ? { domain: { slug: domain } } : {}),
          OR: [
            { reference: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          domain: { select: { label: true, slug: true } },
          brand: { select: { name: true, slug: true } },
          images: {
            where: { skuId: null },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      prisma.equipmentSku.findMany({
        where: {
          ...(domain ? { model: { domain: { slug: domain } } } : {}),
          OR: [
            { reference: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          model: {
            include: {
              domain: { select: { label: true, slug: true } },
              brand: { select: { name: true, slug: true } },
            },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
    ])

    const modelResults: FinderResult[] = models.map((model) => ({
      type: 'model',
      id: model.id,
      reference: model.reference,
      name: model.name,
      price: model.basePrice === null ? null : Number(model.basePrice),
      condition: model.condition,
      stock: model.stockQty,
      image: model.images[0]?.url ?? null,
      domain: {
        label: model.domain.label,
        slug: model.domain.slug,
      },
      brand: {
        name: model.brand.name,
        slug: model.brand.slug,
      },
    }))

    const skuResults: FinderResult[] = skus.map((sku) => ({
      type: 'sku',
      id: sku.id,
      reference: sku.reference,
      name: sku.name,
      price: sku.price === null ? null : Number(sku.price),
      condition: sku.condition,
      stock: sku.stockQty,
      image: sku.images[0]?.url ?? null,
      domain: {
        label: sku.model.domain.label,
        slug: sku.model.domain.slug,
      },
      brand: {
        name: sku.model.brand.name,
        slug: sku.model.brand.slug,
      },
      modelSlug: sku.model.slug,
    }))

    const merged = [...modelResults, ...skuResults].slice(0, limit)

    return NextResponse.json({
      results: merged,
      total: merged.length,
    })
  } catch (error) {
    console.error('GET /api/parts-finder error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
