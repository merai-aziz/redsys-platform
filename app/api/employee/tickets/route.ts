import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['EMPLOYEE'])

    const tickets = await prisma.ticket.findMany({
      where: { assignedToId: user.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, companyName: true } },
        contract: { select: { id: true, companyName: true, warrantyEnd: true } },
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