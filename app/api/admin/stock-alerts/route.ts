import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  await requireAdmin(req)

  const url = new URL(req.url)
  const threshold = Number(url.searchParams.get('threshold') ?? '5')
  const safeThreshold = Number.isFinite(threshold) && threshold >= 0 ? threshold : 5

  // Récupérer tous les produits avec stock faible + leurs options pour les CONFIGURABLE
  const lowStockProducts = await prisma.product.findMany({
    where: {
      stock_qty: { lte: safeThreshold },
    },
    include: {
      brand: { select: { name: true } },
      family: { select: { name: true } },
      category: { select: { name: true } },
      // ✅ AJOUT : charger les options des CONFIGURABLE pour calculer leur stock réel
      configuration_options: {
        include: {
          values: {
            include: {
              standard_product: {
                select: { stock_qty: true },
              },
            },
          },
        },
      },
    },
    orderBy: { stock_qty: 'asc' },
  })

  // ✅ AJOUT : pour les CONFIGURABLE, recalculer le stock effectif (somme des options)
  // Un CONFIGURABLE avec stock_qty=0 peut avoir du stock dans ses options
  const enrichedProducts = lowStockProducts.map((p) => {
    if (p.type === 'CONFIGURABLE') {
      const optionsStock = p.configuration_options
        .flatMap((opt) => opt.values)
        .reduce((sum, v) => sum + (v.standard_product?.stock_qty ?? 0), 0)
      return { ...p, effectiveStock: optionsStock }
    }
    return { ...p, effectiveStock: p.stock_qty }
  })

  // ✅ AJOUT : re-filtrer pour exclure les CONFIGURABLE dont le stock réel dépasse le seuil
  // (faux positifs : stock_qty=0 sur le parent mais options en stock)
  const filtered = enrichedProducts.filter((p) => p.effectiveStock <= safeThreshold)

  const outOfStock = filtered.filter((p) => p.effectiveStock === 0)
  const lowStock = filtered.filter((p) => p.effectiveStock > 0)

  return NextResponse.json({
    threshold: safeThreshold,
    summary: {
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
      total: filtered.length,
    },
    products: filtered.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      stockQty: p.effectiveStock,       // ✅ stock réel affiché (pas stock_qty brut)
      inStock: p.effectiveStock > 0,
      basePrice: Number(p.base_price),
      imageUrl: p.image_url,
      brand: p.brand.name,
      family: p.family.name,
      category: p.category.name,
    })),
  })
}