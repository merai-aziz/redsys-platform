// dashboard-shell.tsx
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronRight, Layers, LogOut, Menu, CheckCheck, ShoppingBag, AlertTriangle } from 'lucide-react'
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

function getNotifHref(notif: AppNotification, role: UserRole): string {
  const prefix = role === 'ADMIN' ? '/admin' : role === 'EMPLOYEE' ? '/employee' : '/client'
  if (notif.type === 'ORDER_STATUS_UPDATE' || notif.referenceType === 'ORDER') {
    return role === 'ADMIN' ? '/admin/orders' : `${prefix}/orders`
  }
  if (notif.referenceType === 'TICKET') {
    return `${prefix}/tickets`
  }
  if (notif.referenceType === 'CONTRACT') {
    return role === 'ADMIN' ? '/admin/contracts' : `${prefix}/profile`
  }
  if (notif.referenceType === 'STOCK') {
    return '/admin/stock'
  }
  return profileHrefFallback(role)
}

function profileHrefFallback(role: UserRole): string {
  if (role === 'ADMIN') return '/admin/logs'
  if (role === 'EMPLOYEE') return '/employee/profile'
  return '/client/profile'
}

function NotificationIcon({ type }: { type: string }) {
  if (type === 'ORDER_STATUS_UPDATE') return <ShoppingBag className="h-4 w-4 text-sky-500" />
  if (type === 'STOCK_ALERT') return <AlertTriangle className="h-4 w-4 text-red-500" />
  if (type === 'SYSTEM') return <AlertTriangle className="h-4 w-4 text-amber-500" />
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
  const stockAudioRef = useRef<HTMLAudioElement | null>(null)
  const generalAudioRef = useRef<HTMLAudioElement | null>(null)
  // ✅ FIX 1 — référence temporelle au montage du composant.
  // On ne joue le son QUE pour les alertes créées après l'ouverture de la
  // page admin courante. Sans ça, toute navigation entre pages admin
  // remonte ce composant, réinitialise knownNotifIdsRef à zéro, et le
  // premier fetch "absorbe" silencieusement des alertes déjà existantes
  // (même une alerte vraiment nouvelle créée juste avant le remount).
  const mountTimeRef = useRef<number>(Date.now())

  // ✅ FIX 2 — Set initialisé directement (pas de null), simplifie la logique
  const knownNotifIdsRef = useRef<Set<string>>(new Set())

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
    stockAudioRef.current = new Audio('/sounds/stock-alert.mp3')
    stockAudioRef.current.volume = 0.6

    // ✅ Nouveau son pour commandes, tickets, et autres notifications
    generalAudioRef.current = new Audio('/sounds/notification.mp3')
    generalAudioRef.current.volume = 0.5
  }, [])

  useEffect(() => {
    if (!user) return

    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          const fresh: AppNotification[] = data.notifications ?? []

          // ✅ FIX 3 — critères combinés pour déclencher le son :
          // - non lue
          // - type STOCK_ALERT
          // - pas déjà vue dans un poll précédent (par id)
          // - créée APRÈS le montage du composant (timestamp, pas un Set vide)
          // ✅ Toutes les notifications nouvelles, non lues, créées après l'ouverture de la page
          const newNotifs = fresh.filter(
            (n) =>
              !n.isRead &&
              !knownNotifIdsRef.current.has(n.id) &&
              new Date(n.createdAt).getTime() > mountTimeRef.current,
          )

          const newStockAlerts = newNotifs.filter((n) => n.type === 'STOCK_ALERT')
          const newOtherNotifs = newNotifs.filter((n) => n.type !== 'STOCK_ALERT')

          if (newStockAlerts.length > 0) {
            console.log(`🔔 ${newStockAlerts.length} nouvelle(s) alerte(s) stock → son stock`)
            stockAudioRef.current?.play().catch((e) => {
              console.warn('⚠️ Lecture audio stock bloquée:', e.name, e.message)
            })
          }

          if (newOtherNotifs.length > 0) {
            console.log(
              `🔔 ${newOtherNotifs.length} nouvelle(s) notification(s) → son général`,
              newOtherNotifs.map((n) => n.type),
            )
            generalAudioRef.current?.play().catch((e) => {
              console.warn('⚠️ Lecture audio général bloquée:', e.name, e.message)
            })
          }

          knownNotifIdsRef.current = new Set(fresh.map((n) => n.id))
          setNotifications(fresh)
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

  const orderUnread = useMemo(
    () => notifications.filter((n) => !n.isRead && (n.type === 'ORDER_STATUS_UPDATE' || n.referenceType === 'ORDER')).length,
    [notifications]
  )
  const ticketUnread = useMemo(
    () => notifications.filter((n) => !n.isRead && n.referenceType === 'TICKET').length,
    [notifications]
  )

  const enrichedNavItems = useMemo(() => {
    return navItems.map((item) => {
      if (item.href.includes('orders') && orderUnread > 0) {
        return { ...item, badge: String(orderUnread) }
      }
      if (item.href.includes('tickets') && ticketUnread > 0) {
        return { ...item, badge: String(ticketUnread) }
      }
      return item
    })
  }, [navItems, orderUnread, ticketUnread])

  const initials = useMemo(() => {
    if (!user) return '??'
    return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
  }, [user])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    redirectToLogin()
  }

  async function markAsRead(notif: AppNotification) {
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)))
    await fetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' }).catch(() => { })
    const href = getNotifHref(notif, allowedRole)
    setNotifOpen(false)
    router.push(href)
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    await fetch('/api/notifications/read-all', { method: 'PATCH' }).catch(() => { })
  }

  function handleMobileNavClick(href: string) {
    setSheetOpen(false)
    setTimeout(() => router.push(href), 200)
  }

  function handleMobileLogout() {
    setSheetOpen(false)
    setTimeout(() => handleLogout(), 200)
  }

  function renderSidebarContent(mobile = false) {
    return (
      <>
        <div className="mb-8 flex items-center gap-3 px-1 py-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-sky-400 to-cyan-500 shadow-[0_8px_20px_-8px_rgba(14,165,233,0.8)]">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-slate-900">Redsys</p>
            <p className="text-[9px] uppercase tracking-widest text-slate-400">IT Infrastructure</p>
          </div>
        </div>

        {user && (
          <div className="mb-6 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-slate-50 to-slate-50 p-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 ring-2 ring-sky-200/50">
                <AvatarImage src={user.photo} alt="avatar" />
                <AvatarFallback className="bg-gradient-to-br from-sky-500 to-cyan-500 text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-slate-900">
                  {user.firstName} {user.lastName}
                </p>
                <Badge className={cn('mt-1.5', roleTintClass)}>{roleLabel}</Badge>
              </div>
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1">
          {enrichedNavItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href

            if (mobile) {
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => handleMobileNavClick(href)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left duration-150',
                    active
                      ? 'bg-gradient-to-r from-sky-100 to-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200/60'
                      : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-900'
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active && 'text-sky-600')} />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="ml-auto rounded-md bg-gradient-to-r from-amber-100 to-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200/50">
                      {badge}
                    </span>
                  )}
                  {active && !badge && <ChevronRight className="h-4 w-4 text-sky-600" />}
                </button>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-gradient-to-r from-sky-100 to-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200/60'
                    : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-900'
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active && 'text-sky-600')} />
                <span>{label}</span>
                {badge && (
                  <span className="ml-auto rounded-md bg-gradient-to-r from-amber-100 to-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200/50">
                    {badge}
                  </span>
                )}
                {active && !badge && <ChevronRight className="ml-auto h-4 w-4 text-sky-600" />}
              </Link>
            )
          })}
        </nav>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100 text-slate-900">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,rgba(14,165,233,0.12),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(6,182,212,0.10),transparent_40%)]" />

      <div className="flex min-h-screen">

        <aside className="hidden w-[280px] shrink-0 border-r border-slate-200/60 bg-gradient-to-b from-white/98 via-white/96 to-slate-50/95 p-5 backdrop-blur-xl lg:flex lg:flex-col">
          {renderSidebarContent(false)}
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="mt-auto pt-4 w-full justify-start rounded-lg px-3 py-2.5 text-rose-600 font-medium transition-all duration-150 hover:bg-rose-50/80 hover:text-rose-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">

          <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-gradient-to-r from-white/95 via-white/94 to-slate-50/95 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-2">
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="border-slate-200/60 bg-white/80 hover:bg-white lg:hidden"
                    >
                      <Menu className="h-4 w-4" />
                      <span className="sr-only">Menu</span>
                    </Button>
                  </SheetTrigger>

                  <SheetContent
                    side="left"
                    className="w-[290px] border-slate-200/60 bg-gradient-to-b from-white/98 to-slate-50/95 p-5 text-slate-900"
                  >
                    <div className="flex h-full flex-col">
                      {renderSidebarContent(true)}
                      <button
                        type="button"
                        onClick={handleMobileLogout}
                        className="mt-auto pt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition-all duration-150 hover:bg-rose-50/80 hover:text-rose-700"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        Déconnexion
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>

                {allowedRole === 'CLIENT' && (
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 rounded-lg border border-sky-200/60 bg-gradient-to-r from-sky-50/80 to-sky-50/60 px-2.5 py-1.5 text-xs font-medium text-sky-600 transition-all duration-150 hover:bg-sky-100/60 hover:text-sky-700"
                  >
                    <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                    <span className="hidden sm:inline">Catalogue</span>
                  </Link>
                )}

                <h1 className="text-sm font-bold tracking-wide text-slate-900 sm:text-base">
                  {title}
                </h1>
              </div>

              <div className="flex items-center gap-2">

                <div ref={notifRef} className="relative">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setNotifOpen((prev) => !prev)}
                    className="relative border-slate-200/60 bg-white/80 text-slate-600 hover:bg-white transition-colors duration-150"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-[10px] font-black text-white shadow-md">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>

                  {notifOpen && (
                    <div className={cn(
                      "absolute right-0 top-11 z-50",
                      "w-[calc(100vw-2rem)] max-w-xs sm:w-80",
                      "overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl"
                    )}>
                      <div className="flex items-center justify-between border-b border-slate-100/60 bg-gradient-to-r from-slate-50/50 to-white/50 px-3 py-3 sm:px-4 sm:py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">Notifications</p>
                          {unreadCount > 0 && (
                            <span className="rounded-full bg-gradient-to-r from-red-100 to-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 ring-1 ring-red-200/50">
                              {unreadCount} non lues
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-1 text-xs font-medium text-sky-600 transition-colors duration-150 hover:text-sky-700"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Tout lire</span>
                          </button>
                        )}
                      </div>

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
                              onClick={() => markAsRead(notif)}
                              className={cn(
                                'flex w-full items-start gap-2.5 border-b border-slate-50/60 px-3 py-3 text-left transition-colors duration-100 hover:bg-slate-50/80 last:border-0 sm:gap-3 sm:px-4',
                                !notif.isRead && 'bg-sky-50/70'
                              )}
                            >
                              <div className="mt-0.5 shrink-0 rounded-full bg-white p-1.5 shadow-sm ring-1 ring-slate-100/60">
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
                                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 shadow-md" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Link href={profileHref} className="inline-flex transition-transform duration-150 hover:scale-105">
                  <Avatar className="h-8 w-8 ring-2 ring-sky-200/50 sm:h-9 sm:w-9">
                    <AvatarImage src={user?.photo} alt="avatar" />
                    <AvatarFallback className="bg-gradient-to-br from-sky-500 to-cyan-500 text-[11px] font-semibold text-white sm:text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}