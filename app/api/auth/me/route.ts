import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { payload } = await jwtVerify(token, accessSecret)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, userRole: true, isActive: true,
        phone: true, adresse: true, departement: true,
        companyName: true, createdAt: true, lastLogin: true,
        photo: true,  
      }
    })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
  }
}