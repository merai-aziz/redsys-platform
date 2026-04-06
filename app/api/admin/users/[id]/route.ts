import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, accessSecret)
    if (payload.role !== 'ADMIN') return null
    return payload
  } catch {
    return null
  }
}

// PUT — modifier un user
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { id } = await context.params   // ✅ FIX ICI

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { userRole: true }
    })

    if (!target) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (target.userRole !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Seuls les comptes EMPLOYEE sont modifiables' }, { status: 403 })
    }

    const {
      firstName,
      lastName,
      email,
      password,
      userRole,
      phone,
      adresse,
      departement,
      companyName,
      isActive
    } = await req.json()

    if (userRole && userRole !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Le rôle doit rester EMPLOYEE' }, { status: 403 })
    }

    const data: Record<string, unknown> = {
      firstName,
      lastName,
      email,
      userRole: 'EMPLOYEE',
      phone,
      adresse,
      departement,
      companyName,
      isActive
    }

    if (password) {
      data.password = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userRole: true,
        isActive: true
      }
    })

    return NextResponse.json({ user })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — supprimer un user
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { id } = await context.params   // ✅ FIX ICI

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { userRole: true }
    })

    if (!target) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (target.userRole !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Seuls les comptes EMPLOYEE sont supprimables' }, { status: 403 })
    }

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Utilisateur supprimé' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}