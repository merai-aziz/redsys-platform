'use client'
import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  Mail, Phone, MapPin, Building2,
  Loader2, Save, Camera, KeyRound, UserCircle
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ClientUser {
  id: string; firstName: string; lastName: string
  email: string; userRole: string; phone?: string
  adresse?: string; companyName?: string
  createdAt: string; lastLogin?: string; photo?: string
}

export default function ClientProfilePage() {
  const [user, setUser]         = useState<ClientUser | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tab, setTab]           = useState<'info' | 'password'>('info')
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '',
    adresse: '', companyName: ''
  })
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  })

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) {
        setUser(d.user)
        setForm({
          firstName:   d.user.firstName   || '',
          lastName:    d.user.lastName    || '',
          phone:       d.user.phone       || '',
          adresse:     d.user.adresse     || '',
          companyName: d.user.companyName || '',
        })
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) toast.success('Profil mis à jour !')
      else toast.error('Erreur lors de la mise à jour')
    } catch { toast.error('Erreur réseau') }
    finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas'); return
    }
    if (pwdForm.newPassword.length < 8) {
      toast.error('Minimum 8 caractères'); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pwdForm),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Mot de passe modifié !')
        setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else toast.error(data.error || 'Erreur')
    } catch { toast.error('Erreur réseau') }
    finally { setSaving(false) }
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch('/api/auth/profile/photo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setUser(prev => prev ? { ...prev, photo: data.photo } : prev)
        toast.success('Photo mise à jour !')
      } else toast.error(data.error)
    } catch { toast.error('Erreur upload') }
    finally { setUploading(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={28} className="animate-spin text-sky-600" />
    </div>
  )
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
            <h1 className="text-2xl font-bold text-slate-900">{user.firstName} {user.lastName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1"><Mail size={14} /> {user.email}</span>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">CLIENT</Badge>
            </div>
            {user.companyName && (
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600">
                <Building2 size={14} /> {user.companyName}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR')}
              {user.lastLogin ? ` · Derniere connexion : ${new Date(user.lastLogin).toLocaleDateString('fr-FR')}` : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white p-1 shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          {[
            { key: 'info', label: 'Informations', icon: UserCircle },
            { key: 'password', label: 'Mot de passe', icon: KeyRound },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              type="button"
              variant={tab === key ? 'default' : 'ghost'}
              onClick={() => setTab(key as 'info' | 'password')}
              className={tab === key ? 'bg-sky-600 text-white hover:bg-sky-700' : 'text-slate-600'}
            >
              <Icon size={14} /> {label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Tab Infos */}
      {tab === 'info' && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>Mettez a jour vos coordonnees client.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Prenom</Label>
              <Input value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className="mt-2 h-11 border-slate-200 bg-slate-50" />
            </div>
            <div>
              <Label>Nom</Label>
              <Input value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className="mt-2 h-11 border-slate-200 bg-slate-50" />
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
              <Label>
                <span className="inline-flex items-center gap-1">
                  <Phone size={11} /> Téléphone
                </span>
              </Label>
              <Input value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+216 XX XXX XXX" className="mt-2 h-11 border-slate-200 bg-slate-50" />
            </div>
            <div>
              <Label>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> Adresse
                </span>
              </Label>
              <Input value={form.adresse}
                onChange={e => setForm({ ...form, adresse: e.target.value })}
                placeholder="Tunis" className="mt-2 h-11 border-slate-200 bg-slate-50" />
            </div>
          </div>

          <div>
            <Label>
              <span className="inline-flex items-center gap-1">
                <Building2 size={11} /> Nom de la compagnie
              </span>
            </Label>
            <Input value={form.companyName}
              onChange={e => setForm({ ...form, companyName: e.target.value })}
              placeholder="Votre entreprise (optionnel)"
              className="mt-2 h-11 border-slate-200 bg-slate-50" />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="h-11 bg-sky-600 text-white hover:bg-sky-700">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Sauvegarder
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Password */}
      {tab === 'password' && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Securite du compte</CardTitle>
            <CardDescription>Mettez a jour votre mot de passe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Le mot de passe doit contenir au minimum 8 caractères.
          </div>

          <div className="space-y-4">
            <div>
              <Label>Mot de passe actuel</Label>
              <Input type="password" value={pwdForm.currentPassword}
                onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                placeholder="••••••••" className="mt-2 h-11 border-slate-200 bg-slate-50" />
            </div>
            <div>
              <Label>Nouveau mot de passe</Label>
              <Input type="password" value={pwdForm.newPassword}
                onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                placeholder="••••••••" className="mt-2 h-11 border-slate-200 bg-slate-50" />
            </div>
            <div>
              <Label>Confirmer</Label>
              <Input type="password" value={pwdForm.confirmPassword}
                onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                placeholder="••••••••" className="mt-2 h-11 border-slate-200 bg-slate-50" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={saving} className="h-11 bg-sky-600 text-white hover:bg-sky-700">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Changer le mot de passe
            </Button>
          </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}