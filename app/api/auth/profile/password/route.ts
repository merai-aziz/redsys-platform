import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { payload } = await jwtVerify(token, accessSecret)
    const userId = payload.userId as string

    const { currentPassword, newPassword, confirmPassword } = await req.json()

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Les mots de passe ne correspondent pas' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, isActive: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 })
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentValid) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 })
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password)
    if (isSamePassword) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit être différent de l\'ancien' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed }
    })

    return NextResponse.json({ message: 'Mot de passe mis à jour' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
