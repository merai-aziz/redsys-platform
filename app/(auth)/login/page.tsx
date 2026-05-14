'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Layers, ArrowRight, Shield, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { login } = useAuth()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const result = await login(data.email, data.password)
      if (!result.success) {
        toast.error(result.error || 'Erreur de connexion')
        return
      }

      toast.success('Connexion réussie !')
      router.refresh()
      await new Promise((resolve) => setTimeout(resolve, 100))
      if (result.user?.role === 'admin') {
        await router.push('/admin/catalog')
        return
      }

      if (result.user?.role === 'employee') {
        await router.push('/employee/tickets')
        return
      }

      await router.push(redirect)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');

        .sys-font  { font-family: 'JetBrains Mono', monospace; }
        .hud-font  { font-family: 'Rajdhani', sans-serif; }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes hud-scan {
          0%   { transform: translateY(-100%); opacity: 0.6; }
          100% { transform: translateY(400%); opacity: 0; }
        }
        .hud-scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent);
          animation: hud-scan 3s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes glow-border {
          0%,100% { box-shadow: 0 0 20px rgba(0,212,255,0.1), inset 0 0 20px rgba(0,212,255,0.03); }
          50%     { box-shadow: 0 0 40px rgba(0,212,255,0.2), inset 0 0 40px rgba(0,212,255,0.05); }
        }

        @keyframes input-focus-glow {
          from { box-shadow: 0 0 0 0 rgba(0,212,255,0.4); }
          to   { box-shadow: 0 0 0 8px rgba(0,212,255,0); }
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slide-up 0.4s ease-out both; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.1s; }
        .d3 { animation-delay: 0.15s; }
        .d4 { animation-delay: 0.2s; }
        .d5 { animation-delay: 0.25s; }

        .card-main {
          background: linear-gradient(135deg,
            rgba(8,12,30,0.95) 0%,
            rgba(12,16,40,0.92) 100%
          );
          backdrop-filter: blur(32px);
          border: 1px solid rgba(0,212,255,0.15);
          animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both, glow-border 4s ease-in-out infinite 0.6s;
          position: relative;
          overflow: hidden;
        }
        .card-main:hover {
          border-color: rgba(0,212,255,0.3);
        }

        /* HUD corner brackets */
        .corner { position: absolute; width: 20px; height: 20px; pointer-events: none; z-index: 10; }
        .corner::before, .corner::after { content: ''; position: absolute; background: #00d4ff; opacity: 0.8; }
        .corner::before { width: 2px; height: 100%; }
        .corner::after  { width: 100%; height: 2px; }
        .c-tl { top: 0; left: 0; }
        .c-tr { top: 0; right: 0; transform: scaleX(-1); }
        .c-bl { bottom: 0; left: 0; transform: scaleY(-1); }
        .c-br { bottom: 0; right: 0; transform: scale(-1,-1); }

        .sys-input {
          width: 100%;
          height: 44px;
          background: rgba(8,12,30,0.8) !important;
          border: 1px solid rgba(99,102,241,0.2) !important;
          border-radius: 6px;
          color: #e2e8f0 !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 13px !important;
          padding: 0 12px;
          transition: all 0.2s ease;
        }
        .sys-input:focus {
          border-color: #00d4ff !important;
          background: rgba(0,212,255,0.04) !important;
          box-shadow: 0 0 0 1px rgba(0,212,255,0.15), 0 0 24px rgba(0,212,255,0.08) !important;
          outline: none !important;
        }
        .sys-input::placeholder { color: rgba(100,116,139,0.5) !important; font-size: 12px !important; }

        .sys-btn {
          width: 100%;
          height: 46px;
          border-radius: 8px;
          border: 1px solid rgba(0,212,255,0.3);
          background: linear-gradient(135deg, rgba(0,30,60,0.8), rgba(0,50,100,0.6));
          color: white;
          font-family: 'Rajdhani', sans-serif;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .sys-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #0ea5e9, #0284c7);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .sys-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .sys-btn:hover::before { opacity: 1; }
        .sys-btn:hover::after { transform: translateX(100%); }
        .sys-btn:hover {
          box-shadow: 0 0 30px rgba(14,165,233,0.4), 0 0 60px rgba(14,165,233,0.15);
          transform: translateY(-1px);
        }
        .sys-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .sys-btn > * { position: relative; z-index: 1; }

        .feature-card {
          background: rgba(8,12,30,0.6);
          border: 1px solid rgba(99,102,241,0.12);
          border-radius: 10px;
          padding: 16px;
          transition: all 0.3s ease;
          backdrop-filter: blur(8px);
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,212,255,0.03), transparent);
          opacity: 0; transition: opacity 0.3s ease;
        }
        .feature-card:hover {
          border-color: rgba(0,212,255,0.25);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 20px rgba(0,212,255,0.05);
        }
        .feature-card:hover::before { opacity: 1; }

        @keyframes status-blink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.3; }
        }

        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent);
        }
      `}</style>

      <div className="w-full">
        {/* Card */}
        <div className="card-main rounded-2xl shadow-2xl">
          {/* HUD corners */}
          <div className="corner c-tl" />
          <div className="corner c-tr" />
          <div className="corner c-bl" />
          <div className="corner c-br" />

          {/* Scan line animation */}
          <div className="hud-scan-line" />

          {/* Top accent line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />

          <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="mb-8 slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-xl flex items-center justify-center">
                    <Layers className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400" style={{ animation: 'status-blink 2s ease-in-out infinite', boxShadow: '0 0 8px #4ade80' }} />
                </div>
                <div>
                  <div className="hud-font text-xl font-bold text-white tracking-widest">REDSYS</div>
                  <div className="sys-font text-[9px] text-cyan-400/60 tracking-[0.2em]">INFRASTRUCTURE PLATFORM</div>
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="hud-font text-3xl font-bold text-white tracking-wide">ACCÈS SYSTÈME</h1>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(0,212,255,0.5), transparent)' }} />
                  <span className="sys-font text-[9px] text-cyan-400/50 tracking-[0.2em]">AUTH MODULE v2.4</span>
                </div>
                <p className="sys-font text-xs text-slate-400/70">Authentification sécurisée · TLS 1.3</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-2 slide-up d1">
                <label className="sys-font text-[10px] tracking-[0.2em] text-slate-400/70 uppercase block">
                  // identifiant_réseau
                </label>
                <div className="relative">
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="user@redsys.tn"
                    className="sys-input"
                  />
                </div>
                {errors.email && (
                  <p className="sys-font text-[10px] text-red-400/80 flex items-center gap-1.5 mt-1">
                    <span className="text-red-400">!</span> {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2 slide-up d2">
                <label className="sys-font text-[10px] tracking-[0.2em] text-slate-400/70 uppercase block">
                  // clé_d_accès
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    className="sys-input"
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="sys-font text-[10px] text-red-400/80 flex items-center gap-1.5 mt-1">
                    <span className="text-red-400">!</span> {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="pt-2 slide-up d3">
                <button type="submit" disabled={submitting} className="sys-btn">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AUTHENTIFICATION...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>CONNEXION SÉCURISÉE</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="divider-line flex-1" />
              <span className="sys-font text-[10px] text-slate-600">SYS</span>
              <div className="divider-line flex-1" />
            </div>

            {/* Sign up link */}
            <div className="text-center slide-up d4">
              <span className="sys-font text-xs text-slate-500">NOUVEL OPÉRATEUR? </span>
              <Link
                href="/register"
                className="sys-font text-xs text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 font-semibold group"
              >
                CRÉER UN ACCÈS
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        </div>

        {/* Feature cards */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="feature-card slide-up d3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Server className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="hud-font text-sm font-semibold text-slate-200 tracking-wide">Infrastructure</p>
                <p className="sys-font text-[10px] text-slate-500">Gestion centralisée</p>
              </div>
            </div>
          </div>
          <div className="feature-card slide-up d4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="hud-font text-sm font-semibold text-slate-200 tracking-wide">Sécurisé</p>
                <p className="sys-font text-[10px] text-slate-500">Protection maximale</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}