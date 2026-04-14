"use client"

import { FileText, ListTree, Package, ScanSearch, SlidersHorizontal, Tags, Users } from 'lucide-react'

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
        { href: '/admin/catalog', label: 'Filtres & produits', icon: SlidersHorizontal },
        { href: '/admin/filters', label: 'Synthese filtres', icon: ListTree },
        { href: '/admin/products', label: 'Produits', icon: Tags },
        { href: '/admin/skus', label: 'SKUs', icon: ScanSearch },
        { href: '/admin/users', label: 'Utilisateurs', icon: Users },
        { href: '/admin/logs', label: 'Historique des logs', icon: FileText },
      ]}
    >
      {children}
    </DashboardShell>
  )
}