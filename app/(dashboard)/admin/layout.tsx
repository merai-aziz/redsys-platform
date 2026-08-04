'use client'
 
import { FileText, Users, Package, Layers, ShoppingCart, Ticket, BarChart2 } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard-shell'
 
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      allowedRole="ADMIN"
      roleLabel="ADMIN"
      roleTintClass="bg-rose-500/15 text-rose-300"
      title="Console Administration"
      profileHref="/admin/logs"
      navItems={[
        { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 }, 
        { href: '/admin/catalog', label: 'Catalogue', icon: Layers },
        { href: '/admin/products', label: 'Produits', icon: Package },
        { href: '/admin/stock', label: 'Stock', icon: BarChart2 },
        { href: '/admin/orders', label: 'Commandes', icon: ShoppingCart }, 
        { href: '/admin/contracts', label: 'Contrats', icon: FileText }, 
        { href: '/admin/tickets', label: 'Tickets', icon: Ticket }, 
        { href: '/admin/users', label: 'Utilisateurs', icon: Users },
        { href: '/admin/logs', label: 'Historique des logs', icon: FileText },
      ]}
    >
      {children}
    </DashboardShell>
  )
}
