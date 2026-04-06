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
  } catch { return null }
}

// GET — liste tous les users
export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const users = await prisma.user.findMany({
    where: { userRole: 'EMPLOYEE' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, userRole: true, isActive: true,
      phone: true, adresse: true, departement: true,
      companyName: true, createdAt: true, lastLogin: true
    }
  })
  return NextResponse.json({ users })
}

// POST — créer un user (employee)
export async function POST(req: NextRequest) {
  const admin = await checkAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { firstName, lastName, email, password, userRole, phone, adresse, departement, companyName } = await req.json()

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    if (userRole && userRole !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Seuls les comptes EMPLOYEE peuvent être créés ici' }, { status: 403 })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        firstName, lastName, email, password: hashed,
        userRole: 'EMPLOYEE', phone, adresse, departement,
        companyName, isVerified: true, isActive: true,
      },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, userRole: true, isActive: true
      }
    })
    return NextResponse.json({ user }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}