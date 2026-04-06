'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Building, Camera, Loader2, Mail, MapPin, Phone, Save } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EmployeeUser {
  id: string
  firstName: string
  lastName: string
  email: string
  userRole: string
  phone?: string
  adresse?: string
  departement?: string
  createdAt: string
  lastLogin?: string
  photo?: string
}

export default function EmployeeProfilePage() {
  const [user, setUser] = useState<EmployeeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    adresse: '',
  })

  useEffect(() => {
    async function bootstrap() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
          setForm({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            phone: data.user.phone || '',
            adresse: data.user.adresse || '',
          })
        }
      } finally {
        setLoading(false)
      }
    }

    void bootstrap()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) toast.success('Profil mis a jour.')
      else toast.error('Erreur lors de la mise a jour')
    } catch {
      toast.error('Erreur reseau')
    } finally {
      setSaving(false)
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch('/api/auth/profile/photo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setUser((prev) => (prev ? { ...prev, photo: data.photo } : prev))
        toast.success('Photo mise a jour.')
      } else {
        toast.error(data.error || 'Erreur upload')
      }
    } catch {
      toast.error('Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
      </div>
    )
  }

  if (!user) return null

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
          <div className="relative w-fit shrink-0">
            <Avatar className="h-20 w-20 ring-2 ring-sky-100">
              <AvatarImage src={user.photo} alt="avatar" />
              <AvatarFallback className="bg-linear-to-br from-sky-500 to-cyan-500 text-2xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white shadow-md transition hover:bg-sky-700 disabled:opacity-60"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900">
              {user.firstName} {user.lastName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1"><Mail size={14} /> {user.email}</span>
              <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">EMPLOYE</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {user.departement ? <span className="inline-flex items-center gap-1"><Building size={12} /> {user.departement}</span> : null}
              <span>Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>Mettre a jour votre profil employe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Prenom</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="mt-2 h-11 border-slate-200 bg-slate-50"
              />
            </div>
            <div>
              <Label>Nom</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="mt-2 h-11 border-slate-200 bg-slate-50"
              />
            </div>
          </div>

          <div>
            <Label>Email (non modifiable)</Label>
            <div className="mt-2 inline-flex h-11 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500">
              <Mail size={14} /> {user.email}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="inline-flex items-center gap-1"><Phone size={12} /> Telephone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+216 XX XXX XXX"
                className="mt-2 h-11 border-slate-200 bg-slate-50"
              />
            </div>
            <div>
              <Label className="inline-flex items-center gap-1"><MapPin size={12} /> Adresse</Label>
              <Input
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                placeholder="Tunis"
                className="mt-2 h-11 border-slate-200 bg-slate-50"
              />
            </div>
          </div>

          <Alert className="border-amber-200 bg-amber-50 text-amber-700">
            <AlertTitle>Note securite</AlertTitle>
            <AlertDescription>Le changement de mot de passe est gere par l administrateur.</AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="h-11 bg-sky-600 text-white hover:bg-sky-700">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed border-slate-300 bg-slate-50/80">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white">
            <Building size={16} className="text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Mon emploi</p>
            <p className="text-xs text-slate-500">Contrat, poste et historique seront disponibles prochainement.</p>
          </div>
          <Badge className="ml-auto bg-amber-100 text-amber-700 hover:bg-amber-100">Bientot</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
