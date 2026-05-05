import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
 
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
 
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
 
    const unreadCount = notifications.filter((n) => !n.isRead).length
 
    return NextResponse.json({ notifications, unreadCount })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}