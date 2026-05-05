// /app/api/tickets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params
    const body = await req.json()
    const { comment } = body

    // Vérifier que le ticket appartient au client
    const existing = await prisma.ticket.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
    }

    // Ne pas permettre de commenter si le ticket est fermé
    if (existing.status === 'CLOSED') {
      return NextResponse.json({ error: 'Ce ticket est fermé' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      let ticket = existing

      // Ajouter le commentaire
      if (comment?.trim()) {
        await tx.ticketComment.create({
          data: {
            ticketId: id,
            authorId: user.id,
            content: comment.trim(),
          },
        })
      }

      // Si le ticket était résolu et que le client commente, le rouvrir
      if (existing.status === 'RESOLVED' && comment?.trim()) {
        ticket = await tx.ticket.update({
          where: { id },
          data: { status: 'OPEN' },
        })
        
        // Notifier les admins que le ticket est rouvert
        const admins = await tx.user.findMany({
          where: { userRole: 'ADMIN', isActive: true },
          select: { id: true },
        })

        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              title: 'Ticket rouvert',
              message: `Le client a répondu au ticket "${existing.title}"`,
              type: 'TICKET_UPDATE',
              referenceType: 'TICKET',
              referenceId: id,
            })),
          })
        }
      }

      // Récupérer le ticket mis à jour avec tous les include
      return await tx.ticket.findUnique({
        where: { id },
        include: {
          contract: { select: { id: true, companyName: true, warrantyEnd: true, warrantyStart: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, departement: true } },
          comments: {
            include: { author: { select: { id: true, firstName: true, lastName: true, userRole: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    })

    return NextResponse.json({ ticket: updated })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('PATCH /api/tickets/[id] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}