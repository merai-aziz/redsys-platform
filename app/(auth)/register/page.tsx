'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { Layers, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const schema = z.object({
  firstName: z.string().min(2, 'Prénom requis'),
  lastName:  z.string().min(2, 'Nom requis'),
  email:     z.string().email('Email invalide'),
  phone:     z.string().optional(),
  adresse:   z.string().optional(),
  password:  z.string().min(8, 'Min. 8 caractères'),
  confirm:   z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Mots de passe différents', path: ['confirm']
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Inscription impossible pour le moment')
        return
      }
      toast.success('Inscription reussie. Vous pouvez maintenant vous connecter.')
      router.push('/login')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg px-4 py-8">
      <div className="bg-[#111318] border border-[#2A2D38] rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-gradient-to-br from-[#4F6EF7] to-[#7C3AED] rounded-xl flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Redsys</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Créer un compte</h1>
        <p className="text-[#8892A4] text-sm mb-6">Espace Client — Redsys Platform</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-[#8892A4] uppercase tracking-wider mb-2 block">Prénom</Label>
              <Input {...register('firstName')} placeholder="Mohamed"
                className="bg-[#1A1D25] border-[#2A2D38] text-white focus:border-[#4F6EF7] h-11 rounded-xl" />
              {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label className="text-xs text-[#8892A4] uppercase tracking-wider mb-2 block">Nom</Label>
              <Input {...register('lastName')} placeholder="Ben Salem"
                className="bg-[#1A1D25] border-[#2A2D38] text-white focus:border-[#4F6EF7] h-11 rounded-xl" />
              {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <Label className="text-xs text-[#8892A4] uppercase tracking-wider mb-2 block">Email</Label>
            <Input {...register('email')} type="email" placeholder="contact@email.com"
              className="bg-[#1A1D25] border-[#2A2D38] text-white focus:border-[#4F6EF7] h-11 rounded-xl" />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-[#8892A4] uppercase tracking-wider mb-2 block">Téléphone</Label>
              <Input {...register('phone')} placeholder="+216 XX XXX XXX"
                className="bg-[#1A1D25] border-[#2A2D38] text-white focus:border-[#4F6EF7] h-11 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-[#8892A4] uppercase tracking-wider mb-2 block">Adresse</Label>
              <Input {...register('adresse')} placeholder="Tunis"
                className="bg-[#1A1D25] border-[#2A2D38] text-white focus:border-[#4F6EF7] h-11 rounded-xl" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-[#8892A4] uppercase tracking-wider mb-2 block">Mot de passe</Label>
            <Input {...register('password')} type="password" placeholder="Min. 8 caractères"
              className="bg-[#1A1D25] border-[#2A2D38] text-white focus:border-[#4F6EF7] h-11 rounded-xl" />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <Label className="text-xs text-[#8892A4] uppercase tracking-wider mb-2 block">Confirmer</Label>
            <Input {...register('confirm')} type="password" placeholder="••••••••"
              className="bg-[#1A1D25] border-[#2A2D38] text-white focus:border-[#4F6EF7] h-11 rounded-xl" />
            {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm.message}</p>}
          </div>

          <Button type="submit" disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-[#4F6EF7] to-[#7C3AED] hover:opacity-90 text-white font-semibold rounded-xl border-0 mt-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer mon compte'}
          </Button>
        </form>

        <div className="text-center mt-5 text-sm text-[#8892A4]">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-[#4F6EF7] hover:underline">Se connecter →</Link>
        </div>
      </div>
    </div>
  )
}