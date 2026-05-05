'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronRight, Layers, LogOut, Menu, CheckCheck, ShoppingBag } from 'lucide-react'
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

interface AppNotification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  referenceType?: string
  referenceId?: string
}

function NotificationIcon({ type }: { type: string }) {
  if (type === 'ORDER_STATUS_UPDATE') return <ShoppingBag className="h-4 w-4 text-sky-500" />
  return <Bell className="h-4 w-4 text-slate-400" />
}

function formatNotifDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  if (diffH < 24) return `Il y a ${diffH}h`
  return `Il y a ${diffD}j`
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
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const notifRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    return () => { mounted = false }
  }, [allowedRole])

  useEffect(() => {
    if (!user) return
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications ?? [])
        }
      } catch {
        // silencieux
      }
    }
    void fetchNotifications()
    pollRef.current = setInterval(fetchNotifications, 30000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [user])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  const initials = useMemo(() => {
    if (!user) return '??'
    return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
  }, [user])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    redirectToLogin()
  }

  async function markAsRead(notifId: string) {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)))
    await fetch(`/api/notifications/${notifId}/read`, { method: 'PATCH' }).catch(() => {})
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    await fetch('/api/notifications/read-all', { method: 'PATCH' }).catch(() => {})
  }

  // ── FIX MOBILE : fermer le sheet puis naviguer ──
  // Le problème était que Link dans SheetContent fermait le dialog
  // avant que la navigation ne se produise, annulant le clic.
  // Solution : utiliser router.push() avec un délai après fermeture.
  function handleMobileNavClick(href: string) {
    setSheetOpen(false)
    setTimeout(() => router.push(href), 200)
  }

  function handleMobileLogout() {
    setSheetOpen(false)
    setTimeout(() => handleLogout(), 200)
  }

  // ── Sidebar content partagé desktop/mobile ──
  function renderSidebarContent(mobile = false) {
    return (
      <>
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-[0_10px_25px_-15px_rgba(14,165,233,0.95)]">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900">Redsys</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">IT Infrastructure</p>
          </div>
        </div>

        {/* User card */}
        {user && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-1 ring-sky-200">
                <AvatarImage src={user.photo} alt="avatar" />
                <AvatarFallback className="bg-gradient-to-br from-sky-500 to-cyan-500 text-white">
                  {initials}
                </AvatarFallback>
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

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-1.5">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href

            if (mobile) {
              // Sur mobile : button + router.push pour éviter le bug de fermeture
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => handleMobileNavClick(href)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all text-left',
                    active
                      ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                      {badge}
                    </span>
                  )}
                  {active && !badge && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              )
            }

            // Desktop : Link normal
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
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

        {/* ── Sidebar desktop ── */}
        <aside className="hidden w-[280px] shrink-0 border-r border-slate-200 bg-white/95 p-5 backdrop-blur-xl lg:flex lg:flex-col">
          {renderSidebarContent(false)}
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="mt-3 w-full justify-start rounded-xl px-3 py-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">

          {/* ── Header ── */}
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-2">
                {/* Burger mobile */}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="border-slate-200 bg-white lg:hidden"
                    >
                      <Menu className="h-4 w-4" />
                      <span className="sr-only">Menu</span>
                    </Button>
                  </SheetTrigger>

                  {/* Sheet mobile */}
                  <SheetContent
                    side="left"
                    className="w-[290px] border-slate-200 bg-white p-5 text-slate-900"
                  >
                    <div className="flex h-full flex-col">
                      {renderSidebarContent(true)}

                      {/* Déconnexion mobile — button direct, pas de Link */}
                      <button
                        type="button"
                        onClick={handleMobileLogout}
                        className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        Déconnexion
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>

                <h1 className="text-sm font-semibold tracking-wide text-slate-900 sm:text-base">
                  {title}
                </h1>
              </div>

              <div className="flex items-center gap-2.5">

                {/* ── Toggle notifications responsive ── */}
                <div ref={notifRef} className="relative">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setNotifOpen((prev) => !prev)}
                    className="relative border-slate-200 bg-white text-slate-600"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>

                  {notifOpen && (
                    <div className={cn(
                      // Desktop : ancré à droite, largeur fixe
                      // Mobile : pleine largeur ancrée à droite avec max-width
                      "absolute right-0 top-11 z-50",
                      "w-[calc(100vw-2rem)] max-w-xs sm:w-80",
                      "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    )}>

                      {/* Header notif */}
                      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 sm:px-4 sm:py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">Notifications</p>
                          {unreadCount > 0 && (
                            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                              {unreadCount} non lues
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-1 text-xs font-medium text-sky-600 transition hover:text-sky-800"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Tout lire</span>
                          </button>
                        )}
                      </div>

                      {/* Liste notifs */}
                      <div className="max-h-72 overflow-y-auto sm:max-h-80">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell className="mx-auto h-8 w-8 text-slate-200" />
                            <p className="mt-2 text-sm text-slate-500">Aucune notification</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => markAsRead(notif.id)}
                              className={cn(
                                'flex w-full items-start gap-2.5 border-b border-slate-50 px-3 py-2.5 text-left transition hover:bg-slate-50 last:border-0 sm:gap-3 sm:px-4 sm:py-3',
                                !notif.isRead && 'bg-sky-50/60'
                              )}
                            >
                              <div className="mt-0.5 shrink-0 rounded-full bg-white p-1.5 shadow-sm ring-1 ring-slate-100">
                                <NotificationIcon type={notif.type} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-1">
                                  <p className={cn(
                                    'text-xs font-semibold leading-tight text-slate-900',
                                    !notif.isRead && 'font-bold'
                                  )}>
                                    {notif.title}
                                  </p>
                                  <span className="shrink-0 text-[10px] text-slate-400 whitespace-nowrap">
                                    {formatNotifDate(notif.createdAt)}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                                  {notif.message}
                                </p>
                              </div>
                              {!notif.isRead && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar → profil */}
                <Link href={profileHref} className="inline-flex">
                  <Avatar className="h-8 w-8 ring-1 ring-sky-200 sm:h-9 sm:w-9">
                    <AvatarImage src={user?.photo} alt="avatar" />
                    <AvatarFallback className="bg-gradient-to-br from-sky-500 to-cyan-500 text-[11px] text-white sm:text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            </div>
          </header>

          {/* ── Main ── */}
          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}