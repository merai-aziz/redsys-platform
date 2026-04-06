import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'

const publicRoutes = ['/login', '/register', '/']
const adminRoutes = ['/admin']
const employeeRoutes = ['/employee']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('access_token')?.value

  // Routes publiques : laisser passer
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Pas de token → redirect login
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await verifyAccessToken(accessToken)

  // Token invalide → redirect login
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('access_token')
    return response
  }

  // Vérification des rôles
  if (adminRoutes.some(r => pathname.startsWith(r)) && payload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (employeeRoutes.some(r => pathname.startsWith(r)) && payload.role !== 'EMPLOYEE') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/employee/:path*', '/client/:path*'],
}