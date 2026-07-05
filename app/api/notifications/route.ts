import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '50')
    const since = url.searchParams.get('since')

    const where: Record<string, unknown> = { userId: user.id }

    // ✅ Valider la date avant de l'utiliser — une date invalide ne doit pas planter la route
    if (since) {
      const sinceDate = new Date(since)
      if (!Number.isNaN(sinceDate.getTime())) {
        where.createdAt = { gt: sinceDate }
      } else {
        console.warn('[NOTIFICATIONS] paramètre "since" invalide ignoré:', since)
      }
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    })

    // ✅ FIX : hasStockAlerts = uniquement les alertes stock NON LUES dans la fenêtre
    // (évite de rejouer le son pour des alertes déjà vues)
    const hasStockAlerts = notifications.some(
      (n) => n.type === 'STOCK_ALERT' && !n.isRead,
    )

    return NextResponse.json({
      notifications,
      unreadCount,
      hasStockAlerts,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { notificationId, markAll } = await req.json()

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return NextResponse.json({ success: true })
    }

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId, userId: user.id },
        data: { isRead: true, readAt: new Date() },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  } catch (error) {
    console.error('PUT /api/notifications error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}