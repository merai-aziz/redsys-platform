import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { payload } = await jwtVerify(token, accessSecret)
    const {
      firstName, lastName, phone,
      adresse, departement, companyName   // ← companyName ajouté
    } = await req.json()

    const user = await prisma.user.update({
      where: { id: payload.userId as string },
      data: { firstName, lastName, phone, adresse, departement, companyName },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, userRole: true, companyName: true
      }
    })
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}