import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    const tickets = await prisma.ticket.findMany({
      where: { userId: user.id },
      include: {
        contract: { select: { id: true, companyName: true, warrantyEnd: true, warrantyStart: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, departement: true } },
        comments: {
          include: { author: { select: { id: true, firstName: true, lastName: true, userRole: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tickets })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    const body = await req.json()
    const { contractId, title, description, priority } = body

    if (!title || !description) {
      return NextResponse.json({ error: 'Titre et description requis' }, { status: 400 })
    }

    // Vérifier que le contrat appartient au client et que la garantie est valide
    if (contractId) {
      const contract = await prisma.contract.findFirst({
        where: { id: contractId, userId: user.id },
      })
      if (!contract) {
        return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
      }
      if (new Date(contract.warrantyEnd) < new Date()) {
        return NextResponse.json({ error: 'La garantie de ce contrat est expirée' }, { status: 400 })
      }
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const newTicket = await tx.ticket.create({
        data: {
          userId: user.id,
          contractId: contractId ?? null,
          title,
          description,
          priority: priority ?? 'LOW',
          status: 'OPEN',
        },
        include: {
          contract: { select: { id: true, companyName: true } },
        },
      })

      // Notifier tous les admins
      const admins = await tx.user.findMany({
        where: { userRole: 'ADMIN', isActive: true },
        select: { id: true },
      })

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: 'Nouveau ticket de support',
            message: `${user.firstName} ${user.lastName} a ouvert un ticket : "${title}"`,
            type: 'TICKET_UPDATE' as const,
            referenceType: 'TICKET',
            referenceId: newTicket.id,
          })),
        })
      }

      return newTicket
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('POST /api/tickets error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création du ticket' }, { status: 500 })
  }
}

