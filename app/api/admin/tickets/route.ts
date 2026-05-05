import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search') ?? ''

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { user: { firstName: { contains: search, mode: 'insensitive' } } },
            { user: { lastName: { contains: search, mode: 'insensitive' } } },
            { user: { companyName: { contains: search, mode: 'insensitive' } } },
          ],
        } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, companyName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, departement: true } },
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

