'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { Layers, Loader2, ArrowRight, Check, Building2, Shield, HeadphonesIcon } from 'lucide-react'
import { toast } from 'sonner'

const schema = z.object({
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  adresse: z.string().optional(),
  companyName: z.string().min(2, 'Nom de société requis'),
  password: z.string().min(8, 'Min. 8 caractères'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Mots de passe différents', path: ['confirm']
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const password = watch('password')

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
      toast.success('Inscription réussie. Vous pouvez maintenant vous connecter.')
      window.location.assign('/login')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = password ?
    (password.length >= 12 ? 'strong' : password.length >= 8 ? 'medium' : 'weak')
    : null

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
          0%   { transform: translateY(-100%); opacity: 0.5; }
          100% { transform: translateY(600%); opacity: 0; }
        }
        .hud-scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent);
          animation: hud-scan 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes glow-border-purple {
          0%,100% { box-shadow: 0 0 20px rgba(124,58,237,0.1), inset 0 0 20px rgba(124,58,237,0.02); }
          50%     { box-shadow: 0 0 50px rgba(124,58,237,0.2), inset 0 0 30px rgba(124,58,237,0.04); }
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slide-up 0.4s ease-out both; }
        .d0 { animation-delay: 0s; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.1s; }
        .d3 { animation-delay: 0.15s; }
        .d4 { animation-delay: 0.2s; }
        .d5 { animation-delay: 0.25s; }
        .d6 { animation-delay: 0.3s; }
        .d7 { animation-delay: 0.35s; }
        .d8 { animation-delay: 0.4s; }

        .card-main {
          background: linear-gradient(135deg,
            rgba(12,8,30,0.96) 0%,
            rgba(16,10,38,0.93) 100%
          );
          backdrop-filter: blur(32px);
          border: 1px solid rgba(124,58,237,0.18);
          animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both, glow-border-purple 5s ease-in-out infinite 0.6s;
          position: relative;
          overflow: hidden;
        }
        .card-main:hover {
          border-color: rgba(124,58,237,0.35);
        }

        /* HUD corners — violet theme */
        .corner { position: absolute; width: 20px; height: 20px; pointer-events: none; z-index: 10; }
        .corner::before, .corner::after { content: ''; position: absolute; background: #a78bfa; opacity: 0.7; }
        .corner::before { width: 2px; height: 100%; }
        .corner::after  { width: 100%; height: 2px; }
        .c-tl { top: 0; left: 0; }
        .c-tr { top: 0; right: 0; transform: scaleX(-1); }
        .c-bl { bottom: 0; left: 0; transform: scaleY(-1); }
        .c-br { bottom: 0; right: 0; transform: scale(-1,-1); }

        .sys-input {
          width: 100%;
          height: 40px;
          background: rgba(12,8,30,0.8) !important;
          border: 1px solid rgba(124,58,237,0.2) !important;
          border-radius: 6px;
          color: #e2e8f0 !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 12px !important;
          padding: 0 10px;
          transition: all 0.2s ease;
        }
        .sys-input:focus {
          border-color: #a78bfa !important;
          background: rgba(124,58,237,0.05) !important;
          box-shadow: 0 0 0 1px rgba(124,58,237,0.2), 0 0 20px rgba(124,58,237,0.08) !important;
          outline: none !important;
        }
        .sys-input::placeholder { color: rgba(100,116,139,0.45) !important; font-size: 11px !important; }

        .sys-btn-register {
          width: 100%;
          height: 46px;
          border-radius: 8px;
          border: 1px solid rgba(124,58,237,0.4);
          background: linear-gradient(135deg, rgba(20,8,50,0.9), rgba(40,15,90,0.7));
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
        .sys-btn-register::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #7c3aed, #ec4899);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .sys-btn-register::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .sys-btn-register:hover::before { opacity: 1; }
        .sys-btn-register:hover::after { transform: translateX(100%); }
        .sys-btn-register:hover {
          box-shadow: 0 0 30px rgba(124,58,237,0.5), 0 0 60px rgba(124,58,237,0.15);
          transform: translateY(-1px);
        }
        .sys-btn-register:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .sys-btn-register > * { position: relative; z-index: 1; }

        .feature-card {
          background: rgba(12,8,30,0.6);
          border: 1px solid rgba(124,58,237,0.12);
          border-radius: 10px;
          padding: 14px;
          transition: all 0.3s ease;
          backdrop-filter: blur(8px);
          position: relative;
          overflow: hidden;
        }
        .feature-card:hover {
          transform: translateY(-2px);
        }
        .fc-purple:hover { border-color: rgba(124,58,237,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 20px rgba(124,58,237,0.06); }
        .fc-pink:hover   { border-color: rgba(236,72,153,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 20px rgba(236,72,153,0.06); }
        .fc-blue:hover   { border-color: rgba(59,130,246,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 20px rgba(59,130,246,0.06); }

        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent);
        }

        @keyframes status-blink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.2; }
        }

        /* Step indicator */
        .step-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(124,58,237,0.3);
          border: 1px solid rgba(124,58,237,0.4);
          transition: all 0.2s ease;
        }
        .step-dot.active {
          background: #a78bfa;
          box-shadow: 0 0 8px rgba(167,139,250,0.6);
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

          {/* Scan line */}
          <div className="hud-scan-line" />

          {/* Top accent */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-70" />

          <div className="p-8 sm:p-9">
            {/* Header */}
            <div className="mb-7 slide-up d0">
              <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-pink-600/20 border border-violet-500/30 rounded-xl flex items-center justify-center">
                    <Layers className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400" style={{ animation: 'status-blink 2.5s ease-in-out infinite', boxShadow: '0 0 8px #34d399' }} />
                </div>
                <div>
                  <div className="hud-font text-xl font-bold text-white tracking-widest">REDSYS</div>
                  <div className="sys-font text-[9px] text-violet-400/60 tracking-[0.2em]">NEW OPERATOR REGISTRATION</div>
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="hud-font text-2xl font-bold text-white tracking-wide">CRÉER UN COMPTE</h1>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.6), transparent)' }} />
                  <span className="sys-font text-[9px] text-violet-400/50 tracking-[0.15em]">REGISTER MODULE</span>
                </div>
                <p className="sys-font text-[11px] text-slate-400/60">Rejoignez la plateforme Redsys Infrastructure</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Section: Identité */}
              <div className="slide-up d1">
                <div className="sys-font text-[9px] text-violet-400/50 tracking-[0.2em] mb-2 uppercase">// 01 · identité_opérateur</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="sys-font text-[9px] tracking-widest text-slate-500 uppercase block">Prénom</label>
                    <input {...register('firstName')} placeholder="Mohamed" className="sys-input" />
                    {errors.firstName && <p className="sys-font text-[9px] text-red-400/80">! {errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="sys-font text-[9px] tracking-widest text-slate-500 uppercase block">Nom</label>
                    <input {...register('lastName')} placeholder="Ben Salem" className="sys-input" />
                    {errors.lastName && <p className="sys-font text-[9px] text-red-400/80">! {errors.lastName.message}</p>}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5 slide-up d2">
                <label className="sys-font text-[9px] tracking-widest text-slate-500 uppercase block">// email_réseau</label>
                <input {...register('email')} type="email" placeholder="contact@societe.tn" className="sys-input" />
                {errors.email && <p className="sys-font text-[9px] text-red-400/80">! {errors.email.message}</p>}
              </div>

              {/* Contact */}
              <div className="slide-up d3">
                <div className="sys-font text-[9px] text-violet-400/50 tracking-[0.2em] mb-2 uppercase">// 02 · coordonnées</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="sys-font text-[9px] tracking-widest text-slate-500 uppercase block">Téléphone</label>
                    <input {...register('phone')} placeholder="+216 XX XXX XXX" className="sys-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="sys-font text-[9px] tracking-widest text-slate-500 uppercase block">Localisation</label>
                    <input {...register('adresse')} placeholder="Tunis" className="sys-input" />
                  </div>
                </div>
              </div>

              {/* Company */}
              <div className="space-y-1.5 slide-up d4">
                <label className="sys-font text-[9px] tracking-widest text-slate-500 uppercase block">// organisation</label>
                <input {...register('companyName')} placeholder="Votre organisation" className="sys-input" />
                {errors.companyName && <p className="sys-font text-[9px] text-red-400/80">! {errors.companyName.message}</p>}
              </div>

              {/* Password section */}
              <div className="slide-up d5">
                <div className="sys-font text-[9px] text-violet-400/50 tracking-[0.2em] mb-2 uppercase">// 03 · authentification</div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="sys-font text-[9px] tracking-widest text-slate-500 uppercase block">Mot de passe</label>
                    <input {...register('password')} type="password" placeholder="Min. 8 caractères" className="sys-input" />
                    {errors.password && <p className="sys-font text-[9px] text-red-400/80">! {errors.password.message}</p>}
                    {passwordStrength && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 rounded-full overflow-hidden bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: passwordStrength === 'strong' ? '100%' : passwordStrength === 'medium' ? '66%' : '33%',
                              background: passwordStrength === 'strong'
                                ? 'linear-gradient(90deg, #10b981, #34d399)'
                                : passwordStrength === 'medium'
                                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                : 'linear-gradient(90deg, #ef4444, #f87171)'
                            }}
                          />
                        </div>
                        <span className="sys-font text-[9px] text-slate-500">
                          {passwordStrength === 'strong' ? 'FORT' : passwordStrength === 'medium' ? 'MOYEN' : 'FAIBLE'}
                        </span>
                        {/* step dots */}
                        <div className="flex gap-1">
                          <div className={`step-dot ${passwordStrength === 'weak' || passwordStrength === 'medium' || passwordStrength === 'strong' ? 'active' : ''}`} />
                          <div className={`step-dot ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'active' : ''}`} />
                          <div className={`step-dot ${passwordStrength === 'strong' ? 'active' : ''}`} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="sys-font text-[9px] tracking-widest text-slate-500 uppercase block">Confirmer</label>
                    <input {...register('confirm')} type="password" placeholder="••••••••••••" className="sys-input" />
                    {errors.confirm && <p className="sys-font text-[9px] text-red-400/80">! {errors.confirm.message}</p>}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-1 slide-up d6">
                <button type="submit" disabled={loading} className="sys-btn-register">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ENREGISTREMENT...</span>
                    </>
                  ) : (
                    <>
                      <span>CRÉER MON ACCÈS</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="divider-line flex-1" />
              <span className="sys-font text-[9px] text-slate-600">SYS</span>
              <div className="divider-line flex-1" />
            </div>

            {/* Sign in link */}
            <div className="text-center slide-up d7">
              <span className="sys-font text-xs text-slate-500">DÉJÀ ENREGISTRÉ? </span>
              <Link
                href="/login"
                className="sys-font text-xs text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-1 font-semibold group"
              >
                SE CONNECTER
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        </div>

        {/* Feature cards */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="feature-card fc-purple slide-up d5">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-2">
              <Building2 className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <p className="hud-font text-xs font-semibold text-slate-200 tracking-wide">Entreprises</p>
            <p className="sys-font text-[9px] text-slate-500 mt-0.5">Gestion intégrée</p>
          </div>
          <div className="feature-card fc-pink slide-up d6">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-2">
              <Shield className="w-3.5 h-3.5 text-pink-400" />
            </div>
            <p className="hud-font text-xs font-semibold text-slate-200 tracking-wide">Sécurité</p>
            <p className="sys-font text-[9px] text-slate-500 mt-0.5">Standards élevés</p>
          </div>
          <div className="feature-card fc-blue slide-up d7">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-2">
              <HeadphonesIcon className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="hud-font text-xs font-semibold text-slate-200 tracking-wide">Support</p>
            <p className="sys-font text-[9px] text-slate-500 mt-0.5">Assistance 24/7</p>
          </div>
        </div>
      </div>
    </>
  )
}