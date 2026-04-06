"use client"

import { UserCircle } from 'lucide-react'

import { DashboardShell } from '@/components/dashboard-shell'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      allowedRole="CLIENT"
      roleLabel="CLIENT"
      roleTintClass="bg-emerald-500/15 text-emerald-300"
      title="Espace Client"
      profileHref="/client/profile"
      navItems={[{ href: '/client/profile', label: 'Mon profil', icon: UserCircle }]}
    >
      {children}
    </DashboardShell>
  )
}