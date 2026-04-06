"use client"

import { FileText, Package, Users } from 'lucide-react'

import { DashboardShell } from '@/components/dashboard-shell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      allowedRole="ADMIN"
      roleLabel="ADMIN"
      roleTintClass="bg-rose-500/15 text-rose-300"
      title="Console Administration"
      profileHref="/admin/users"
      navItems={[
        { href: '/admin/equipment', label: 'Equipements', icon: Package },
        { href: '/admin/users', label: 'Utilisateurs', icon: Users },
        { href: '/admin/logs', label: 'Historique des logs', icon: FileText },
      ]}
    >
      {children}
    </DashboardShell>
  )
}