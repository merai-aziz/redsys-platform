import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search')?.trim() || ''
    const domainId = req.nextUrl.searchParams.get('domainId')
    const brandId = req.nextUrl.searchParams.get('brandId')
    const seriesId = req.nextUrl.searchParams.get('seriesId')
    const modelId = req.nextUrl.searchParams.get('modelId')

    // Fetch all catalog data in parallel
    const [domains, brands, series, models, skus] = await Promise.all([
      prisma.equipmentDomain.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.equipmentBrand.findMany({
        where: {
          ...(brandId ? { id: brandId } : {}),
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.equipmentSeries.findMany({
        where: {
          ...(brandId ? { brandId } : {}),
          ...(seriesId ? { id: seriesId } : {}),
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.equipmentModel.findMany({
        where: {
          isConfigurable: true,
          filterGroups: { some: {} },
          ...(modelId ? { id: modelId } : {}),
          ...(seriesId ? { seriesId } : {}),
          ...(brandId ? { brandId } : {}),
          ...(domainId ? { domainId } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { shortDescription: { contains: search, mode: 'insensitive' } },
                  { longDescription: { contains: search, mode: 'insensitive' } },
                  { reference: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { name: 'asc' },
        include: {
          images: {
            where: { skuId: null },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
          products: {
            where: { isActive: true },
            include: {
              attributes: {
                include: {
                  filter: {
                    select: {
                      id: true,
                      fieldKey: true,
                      label: true,
                      unit: true,
                      fieldType: true,
                    },
                  },
                },
              },
            },
          },
          skus: {
            orderBy: { createdAt: 'asc' },
          },
        },
        take: 100,
      }),
      prisma.equipmentSku.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ])

    return NextResponse.json({
      domains: domains.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.label,
        icon: d.icon,
        displayOrder: d.sortOrder,
      })),
      brands: brands
        .filter((b) => models.some((m) => m.brandId === b.id))
        .map((b) => ({
        id: b.id,
        name: b.name,
        logo: b.logo,
        domainId: b.domainId,
        sortOrder: b.sortOrder,
      })),
      series: series
        .filter((s) => models.some((m) => m.seriesId === s.id))
        .map((s) => ({
        id: s.id,
        name: s.name,
        image: null,
        description: s.description,
        brandId: s.brandId,
        domainId: s.domainId,
        sortOrder: s.sortOrder,
      })),
      models: models.map((m) => {
        const attributesByKey = new Map<string, {
          code: string
          label: string
          value: string
          unit: string | null
          isFilterable: boolean
          isFacetable: boolean
          dataType: string
        }>()

        for (const product of m.products) {
          for (const attribute of product.attributes) {
            if (!attribute.value) continue
            const key = `${attribute.filter.fieldKey}:${attribute.value}`
            if (attributesByKey.has(key)) continue

            attributesByKey.set(key, {
              code: attribute.filter.fieldKey,
              label: attribute.filter.label,
              value: attribute.value,
              unit: attribute.filter.unit,
              isFilterable: true,
              isFacetable: true,
              dataType: attribute.filter.fieldType,
            })
          }
        }

        const activeStock = m.products.reduce((sum, product) => sum + Math.max(product.stock, 0), 0)
        const minActivePrice = m.products.reduce<number | null>((minPrice, product) => {
          const nextPrice = Number(product.price)
          if (Number.isNaN(nextPrice)) return minPrice
          if (minPrice === null) return nextPrice
          return Math.min(minPrice, nextPrice)
        }, null)

        return {
          id: m.id,
          name: m.name,
          reference: m.reference,
          shortDescription: m.shortDescription,
          longDescription: m.longDescription,
          basePrice: minActivePrice ?? Number(m.basePrice ?? 0),
          image: m.images[0]?.url ?? null,
          stockQty: Math.max(activeStock, m.skus.reduce((sum, sku) => sum + (sku.stockQty ?? 0), 0), m.stockQty ?? 0),
          status: m.status,
          condition: m.condition,
          seriesId: m.seriesId,
          brandId: m.brandId,
          domainId: m.domainId,
          attributes: Array.from(attributesByKey.values()),
        }
      }),
      skus: skus.map((s) => ({
        id: s.id,
        sku: s.reference,
        modelId: s.modelId,
        price: Number(s.price ?? 0),
        stock: s.stockQty,
        condition: s.condition ?? '',
      })),
    })
  } catch (error) {
    console.error('Error fetching catalog:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
