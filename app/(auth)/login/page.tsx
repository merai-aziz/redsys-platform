'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()

      if (!res.ok) {
        if (res.status === 401) toast.error('Email ou mot de passe incorrect')
        else toast.error(json.error || 'Erreur de connexion')
        return
      }

      toast.success('Connexion réussie !')
      const role = json.user.role
      if (role === 'ADMIN') window.location.assign('/admin/logs')
      else if (role === 'EMPLOYEE') window.location.assign('/employee/profile')
      else window.location.assign('/client/profile')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md px-4">
      <div className="bg-[#111318] border border-[#2A2D38] rounded-2xl p-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Label className="text-xs text-[#8892A4] uppercase tracking-wider mb-2 block">
              Adresse email
            </Label>
            <Input
              {...register('email')}
              type="email"
              placeholder="exemple@redsys.com"
              className="bg-[#1A1D25] border-[#2A2D38] text-white placeholder:text-[#4A5060] 
                         focus:border-[#4F6EF7] h-11 rounded-xl"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label className="text-xs text-[#8892A4] uppercase tracking-wider mb-2 block">
              Mot de passe
            </Label>
            <div className="relative">
              <Input
                {...register('password')}
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                className="bg-[#1A1D25] border-[#2A2D38] text-white placeholder:text-[#4A5060]
                           focus:border-[#4F6EF7] h-11 rounded-xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892A4]"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-[#4F6EF7] to-[#7C3AED] 
                       hover:opacity-90 text-white font-semibold rounded-xl border-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Se connecter'}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-[#8892A4]">
          Nouveau client ?{' '}
          <Link href="/register" className="text-[#4F6EF7] hover:underline">
            Créer un compte →
          </Link>
        </div>
      </div>
    </div>
  )
}