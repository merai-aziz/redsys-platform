'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, ChevronRight, Layers, LogOut, Menu } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type UserRole = 'ADMIN' | 'EMPLOYEE' | 'CLIENT'

interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  userRole: UserRole
  photo?: string
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

interface DashboardShellProps {
  allowedRole: UserRole
  roleLabel: string
  roleTintClass: string
  title: string
  profileHref: string
  navItems: NavItem[]
  children: React.ReactNode
}

export function DashboardShell({
  allowedRole,
  roleLabel,
  roleTintClass,
  title,
  profileHref,
  navItems,
  children,
}: DashboardShellProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  function redirectToLogin() {
    if (typeof window !== 'undefined') {
      window.location.replace('/login')
    }
  }

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()

        if (!mounted) return
        if (data.user && data.user.userRole === allowedRole) {
          setUser(data.user)
          return
        }

        redirectToLogin()
      } catch {
        if (mounted) redirectToLogin()
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [allowedRole])

  const initials = useMemo(() => {
    if (!user) return '??'
    return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
  }, [user])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    redirectToLogin()
  }

  function renderSidebarNav(mobile = false) {
    return (
      <>
        <div className="mb-8 flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-cyan-500 shadow-[0_10px_25px_-15px_rgba(14,165,233,0.95)]">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900">Redsys</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">IT Infrastructure</p>
          </div>
        </div>

        {user && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="ring-1 ring-sky-200">
                <AvatarImage src={user.photo} alt="avatar" />
                <AvatarFallback className="bg-linear-to-br from-sky-500 to-cyan-500 text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user.firstName} {user.lastName}
                </p>
                <Badge className={cn('mt-1', roleTintClass)}>{roleLabel}</Badge>
              </div>
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1.5">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => mobile && setSheetOpen(false)}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {badge && (
                  <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                    {badge}
                  </span>
                )}
                {active && !badge && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
              </Link>
            )
          })}
        </nav>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_8%_12%,rgba(14,165,233,0.16),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(6,182,212,0.14),transparent_36%),linear-gradient(180deg,#f8fbff,#f5f7fb)]" />

      <div className="flex min-h-screen">
        <aside className="hidden w-[280px] shrink-0 border-r border-slate-200 bg-white/95 p-5 backdrop-blur-xl lg:flex lg:flex-col">
          {renderSidebarNav()}
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="mt-3 w-full justify-start rounded-xl px-3 py-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Deconnexion
          </Button>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon-sm" className="border-slate-200 bg-white lg:hidden">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[290px] border-slate-200 bg-white p-5 text-slate-900">
                    <div className="flex h-full flex-col">
                      {renderSidebarNav(true)}
                      <Button
                        onClick={handleLogout}
                        variant="ghost"
                        className="mt-3 w-full justify-start rounded-xl px-3 py-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Deconnexion
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
                <h1 className="text-sm font-semibold tracking-wide text-slate-900 sm:text-base">{title}</h1>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setNotifOpen((prev) => !prev)}
                    className="border-slate-200 bg-white text-slate-600"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>

                  {notifOpen && (
                    <div className="absolute right-0 top-10 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                      <p className="text-sm font-medium text-slate-900">Notifications</p>
                      <p className="mt-2 text-xs text-slate-500">Aucune notification pour le moment.</p>
                    </div>
                  )}
                </div>

                <Link href={profileHref} className="inline-flex">
                  <Avatar size="lg" className="h-8 w-8 ring-1 ring-sky-200 sm:h-9 sm:w-9">
                    <AvatarImage src={user?.photo} alt="avatar" />
                    <AvatarFallback className="bg-linear-to-br from-sky-500 to-cyan-500 text-[11px] text-white sm:text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
