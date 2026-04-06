import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password, phone, adresse } = await req.json()

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { firstName, lastName, email, password: hashed,
               phone, adresse, userRole: 'CLIENT' }
    })

    return NextResponse.json({
      message: 'Compte créé avec succès',
      user: { id: user.id, email: user.email, role: user.userRole }
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}