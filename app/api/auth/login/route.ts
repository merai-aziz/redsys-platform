import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!)

export async function POST(req: NextRequest) {
try {
  const body = await req.json()
  console.log('BODY RECU:', body)
  
  const { email, password } = body

  const user = await prisma.user.findUnique({ where: { email } })
  console.log('USER:', user?.email, '| ACTIVE:', user?.isActive, '| ROLE:', user?.userRole)

  if (!user) {
    console.log('USER NOT FOUND')
    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
  }

  if (!user.isActive) {
    console.log('USER INACTIVE')
    return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 })
  }

  const isValid = await bcrypt.compare(password, user.password)
  console.log('PASSWORD VALID:', isValid)

    // Log de connexion
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const device = req.headers.get('user-agent') || 'unknown'

    await prisma.loginLog.create({
      data: {
        userId: user.id,
        ipAddress: ip,
        deviceInfo: device,
        statusLog: isValid ? 'SUCCESS' : 'FAILED',
      }
    })

    if (!isValid) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    // Créer les tokens
    const payload = { userId: user.id, email: user.email, role: user.userRole }

    const accessToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(accessSecret)

    const refreshToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(refreshSecret)

    // Sauvegarder refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    })

    // Mettre à jour lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.userRole,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    })

    // Cookies HTTPOnly
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1h
    })

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 jours
    })

    return response

  } catch (error) {
    console.error('LOGIN ERROR:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}