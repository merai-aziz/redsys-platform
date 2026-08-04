import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseDateRange(req: NextRequest) {
  const url = new URL(req.url)
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')

  const now = new Date()
  const to = toParam ? new Date(toParam) : now
  // Défaut : 12 derniers mois glissants
  const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth() - 11, 1)

  // Sécurité : bornes cohérentes
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    const fallbackFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    return { from: fallbackFrom, to: now }
  }

  return { from, to }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (user.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    const { from, to } = parseDateRange(req)
    const now = new Date()

    // ─────────────────────────────────────────────────────────────
    // 1. KPIs sur la période sélectionnée
    // ─────────────────────────────────────────────────────────────
    const [revenueAgg, ordersCount, newCustomersCount, openTicketsCount] = await Promise.all([
      prisma.order.aggregate({
        where: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.ticket.count({
        where: { status: { in: ['OPEN', 'ACCEPTED', 'IN_PROGRESS'] } },
      }),
    ])

    const revenueInPeriod = Number(revenueAgg._sum.total ?? 0)
    const avgOrderValue = ordersCount > 0 ? revenueInPeriod / ordersCount : 0

    // ─────────────────────────────────────────────────────────────
    // 2. Temps moyen de résolution des tickets (résolus/fermés dans la période)
    // ─────────────────────────────────────────────────────────────
    const resolvedTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['RESOLVED', 'CLOSED'] },
        updatedAt: { gte: from, lte: to },
      },
      select: { createdAt: true, updatedAt: true },
    })

    const avgResolutionHours =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()), 0) /
          resolvedTickets.length /
          (1000 * 60 * 60)
        : null

    // ─────────────────────────────────────────────────────────────
    // 3. Chiffre d'affaires + panier moyen par mois (sur la période)
    // ─────────────────────────────────────────────────────────────
    const salesByMonthRaw = await prisma.$queryRaw<Array<{ month: Date; revenue: string; orders_count: bigint }>>`
      SELECT date_trunc('month', "createdAt") as month,
             COALESCE(SUM("total"), 0) as revenue,
             COUNT(*) as orders_count
      FROM orders
      WHERE status != 'CANCELLED'
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY month
      ORDER BY month ASC
    `

    const salesByMonth = salesByMonthRaw.map((row) => {
      const revenue = Number(row.revenue)
      const orders = Number(row.orders_count)
      return {
        month: monthKey(new Date(row.month)),
        revenue,
        orders,
        avgOrderValue: orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0,
      }
    })

    // ─────────────────────────────────────────────────────────────
    // 4. Produits les plus vendus (sur la période)
    // ─────────────────────────────────────────────────────────────
    const topProductsAgg = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        order: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 10,
    })

    const topProductIds = topProductsAgg.map((p) => p.productId).filter((id): id is number => id != null)
    const topProductsInfo = topProductIds.length
      ? await prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true, type: true },
        })
      : []
    const productInfoMap = new Map(topProductsInfo.map((p) => [p.id, p]))

    const topProducts = topProductsAgg.map((p) => ({
      productId: p.productId,
      name: productInfoMap.get(p.productId!)?.name ?? `Produit #${p.productId}`,
      type: productInfoMap.get(p.productId!)?.type ?? 'STANDARD',
      quantitySold: p._sum.quantity ?? 0,
      revenue: Number(p._sum.lineTotal ?? 0),
    }))

    // ─────────────────────────────────────────────────────────────
    // 5. Configurations/options les plus choisies (sur la période)
    // ─────────────────────────────────────────────────────────────
    const topConfigsAgg = await prisma.orderItemOption.groupBy({
      by: ['configurationValueId'],
      where: {
        orderItem: { order: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })

    const configValueIds = topConfigsAgg.map((c) => c.configurationValueId)
    const configValuesInfo = configValueIds.length
      ? await prisma.configurationValue.findMany({
          where: { id: { in: configValueIds } },
          select: {
            id: true,
            price: true,
            configuration_option: { select: { name: true } },
            standard_product: { select: { name: true } },
          },
        })
      : []
    const configValueInfoMap = new Map(configValuesInfo.map((c) => [c.id, c]))

    const topConfigurations = topConfigsAgg.map((c) => {
      const info = configValueInfoMap.get(c.configurationValueId)
      return {
        configurationValueId: c.configurationValueId,
        optionName: info?.configuration_option.name ?? 'Option',
        valueName: info?.standard_product.name ?? `#${c.configurationValueId}`,
        quantitySold: c._sum.quantity ?? 0,
        revenue: Number(info?.price ?? 0) * (c._sum.quantity ?? 0),
      }
    })

    // ─────────────────────────────────────────────────────────────
    // 6. Vue stock (non filtrée par période — état actuel)
    // ─────────────────────────────────────────────────────────────
    const lowStockProducts = await prisma.product.findMany({
      orderBy: { stock_qty: 'asc' },
      take: 10,
      select: { id: true, name: true, stock_qty: true, type: true },
    })

    const stockAggregate = await prisma.product.aggregate({
      _sum: { stock_qty: true },
      _count: { id: true },
    })

    const stockOverview = {
      totalUnitsInStock: stockAggregate._sum.stock_qty ?? 0,
      totalProducts: stockAggregate._count.id,
      lowestStock: lowStockProducts.map((p) => ({
        productId: p.id,
        name: p.name,
        stockQty: p.stock_qty,
        type: p.type,
      })),
    }

    // ─────────────────────────────────────────────────────────────
    // 7. Clients les plus fidèles (sur la période)
    // ─────────────────────────────────────────────────────────────
    const topCustomersAgg = await prisma.order.groupBy({
      by: ['userId'],
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: from, lte: to } },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    })

    const customerIds = topCustomersAgg.map((c) => c.userId)
    const customersInfo = customerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, firstName: true, lastName: true, email: true, companyName: true },
        })
      : []
    const customerInfoMap = new Map(customersInfo.map((u) => [u.id, u]))

    const topCustomers = topCustomersAgg.map((c) => {
      const info = customerInfoMap.get(c.userId)
      return {
        userId: c.userId,
        name: info ? `${info.firstName} ${info.lastName}` : 'Client inconnu',
        companyName: info?.companyName ?? null,
        email: info?.email ?? '',
        totalSpent: Number(c._sum.total ?? 0),
        ordersCount: c._count.id,
      }
    })

    // ─────────────────────────────────────────────────────────────
    // 8. Répartition des utilisateurs
    // ─────────────────────────────────────────────────────────────
    const [byRole, byActiveStatus] = await Promise.all([
      prisma.user.groupBy({ by: ['userRole'], _count: { id: true } }),
      prisma.user.groupBy({ by: ['isActive'], _count: { id: true } }),
    ])

    const signupsByMonthRaw = await prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
      SELECT date_trunc('month', "createdAt") as month, COUNT(*) as count
      FROM users
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY month
      ORDER BY month ASC
    `

    const usersBreakdown = {
      byRole: byRole.map((r) => ({ role: r.userRole, count: r._count.id })),
      activeVsInactive: byActiveStatus.map((s) => ({
        status: s.isActive ? 'Actif' : 'Inactif',
        count: s._count.id,
      })),
      signupsByMonth: signupsByMonthRaw.map((row) => ({
        month: monthKey(new Date(row.month)),
        count: Number(row.count),
      })),
    }

    // ─────────────────────────────────────────────────────────────
    // 9. Contrats — délais restants (toujours "à partir de maintenant", non filtré par période)
    // ─────────────────────────────────────────────────────────────
    const activeContracts = await prisma.contract.findMany({
      where: { warrantyEnd: { gte: now } },
      orderBy: { warrantyEnd: 'asc' },
      take: 15,
      select: {
        id: true,
        companyName: true,
        clientFirstName: true,
        clientLastName: true,
        warrantyStart: true,
        warrantyEnd: true,
      },
    })

    const contractsExpiring = activeContracts.map((c) => {
      const daysRemaining = Math.ceil((c.warrantyEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      let urgency: 'critical' | 'warning' | 'ok' = 'ok'
      if (daysRemaining <= 30) urgency = 'critical'
      else if (daysRemaining <= 90) urgency = 'warning'

      return {
        id: c.id,
        companyName: c.companyName,
        clientName: `${c.clientFirstName} ${c.clientLastName}`,
        warrantyEnd: c.warrantyEnd,
        daysRemaining,
        urgency,
      }
    })

    // ─────────────────────────────────────────────────────────────
    // 10. Tickets — par statut / priorité (créés dans la période)
    // ─────────────────────────────────────────────────────────────
    const [ticketsByStatusAgg, ticketsByPriorityAgg] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['status'],
        where: { createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
      prisma.ticket.groupBy({
        by: ['priority'],
        where: { createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
    ])

    const ticketsByStatus = ticketsByStatusAgg.map((t) => ({ status: t.status, count: t._count.id }))
    const ticketsByPriority = ticketsByPriorityAgg.map((t) => ({ priority: t.priority, count: t._count.id }))

    // ─────────────────────────────────────────────────────────────
    // 11. Produits générant le plus de tickets (proxy "pannes récurrentes")
    // ─────────────────────────────────────────────────────────────
    const ticketsWithContractProducts = await prisma.ticket.findMany({
      where: { contractId: { not: null }, createdAt: { gte: from, lte: to } },
      select: {
        contract: {
          select: {
            contractItems: { select: { productId: true, name: true } },
          },
        },
      },
    })

    const failureCountByProduct = new Map<string, { name: string; count: number }>()
    for (const ticket of ticketsWithContractProducts) {
      const items = ticket.contract?.contractItems ?? []
      for (const item of items) {
        const key = item.productId != null ? String(item.productId) : item.name
        const existing = failureCountByProduct.get(key)
        if (existing) existing.count += 1
        else failureCountByProduct.set(key, { name: item.name, count: 1 })
      }
    }

    const topFailingProducts = Array.from(failureCountByProduct.entries())
      .map(([key, value]) => ({ productKey: key, name: value.name, ticketsCount: value.count }))
      .sort((a, b) => b.ticketsCount - a.ticketsCount)
      .slice(0, 10)

    // ─────────────────────────────────────────────────────────────
    // 12. NOUVEAU : répartition des statuts de commande (sur la période)
    // ─────────────────────────────────────────────────────────────
    const orderStatusAgg = await prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: from, lte: to } },
      _count: { id: true },
    })
    const orderStatusBreakdown = orderStatusAgg.map((o) => ({ status: o.status, count: o._count.id }))

    // ─────────────────────────────────────────────────────────────
    // 13. NOUVEAU : répartition des moyens de paiement (sur la période)
    // ─────────────────────────────────────────────────────────────
    const paymentMethodAgg = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where: { createdAt: { gte: from, lte: to } },
      _count: { id: true },
    })
    const paymentMethodBreakdown = paymentMethodAgg.map((p) => ({
      method: p.paymentMethod,
      count: p._count.id,
    }))

    // ─────────────────────────────────────────────────────────────
    // 14. NOUVEAU : chiffre d'affaires par marque (top 8, sur la période)
    // ─────────────────────────────────────────────────────────────
    const revenueByBrandRaw = await prisma.$queryRaw<Array<{ brand: string; revenue: string }>>`
      SELECT b.name as brand, COALESCE(SUM(oi."lineTotal"), 0) as revenue
      FROM order_items oi
      JOIN catalog_products p ON oi."productId" = p.id
      JOIN catalog_brands b ON p.brand_id = b.id
      JOIN orders o ON oi."orderId" = o.id
      WHERE o.status != 'CANCELLED'
        AND o."createdAt" >= ${from}
        AND o."createdAt" <= ${to}
      GROUP BY b.name
      ORDER BY revenue DESC
      LIMIT 8
    `
    const revenueByBrand = revenueByBrandRaw.map((row) => ({
      brand: row.brand,
      revenue: Number(row.revenue),
    }))

    // ─────────────────────────────────────────────────────────────
    return NextResponse.json({
      period: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        revenueInPeriod,
        ordersInPeriod: ordersCount,
        newCustomersInPeriod: newCustomersCount,
        openTickets: openTicketsCount,
        avgOrderValue,
        avgResolutionHours,
      },
      salesByMonth,
      topProducts,
      topConfigurations,
      stockOverview,
      topCustomers,
      usersBreakdown,
      contractsExpiring,
      ticketsByStatus,
      ticketsByPriority,
      topFailingProducts,
      orderStatusBreakdown,
      paymentMethodBreakdown,
      revenueByBrand,
    })
  } catch (err) {
    console.error('❌ GET /api/admin/analytics error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}