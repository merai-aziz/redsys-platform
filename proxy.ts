import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'

const publicRoutes = ['/', '/login', '/register']

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function isAdminDashboardRoute(pathname: string) {
  return pathname.startsWith('/admin')
}

function isClientDashboardRoute(pathname: string) {
  return pathname.startsWith('/client')
}

function isEmployeeDashboardRoute(pathname: string) {
  return pathname.startsWith('/employee')
}

function isCheckoutRoute(pathname: string) {
  return pathname.startsWith('/checkout')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('access_token')?.value

  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  if (!accessToken && (isAdminDashboardRoute(pathname) || isClientDashboardRoute(pathname) || isEmployeeDashboardRoute(pathname) || isCheckoutRoute(pathname))) {
    const redirectUrl = pathname === '/checkout'
      ? '/login?redirect=/checkout'
      : pathname.startsWith('/client')
        ? '/login?redirect=/client'
        : pathname.startsWith('/employee')
          ? '/login?redirect=/employee'
        : '/login'

    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  if (!accessToken) {
    return NextResponse.next()
  }

  const payload = await verifyAccessToken(accessToken)

  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('access_token')
    return response
  }

  if (isAdminDashboardRoute(pathname) && payload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isEmployeeDashboardRoute(pathname) && payload.role !== 'EMPLOYEE') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/client/:path*', '/employee/:path*', '/checkout/:path*'],
}