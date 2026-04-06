'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  userRole: string
  isActive: boolean
  phone?: string
  adresse?: string
  departement?: string
}

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  adresse: '',
  departement: '',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchUsers()
  }, [])

  function openCreate() {
    setEditUser(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(user: User) {
    setEditUser(user)
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      phone: user.phone || '',
      adresse: user.adresse || '',
      departement: user.departement || '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('Remplissez les champs obligatoires')
      return
    }

    if (!editUser && !form.password) {
      toast.error('Mot de passe requis')
      return
    }

    setSaving(true)
    try {
      const url = editUser ? `/api/admin/users/${editUser.id}` : '/api/admin/users'
      const method = editUser ? 'PUT' : 'POST'
      const payload: Record<string, unknown> = {
        ...form,
        userRole: 'EMPLOYEE',
      }

      if (editUser && !form.password) {
        delete payload.password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Operation impossible')
        return
      }

      toast.success(editUser ? 'Employe modifie.' : 'Employe cree.')
      setShowModal(false)
      await fetchUsers()
    } catch {
      toast.error('Erreur reseau')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Supprimer ${user.firstName} ${user.lastName} ?`)) return

    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => null)
    if (res.ok) {
      toast.success('Employe supprime.')
      await fetchUsers()
    } else {
      toast.error(data?.error || 'Erreur suppression')
    }
  }

  async function handleToggleActive(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...user,
        userRole: 'EMPLOYEE',
        isActive: !user.isActive,
        password: undefined,
      }),
    })

    if (res.ok) {
      toast.success(user.isActive ? 'Compte desactive.' : 'Compte active.')
      await fetchUsers()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Echec de mise a jour du statut')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q))
  }, [users, search])

  const activeCount = users.filter((u) => u.isActive).length
  const inactiveCount = users.filter((u) => !u.isActive).length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des employes</h1>
          <p className="mt-1 text-sm text-slate-500">Administration des comptes employe uniquement.</p>
        </div>
        <Button onClick={openCreate} className="bg-sky-600 text-white hover:bg-sky-700">
          <Plus size={14} /> Creer un employe
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total employes</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{users.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Actifs</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Inactifs</p>
            <p className="mt-1 text-3xl font-bold text-rose-600">{inactiveCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Liste des employes</CardTitle>
          <CardDescription>Recherchez et gerez vos comptes employe.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-md">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email"
              className="h-10 border-slate-200 bg-slate-50 pl-9"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employe</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                    Aucun employe trouve.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-sky-100 text-sky-700">
                            {(user.firstName[0] ?? '').toUpperCase()}
                            {(user.lastName[0] ?? '').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-slate-500">{user.departement || 'Sans departement'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-100 text-rose-700 hover:bg-rose-100'
                        }
                      >
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon-sm" onClick={() => openEdit(user)}>
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleToggleActive(user)}
                          className={user.isActive ? 'text-rose-600' : 'text-emerald-600'}
                        >
                          {user.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                        </Button>
                        <Button variant="outline" size="icon-sm" className="text-rose-600" onClick={() => handleDelete(user)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Modifier un employe' : 'Creer un employe'}</DialogTitle>
            <DialogDescription>
              Les comptes geres via cette interface sont uniquement de role EMPLOYEE.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Prenom *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="mt-2 h-10 border-slate-200 bg-slate-50"
                />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="mt-2 h-10 border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                type="email"
                className="mt-2 h-10 border-slate-200 bg-slate-50"
              />
            </div>

            <div>
              <Label>Mot de passe {editUser ? '(optionnel)' : '*'}</Label>
              <Input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                type="password"
                className="mt-2 h-10 border-slate-200 bg-slate-50"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Telephone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-2 h-10 border-slate-200 bg-slate-50"
                />
              </div>
              <div>
                <Label>Adresse</Label>
                <Input
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  className="mt-2 h-10 border-slate-200 bg-slate-50"
                />
              </div>
              <div>
                <Label>Departement</Label>
                <Input
                  value={form.departement}
                  onChange={(e) => setForm({ ...form, departement: e.target.value })}
                  className="mt-2 h-10 border-slate-200 bg-slate-50"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-sky-600 text-white hover:bg-sky-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editUser ? 'Modifier' : 'Creer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
