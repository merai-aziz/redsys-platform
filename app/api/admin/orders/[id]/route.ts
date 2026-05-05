import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
 
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'en attente',
  PROCESSING: 'en cours de traitement',
  COMPLETED: 'livrée',
  CANCELLED: 'annulée',
}
 
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
 
    const body = await req.json()
    const { status } = body
    
    // Attendre la résolution de params (Next.js 15+)
    const { id } = await params
 
    const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }
 
    const existing = await prisma.order.findUnique({
      where: { id: id },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    })
 
    if (!existing) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }
 
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: id },
        data: { status },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          shippingAddress: true,
          items: {
            include: { product: { select: { name: true, image_url: true } } },
          },
        },
      })
 
      // Notifier le client du changement de statut
      await tx.notification.create({
        data: {
          userId: existing.userId,
          title: 'Mise à jour de votre commande',
          message: `Votre commande #${id.slice(0, 8).toUpperCase()} est maintenant ${STATUS_LABELS[status] ?? status}.`,
          type: 'ORDER_STATUS_UPDATE',
          referenceType: 'ORDER',
          referenceId: id,
        },
      })
 
      return order
    })
 
    return NextResponse.json({ order: updated })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}