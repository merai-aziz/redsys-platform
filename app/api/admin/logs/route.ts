import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

export async function GET(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const { payload } = await jwtVerify(token, accessSecret)
    if (payload.role !== 'ADMIN') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
  }

  const logs = await prisma.loginLog.findMany({
    orderBy: { loginDate: 'desc' },
    take: 100,
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, userRole: true }
      }
    }
  })
  return NextResponse.json({ logs })
}