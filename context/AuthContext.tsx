"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { clearPersistedCart } from '@/context/CartContext'

type UserRole = 'admin' | 'client' | 'employee'

type AuthUser = { id: string; name: string; email: string; role: UserRole } | null

type LoginResult = { success: boolean; error?: string; user?: AuthUser }

type ApiUser = {
  id: string
  name?: string | null
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  role?: UserRole | string | null
  userRole?: UserRole | string | null
  isAdmin?: boolean | null
  userType?: string | null
}

type AuthContextShape = {
  user: AuthUser
  isAuthenticated: boolean
  isAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextShape | undefined>(undefined)

function toAuthUser(apiUser: ApiUser | null | undefined): AuthUser {
  if (!apiUser) return null

  let name = apiUser.name?.trim() ?? ''
  if (!name) {
    const firstName = apiUser.firstName?.trim() ?? ''
    const lastName = apiUser.lastName?.trim() ?? ''
    name = `${firstName}${lastName ? ` ${lastName}` : ''}`.trim()
  }
  if (!name) {
    name = apiUser.email?.trim() ?? ''
  }

  const rawRole = String(apiUser.role ?? apiUser.userRole ?? apiUser.userType ?? '').toLowerCase()
  let mappedRole: UserRole = 'client'
  if (apiUser.isAdmin === true || rawRole === 'admin') {
    mappedRole = 'admin'
  } else if (rawRole === 'employee') {
    mappedRole = 'employee'
  }

  return {
    id: apiUser.id,
    name,
    email: apiUser.email ?? '',
    role: mappedRole,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include', signal: controller.signal })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        // map API user shape to internal shape with `name`
        setUser(toAuthUser(data?.user))
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        // ignore
      } finally {
        if (mounted && !controller.signal.aborted) setLoading(false)
      }
    }

    void checkSession()
    return () => {
      mounted = false
      controller.abort()
    }
  }, [])

  async function login(email: string, password: string): Promise<LoginResult> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { success: false, error: payload?.error ?? payload?.message ?? 'Identifiants incorrects' }
      }

      // Mettre à jour le state immédiatement en normalisant le nom
      const authUser = toAuthUser(payload?.user)
      setUser(authUser)
      return { success: true, user: authUser ?? undefined }
    } catch {
      return { success: false, error: 'Erreur réseau, réessayez.' }
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }

    clearPersistedCart()
    setUser(null)
    router.refresh()
  }

  const value: AuthContextShape = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
