import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    const contracts = await prisma.contract.findMany({
      where: { userId: user.id },
      include: {
        contractItems: {
          include: {
            product: {
              select: { name: true, image_url: true },
            },
          },
        },
        tickets: {
          select: { id: true, status: true, createdAt: true },
        },
        order: {
          select: { id: true, total: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ contracts })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}