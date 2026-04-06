import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true }
    }).catch(() => {})
  }
  const response = NextResponse.json({ message: 'Déconnecté' })
  response.cookies.delete('access_token')
  response.cookies.delete('refresh_token')
  return response
}