// /app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = 20

    const where = status ? { status: status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' } : {}

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          shippingAddress: true,
          items: {
            include: {
              product: { select: { name: true, image_url: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({ orders, total, page, limit })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────
// /app/api/admin/orders/[id]/route.ts
// ─────────────────────────────────────────────────────────
// Ce fichier doit être créé séparément à ce chemin.
// Contenu à copier dans /app/api/admin/orders/[id]/route.ts :

export const ADMIN_ORDER_ID_ROUTE = `
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
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { status } = body

    const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: params.id },
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
          message: \`Votre commande #\${params.id.slice(0, 8).toUpperCase()} est maintenant \${STATUS_LABELS[status] ?? status}.\`,
          type: 'ORDER_STATUS_UPDATE',
          referenceType: 'ORDER',
          referenceId: params.id,
        },
      })

      return order
    })

    return NextResponse.json({ order: updated })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
`