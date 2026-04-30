"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Phone, Lock } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

type ShippingMethod = 'standard' | 'express'
type PaymentMethod = 'bancontact' | 'belfius' | 'card' | 'gpay' | 'kbc' | 'paypal' | 'bank' | 'chorus'

function formatCurrency(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function StepBadge({ number, label, done, active, href }: { number: number; label: string; done?: boolean; active?: boolean; href?: string }) {
  const inner = (
    <div className={`flex items-center gap-2 text-sm font-semibold ${active ? 'text-[#2ad1a4]' : done ? 'text-white/80' : 'text-white/40'}`}>
      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-[#2ad1a4] text-[#1a3a52]' : done ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
        {done ? '✓' : number}
      </div>
      {label}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading, isAdmin, logout } = useAuth()
  const { items, totalPrice } = useCart()
  const profileHref = isAdmin ? '/admin' : '/client/profile'
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('belfius')
  const [openSection, setOpenSection] = useState<'address' | 'shipping' | 'payment'>('address')

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login?redirect=/checkout')
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const shippingPrice = shippingMethod === 'standard' ? 20 : 30
  const orderTotal = useMemo(() => totalPrice + shippingPrice, [shippingPrice, totalPrice])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d0d9e3] border-t-[#2ad1a4]" />
      </div>
    )
  }

  if (!isAuthenticated) return <div className="min-h-screen bg-[#f5f7fa]" />

  return (
    <div className="min-h-screen bg-[#f3f3f5] text-[#1a3a52]">
      <header className="bg-[#1a3a52] shadow-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Accueil" className="shrink-0">
            <Image src="/redsys-logo.png" alt="Redsys" width={140} height={40} className="h-10 w-auto" priority />
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <StepBadge number={1} label="Panier" done href="/cart" />
            <div className="h-px w-8 bg-white/30" />
            <StepBadge number={2} label="Paiement" active />
            <div className="h-px w-8 bg-white/30" />
            <StepBadge number={3} label="Confirmation" />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/cart"
              className="hidden items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 sm:flex"
            >
              ← Retour au panier
            </Link>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2ad1a4] text-sm font-black text-[#1a3a52]">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden max-w-[120px] truncate text-sm font-semibold text-white sm:inline">
                  {user?.name}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-[#d0d9e3] bg-white shadow-xl">
                  <Link
                    href={profileHref}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-[#1a3a52] transition hover:bg-[#f0fdf9]"
                  >
                    Mon profil
                  </Link>
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false) }}
                    className="flex w-full items-center gap-2 border-t border-[#eef1f5] px-4 py-3 text-sm text-red-500 transition hover:bg-red-50"
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-black tracking-tight text-black">Commander</h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-4">
            <AccordionSection
              id="address"
              title="Adresse de livraison"
              open={openSection === 'address'}
              onToggle={() => setOpenSection('address')}
            >
              <div className="space-y-4">
                <Field label="Adresse email" type="email" required placeholder="exemple@adresse.com" />
                <Field label="Société (pas de vente aux particuliers)" placeholder="" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prénom" />
                  <Field label="Nom" />
                </div>
                <Field label="Adresse" required />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Code postal" required />
                  <Field label="Ville" />
                </div>
                <Field label="Pays" defaultValue="France" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nr. De Téléphone" required />
                  <Field label="Adresse e-mail de facture" type="email" />
                </div>
                <Field label="Numéro de TVA" />
                <Field label="Numéro de bon de commande" />
                <label className="inline-flex items-center gap-2 text-sm text-[#37495f]">
                  <input type="checkbox" className="h-4 w-4 rounded border-[#bfc6d1]" />
                  Bon de livraison neutre
                </label>
              </div>
            </AccordionSection>

            <AccordionSection
              id="shipping"
              title="Modes de livraison"
              open={openSection === 'shipping'}
              onToggle={() => setOpenSection('shipping')}
              summary={shippingMethod === 'standard' ? 'Standard 4-5 jours — 20,00 €' : 'Express 1-2 jours — 30,00 €'}
            >
              <div className="space-y-4">
                <ChoiceBlockInline
                  title="Modes de livraison"
                  choices={[
                    { id: 'standard', labelLeft: '20,00 €', labelMain: 'UPS / Fedex', labelRight: 'Livraison standard 4-5 jours' },
                    { id: 'express', labelLeft: '30,00 €', labelMain: 'UPS / Fedex', labelRight: 'Livraison Express 1-2 jours' },
                  ]}
                  value={shippingMethod}
                  onChange={(value) => setShippingMethod(value as ShippingMethod)}
                />
              </div>
            </AccordionSection>

            <AccordionSection
              id="payment"
              title="Modes de paiement"
              open={openSection === 'payment'}
              onToggle={() => setOpenSection('payment')}
              summary={paymentMethod}
            >
              <div className="space-y-4">
                <ChoiceBlockInline
                  title="Modes de paiement"
                  choices={[
                    { id: 'bancontact', labelMain: 'Bancontact', icon: paymentIcons.bancontact },
                    { id: 'belfius', labelMain: 'Belfius', icon: paymentIcons.belfius },
                    { id: 'card', labelMain: 'Carte Bancaires', icon: paymentIcons.card },
                    { id: 'gpay', labelMain: 'Google Pay', icon: paymentIcons.gpay },
                    { id: 'kbc', labelMain: 'KBC/CBC', icon: paymentIcons.kbc },
                    { id: 'paypal', labelMain: 'PayPal', icon: paymentIcons.paypal },
                    { id: 'bank', labelMain: 'Virement bancaire préalable', icon: paymentIcons.bank },
                    { id: 'chorus', labelMain: 'Chorus Pro', icon: paymentIcons.chorus },
                  ]}
                  value={paymentMethod}
                  onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                />
              </div>
            </AccordionSection>
          </section>

          <aside className="h-fit rounded-xl border border-[#d6d8dc] bg-white">
            <div className="bg-[#1a3a52] px-5 py-3 text-lg font-bold text-white">Résumé de la commande</div>
            <div className="space-y-5 p-5">
              {items.map((item) => {
                const qty = item.quantity
                let lineTotal = 0
                if (item.type === 'configurable') {
                  const optionsTotal = item.options.reduce((s, o) => s + o.price, 0)
                  lineTotal = (item.basePrice + optionsTotal) * qty
                } else if (item.type === 'standard') {
                  lineTotal = item.price * qty
                } else {
                  lineTotal = item.price * qty
                }

                return (
                  <div key={`${item.type}-${item.modelId}`} className="flex items-start gap-4">
                    <div className="h-14 w-14 overflow-hidden rounded border border-[#d6d8dc] bg-white">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} width={56} height={56} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#91a2b5]">Image</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#1a3a52]">{item.name}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#5a7a9a]">x{qty}</span>
                        <span className="ml-auto text-sm font-semibold">{formatCurrency(lineTotal)}</span>
                      </div>

                      {item.type === 'configurable' && (
                        <ul className="mt-2 space-y-1 text-xs text-[#5a7a9a]">
                          {item.options.map((opt, i) => (
                            <li key={`${item.modelId}-opt-${i}`}>{opt.label} +{formatCurrency(opt.price)}</li>
                          ))}
                        </ul>
                      )}

                      {item.type === 'spare' && item.compatibleModelName && (
                        <div className="mt-2 inline-flex rounded-full bg-[#f3f4f6] px-2 py-1 text-xs text-[#566270]">Compatible avec {item.compatibleModelName}</div>
                      )}
                    </div>
                  </div>
                )
              })}

              <div className="border-t border-[#e2e7ed] pt-4 text-sm">
                <div className="flex items-center justify-between py-2">
                  <span>Sous-total</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>Livraison</span>
                  <span>{formatCurrency(shippingPrice)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[#e2e7ed] pt-3 text-xl font-black text-black">
                  <span>Total de la commande</span>
                  <span>{formatCurrency(orderTotal)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Entrez le code de réduction"
                  className="h-11 flex-1 rounded border border-[#bfc6d1] px-3 text-sm outline-none focus:ring-2 focus:ring-[#2ad1a4]/40"
                />
                <button
                  type="button"
                  className="h-11 rounded bg-[#e6eaef] px-4 font-semibold text-[#1a3a52] transition hover:bg-[#dce3eb]"
                >
                  Appliquer
                </button>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-[#42566f]">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#bfc6d1]" />
                S&apos;abonner à la newsletter
              </label>

              <button
                type="button"
                className="h-12 w-full rounded-xl bg-[#2ad1a4] text-base font-bold text-[#1a3a52] shadow-md transition hover:bg-[#20b890] hover:shadow-lg flex items-center justify-center gap-3"
              >
                <Lock className="h-4 w-4" />
                Passer la commande
              </button>

              <div className="rounded-lg border border-[#d6d8dc] p-4 text-[#1a3a52]">
                <h3 className="text-base font-semibold">Avez-vous besoin d&apos;aide ?</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> +33 1 87 65 31 84</p>
                  <p className="inline-flex items-center gap-2"><Mail className="h-4 w-4" /> sales@renewtech.com</p>
                </div>
                <div className="mt-4 flex gap-4 text-xs text-[#667a92]">
                  <span className="hover:text-[#1a3a52] cursor-pointer">Livraison</span>
                  <span className="hover:text-[#1a3a52] cursor-pointer">Retours</span>
                  <span className="hover:text-[#1a3a52] cursor-pointer">CGV</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-4 text-xs text-[#607286]">
                <div className="inline-flex items-center gap-1.5">SSL 256-bit</div>
                <div className="inline-flex items-center gap-1.5">Données protégées</div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Field({ label, type = 'text', required, placeholder, defaultValue }: { label: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#37495f]">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-lg border border-[#bfc6d1] bg-white px-3 text-sm text-[#1a3a52] outline-none transition focus:border-[#2ad1a4] focus:ring-2 focus:ring-[#2ad1a4]/20"
      />
    </label>
  )
}

const paymentIcons: Record<string, React.ReactNode> = {
  bancontact: (
    <svg viewBox="0 0 40 24" className="h-6 w-10" fill="none">
      <rect width="40" height="24" rx="4" fill="#005498"/>
      <rect x="20" width="20" height="24" rx="0" fill="#FFCB00"/>
      <text x="5" y="16" fontSize="8" fill="white" fontWeight="bold">BC</text>
    </svg>
  ),
  belfius: (
    <svg viewBox="0 0 40 24" className="h-6 w-10" fill="none">
      <rect width="40" height="24" rx="4" fill="#CC0033"/>
      <text x="4" y="16" fontSize="7" fill="white" fontWeight="bold">BELFIUS</text>
    </svg>
  ),
  card: (
    <svg viewBox="0 0 40 24" className="h-6 w-10" fill="none">
      <rect width="40" height="24" rx="4" fill="#1A1F71"/>
      <circle cx="15" cy="12" r="7" fill="#EB001B" opacity="0.9"/>
      <circle cx="25" cy="12" r="7" fill="#F79E1B" opacity="0.9"/>
      <ellipse cx="20" cy="12" rx="3" ry="7" fill="#FF5F00"/>
    </svg>
  ),
  gpay: (
    <svg viewBox="0 0 40 24" className="h-6 w-10" fill="none">
      <rect width="40" height="24" rx="4" fill="#f8f9fa" stroke="#e0e0e0" strokeWidth="1"/>
      <text x="4" y="16" fontSize="9" fontWeight="bold">
        <tspan fill="#4285F4">G</tspan>
        <tspan fill="#34A853">P</tspan>
        <tspan fill="#EA4335">a</tspan>
        <tspan fill="#FBBC05">y</tspan>
      </text>
    </svg>
  ),
  kbc: (
    <svg viewBox="0 0 40 24" className="h-6 w-10" fill="none">
      <rect width="40" height="24" rx="4" fill="#00833e"/>
      <text x="6" y="16" fontSize="8" fill="white" fontWeight="bold">KBC</text>
    </svg>
  ),
  paypal: (
    <svg viewBox="0 0 40 24" className="h-6 w-10" fill="none">
      <rect width="40" height="24" rx="4" fill="#003087"/>
      <text x="4" y="16" fontSize="8" fill="white" fontWeight="bold">PayPal</text>
    </svg>
  ),
  bank: (
    <svg viewBox="0 0 40 24" className="h-6 w-10" fill="none">
      <rect width="40" height="24" rx="4" fill="#f0f4f8" stroke="#d0d9e3" strokeWidth="1"/>
      <path d="M8 16V10M14 16V10M20 16V10M26 16V10M32 16V10M6 10L20 5L34 10H6zM6 17H34" 
            stroke="#1a3a52" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  chorus: (
    <svg viewBox="0 0 40 24" className="h-6 w-10" fill="none">
      <rect width="40" height="24" rx="4" fill="#003189"/>
      <text x="3" y="16" fontSize="7" fill="white" fontWeight="bold">CHORUS</text>
    </svg>
  ),
}

function AccordionSection({
  id,
  title,
  open,
  onToggle,
  children,
  summary,
}: {
  id: string
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  summary?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#d6d8dc] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-[#1a3a52] px-5 py-4 text-left transition hover:bg-[#1f4570]"
      >
        <span className="text-base font-bold text-white">{title}</span>
        <div className="flex items-center gap-3">
          {!open && summary && (
            <span className="text-xs text-white/60">{summary}</span>
          )}
          <svg
            className={`h-5 w-5 text-white/70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="p-5">
          {children}
        </div>
      )}
    </div>
  )
}

function ChoiceBlock({
  title,
  choices,
  value,
  onChange,
}: {
  title: string
  choices: Array<{ id: string; labelLeft?: string; labelMain: string; labelRight?: string }>
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#d6d8dc] bg-white">
      <div className="bg-[#1a3a52] px-5 py-3 text-base font-bold text-white">{title}</div>
      <div>
        {choices.map((choice) => {
          const selected = value === choice.id
          return (
            <label key={choice.id} className={`flex cursor-pointer items-center gap-4 border-t border-[#e2e7ed] px-5 py-4 text-sm ${selected ? 'bg-[#f0fdf9] border-l-2 border-[#2ad1a4]' : ''}`}>
              <input
                type="radio"
                name={title}
                checked={selected}
                onChange={() => onChange(choice.id)}
                className="h-4 w-4 accent-[#2ad1a4]"
              />
              {choice.labelLeft && <span className="w-28 font-semibold text-[#273f59]">{choice.labelLeft}</span>}
              <span className="min-w-36">{choice.labelMain}</span>
              {choice.labelRight && <span className="text-[#4a6179]">{choice.labelRight}</span>}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function ChoiceBlockInline({
  title,
  choices,
  value,
  onChange,
}: {
  title: string
  choices: Array<{ id: string; labelLeft?: string; labelMain: string; labelRight?: string; icon?: React.ReactNode }>
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div>
      {choices.map((choice) => {
        const selected = value === choice.id
        return (
          <label key={choice.id} className={`flex cursor-pointer items-center gap-4 border-b border-[#e2e7ed] px-0 py-4 text-sm last:border-0 ${selected ? 'bg-[#f0fdf9]' : ''}`}>
            <input
              type="radio"
              name={title}
              checked={selected}
              onChange={() => onChange(choice.id)}
              className="h-4 w-4 accent-[#2ad1a4]"
            />
            {choice.icon && <span className="shrink-0">{choice.icon}</span>}
            {choice.labelLeft && <span className="w-28 font-semibold text-[#273f59]">{choice.labelLeft}</span>}
            <span className="flex-1 font-medium text-[#1a3a52]">{choice.labelMain}</span>
            {choice.labelRight && <span className="text-xs text-[#4a6179]">{choice.labelRight}</span>}
          </label>
        )
      })}
    </div>
  )
}
