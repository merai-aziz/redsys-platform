// /app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const order = await prisma.order.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        shippingAddress: true,
        items: {
          include: {
            product: { select: { name: true, image_url: true, base_price: true } },
          },
        },
        payments: true,
      },
    })

    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

    return NextResponse.json({ order })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Le client peut uniquement ANNULER sa commande (PENDING → CANCELLED)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { action } = body // action: 'cancel'

    if (action !== 'cancel') {
      return NextResponse.json({ error: 'Action non autorisée' }, { status: 400 })
    }

    // Vérifier que la commande appartient au client et est annulable
    const existing = await prisma.order.findFirst({
      where: { id: params.id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Seules les commandes en attente peuvent être annulées' },
        { status: 400 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: params.id },
        data: { status: 'CANCELLED' },
      })

      // Notifier les admins de l'annulation
      const admins = await tx.user.findMany({
        where: { userRole: 'ADMIN', isActive: true },
        select: { id: true },
      })

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: 'Commande annulée',
            message: `Le client ${user.firstName} ${user.lastName} a annulé sa commande #${params.id.slice(0, 8).toUpperCase()}`,
            type: 'ORDER_STATUS_UPDATE' as const,
            referenceType: 'ORDER',
            referenceId: params.id,
          })),
        })
      }

      return order
    })

    return NextResponse.json({ order: updated })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}