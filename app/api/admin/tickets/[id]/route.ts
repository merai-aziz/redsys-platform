import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'ouvert',
  ACCEPTED: 'accepté',
  IN_PROGRESS: 'en cours de traitement',
  RESOLVED: 'résolu',
  CLOSED: 'fermé',
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req)

    // Attendre la résolution de params (Next.js 15+)
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    const body = await req.json()
    const { status, assignedToId, comment } = body

    const existing = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(assignedToId !== undefined ? { assignedToId: assignedToId || null } : {}),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, companyName: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, departement: true } },
          contract: { select: { id: true, companyName: true } },
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

      // commentaire
      if (comment?.trim()) {
        const admin = await tx.user.findFirst({
          where: { userRole: 'ADMIN', isActive: true },
          select: { id: true },
        })

        if (admin) {
          await tx.ticketComment.create({
            data: {
              ticketId: id,
              authorId: admin.id,
              content: comment.trim(),
            },
          })
        }
      }

      // notification status
      if (status && status !== existing.status) {
        await tx.notification.create({
          data: {
            userId: existing.userId,
            title: 'Mise à jour de votre ticket',
            message: `Votre ticket "${existing.title}" est maintenant ${STATUS_LABELS[status] ?? status}.`,
            type: 'TICKET_UPDATE',
            referenceType: 'TICKET',
            referenceId: id,
          },
        })
      }

      // notification assignation
      if (assignedToId !== undefined && assignedToId !== existing.assignedToId && assignedToId) {
        await tx.notification.create({
          data: {
            userId: assignedToId,
            title: 'Ticket assigné',
            message: `Un ticket vous a été assigné : "${existing.title}"`,
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