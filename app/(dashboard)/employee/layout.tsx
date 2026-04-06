"use client"

import { UserCircle } from 'lucide-react'

import { DashboardShell } from '@/components/dashboard-shell'

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      allowedRole="EMPLOYEE"
      roleLabel="EMPLOYE"
      roleTintClass="bg-sky-500/15 text-sky-300"
      title="Espace Employe"
      profileHref="/employee/profile"
      navItems={[{ href: '/employee/profile', label: 'Mon profil', icon: UserCircle }]}
    >
      {children}
    </DashboardShell>
  )
}