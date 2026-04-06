import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value
    if (!refreshToken) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const payload = await verifyRefreshToken(refreshToken)
    if (!payload) return NextResponse.json({ error: 'Token invalide' }, { status: 401 })

    // Vérifier en DB
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token révoqué ou expiré' }, { status: 401 })
    }

    // Révoquer l'ancien et créer un nouveau (rotation)
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } })

    const newPayload = { userId: payload.userId, email: payload.email, role: payload.role }
    const newAccessToken = await signAccessToken(newPayload)
    const newRefreshToken = await signRefreshToken(newPayload)

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken, userId: payload.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60 * 60
    })
    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}