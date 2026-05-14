"use client"

import { Ticket, UserCircle } from 'lucide-react'

import { DashboardShell } from '@/components/dashboard-shell'

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      allowedRole="EMPLOYEE"
      roleLabel="EMPLOYÉ"
      roleTintClass="bg-sky-500/15 text-sky-300"
      title="Espace Employé"
      profileHref="/employee/profile"
      navItems={[
        { href: '/employee/profile', label: 'Mon profil', icon: UserCircle },
        { href: '/employee/tickets', label: 'Mes tickets', icon: Ticket }
      ]}
    >
      {children}
    </DashboardShell>
  )
}
