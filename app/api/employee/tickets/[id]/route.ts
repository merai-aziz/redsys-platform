import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employee = await requireAuth(req, ['EMPLOYEE'])
    const body = await req.json()
    const { status, comment } = body

    // Attendre la résolution de params (Next.js 15+)
    const { id } = await params

    const existing = await prisma.ticket.findFirst({
      where: { id, assignedToId: employee.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Ticket introuvable ou non assigné' }, { status: 404 })
    }

    // L'employé peut seulement passer RESOLVED ou IN_PROGRESS
    const validStatuses = ['IN_PROGRESS', 'RESOLVED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut non autorisé' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id },
        data: status ? { status } : {},
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          comments: {
            include: {
              author: {
                select: { id: true, firstName: true, lastName: true, userRole: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      // Ajouter commentaire
      if (comment?.trim()) {
        await tx.ticketComment.create({
          data: {
            ticketId: id,
            authorId: employee.id,
            content: comment.trim(),
          },
        })
      }

      // Notification si changement de statut
      if (status && status !== existing.status) {
        const labels: Record<string, string> = {
          IN_PROGRESS: 'en cours de traitement',
          RESOLVED: 'résolu',
        }

        await tx.notification.create({
          data: {
            userId: existing.userId,
            title: 'Mise à jour de votre ticket',
            message: `Votre ticket "${existing.title}" est maintenant ${labels[status] ?? status}.`,
            type: 'TICKET_UPDATE',
            referenceType: 'TICKET',
            referenceId: id,
          },
        })
      }

      return ticket
    })

    return NextResponse.json({ ticket: updated })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}