"use client"

import { ShoppingBag, Ticket, UserCircle } from 'lucide-react'

import { DashboardShell } from '@/components/dashboard-shell'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      allowedRole="CLIENT"
      roleLabel="CLIENT"
      roleTintClass="bg-emerald-500/15 text-emerald-300"
      title=""
      profileHref="/client/profile"
      navItems={[
        { href: '/client/profile', label: 'Mon profil', icon: UserCircle },
        { href: '/client/orders', label: 'Mes commandes', icon: ShoppingBag },
        { href: '/client/tickets', label: 'Mes tickets', icon: Ticket }
      ]}
    >
      {children}
    </DashboardShell>
  )
}
