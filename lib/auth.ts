import { type User, type UserRole } from '@prisma/client'

import { verifyAccessToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

function readAccessToken(request: Request): string | null {
	const nextLikeRequest = request as Request & {
		cookies?: { get: (name: string) => { value: string } | undefined }
	}

	const tokenFromCookieStore = nextLikeRequest.cookies?.get('access_token')?.value
	if (tokenFromCookieStore) return tokenFromCookieStore

	const cookieHeader = request.headers.get('cookie')
	if (!cookieHeader) return null

	const tokenPart = cookieHeader
		.split(';')
		.map((chunk) => chunk.trim())
		.find((chunk) => chunk.startsWith('access_token='))

	if (!tokenPart) return null
	return decodeURIComponent(tokenPart.slice('access_token='.length))
}

export async function getUserFromRequest(request: Request): Promise<User | null> {
	const token = readAccessToken(request)
	if (!token) return null

	const payload = await verifyAccessToken(token)
	if (!payload?.userId) return null

	const user = await prisma.user.findUnique({
		where: { id: payload.userId },
	})

	if (!user || !user.isActive) return null
	return user
}

export async function requireAuth(
	request: Request,
	allowedRoles?: UserRole[],
): Promise<User> {
	const user = await getUserFromRequest(request)

	if (!user) {
		throw Response.json({ error: 'Non autorisé' }, { status: 401 })
	}

	if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.userRole)) {
		throw Response.json({ error: 'Accès interdit' }, { status: 403 })
	}

	return user
}

export async function requireAdmin(request: Request): Promise<User> {
	return requireAuth(request, ['ADMIN'])
}
