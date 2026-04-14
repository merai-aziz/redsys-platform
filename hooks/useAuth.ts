'use client'

import { useCallback, useEffect, useState } from 'react'

type AuthUser = {
	id: string
	firstName: string
	lastName: string
	email: string
	userRole: 'ADMIN' | 'EMPLOYEE' | 'CLIENT'
	isActive: boolean
	phone?: string | null
	adresse?: string | null
	departement?: string | null
	companyName?: string | null
	createdAt: string
	lastLogin?: string | null
	photo?: string | null
}

type UseAuthResult = {
	user: AuthUser | null
	isLoading: boolean
	isAuthenticated: boolean
	refetch: () => Promise<void>
}

let authCache: { user: AuthUser | null; fetched: boolean } = {
	user: null,
	fetched: false,
}

let inFlight: Promise<AuthUser | null> | null = null

async function fetchMe(force = false): Promise<AuthUser | null> {
	if (!force && authCache.fetched) {
		return authCache.user
	}

	if (!force && inFlight) {
		return inFlight
	}

	const request = (async () => {
		try {
			const res = await fetch('/api/auth/me', {
				method: 'GET',
				credentials: 'include',
			})

			if (!res.ok) {
				authCache = { user: null, fetched: true }
				return null
			}

			const data: { user?: AuthUser } = await res.json()
			const user = data.user ?? null
			authCache = { user, fetched: true }
			return user
		} catch {
			authCache = { user: null, fetched: true }
			return null
		}
	})()

	inFlight = request

	try {
		return await request
	} finally {
		if (inFlight === request) {
			inFlight = null
		}
	}
}

export function useAuth(): UseAuthResult {
	const [user, setUser] = useState<AuthUser | null>(authCache.user)
	const [isLoading, setIsLoading] = useState<boolean>(!authCache.fetched)

	const load = useCallback(async (force = false) => {
		if (force) {
			setIsLoading(true)
		} else if (!authCache.fetched) {
			setIsLoading(true)
		}

		const nextUser = await fetchMe(force)
		setUser(nextUser)
		setIsLoading(false)
	}, [])

	useEffect(() => {
		if (authCache.fetched) {
			setUser(authCache.user)
			setIsLoading(false)
			return
		}

		void load(false)
	}, [load])

	const refetch = useCallback(async () => {
		await load(true)
	}, [load])

	return {
		user,
		isLoading,
		isAuthenticated: Boolean(user),
		refetch,
	}
}
