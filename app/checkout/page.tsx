"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Phone, Lock } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

import { SHIPPING_RATES, VAT_RATE, SUPPORT_CONTACT } from '@/lib/constants'
import React from 'react'

type ShippingMethod = 'standard' | 'express'
type PaymentMethod = 'bancontact' | 'belfius' | 'card' | 'gpay' | 'kbc' | 'paypal' | 'bank' | 'chorus'

function formatCurrency(value: number) {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

const FORM_FIELDS_CONFIG = [
    { id: 'email', label: 'Adresse email', type: 'email', required: true, section: 'address', colSpan: 'full' },
    { id: 'company', label: 'Société', type: 'text', required: false, section: 'address', colSpan: 'full' },
    { id: 'firstName', label: 'Prénom', type: 'text', required: true, section: 'address', colSpan: 'half' },
    { id: 'lastName', label: 'Nom', type: 'text', required: true, section: 'address', colSpan: 'half' },
    { id: 'address', label: 'Adresse', type: 'text', required: true, section: 'address', colSpan: 'full' },
    { id: 'postalCode', label: 'Code postal', type: 'text', required: true, section: 'address', colSpan: 'half' },
    { id: 'city', label: 'Ville', type: 'text', required: true, section: 'address', colSpan: 'half' },
    { id: 'country', label: 'Pays', type: 'text', required: false, section: 'address', colSpan: 'full', defaultValue: 'France' },
    { id: 'phone', label: 'Numéro de téléphone', type: 'tel', required: true, section: 'address', colSpan: 'half' },
    { id: 'invoiceEmail', label: 'Adresse e-mail de facture', type: 'email', required: false, section: 'address', colSpan: 'half' },
    { id: 'vatNumber', label: 'Numéro de TVA', type: 'text', required: false, section: 'address', colSpan: 'full' },
    { id: 'orderNumber', label: 'Numéro de bon de commande', type: 'text', required: false, section: 'address', colSpan: 'full' },
]

const SHIPPING_METHODS_CONFIG = [
    { id: 'standard', labelMain: 'UPS / Fedex', labelRight: 'Livraison standard 4-5 jours', getPrice: () => SHIPPING_RATES.standard },
    { id: 'express', labelMain: 'UPS / Fedex', labelRight: 'Livraison Express 1-2 jours', getPrice: () => SHIPPING_RATES.express },
] as const

const PAYMENT_METHODS_CONFIG = [
    { id: 'bancontact', labelMain: 'Bancontact', iconId: 'bancontact' },
    { id: 'belfius', labelMain: 'Belfius', iconId: 'belfius' },
    { id: 'card', labelMain: 'Carte Bancaires', iconId: 'card' },
    { id: 'gpay', labelMain: 'Google Pay', iconId: 'gpay' },
    { id: 'kbc', labelMain: 'KBC/CBC', iconId: 'kbc' },
    { id: 'paypal', labelMain: 'PayPal', iconId: 'paypal' },
    { id: 'bank', labelMain: 'Virement bancaire préalable', iconId: 'bank' },
    { id: 'chorus', labelMain: 'Chorus Pro', iconId: 'chorus' },
] as const

const SECTIONS_CONFIG = [
    { id: 'address', title: 'Adresse de livraison', step: 2 },
    { id: 'shipping', title: 'Modes de livraison', step: 2 },
    { id: 'payment', title: 'Modes de paiement', step: 2 },
] as const

type Step = {
    number: number
    label: string
    href?: string
    active?: boolean
}

const STEPS_CONFIG: Step[] = [
    { number: 1, label: 'Panier', href: '/cart' },
    { number: 2, label: 'Paiement', active: true },
    { number: 3, label: 'Confirmation' },
]

const FOOTER_LINKS = [
    { label: 'Livraison', href: '/livraison' },
    { label: 'Retours', href: '/retours' },
    { label: 'CGV', href: '/cgv' },
] as const

export default function CheckoutPage() {
    const router = useRouter()
    const { user, isAuthenticated, loading, isAdmin, logout } = useAuth()
    const { items, totalPrice, clearCart } = useCart()
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const userMenuRef = useRef<HTMLDivElement>(null)

    const [submitting, setSubmitting] = useState(false)
    const [orderSuccess, setOrderSuccess] = useState(false)

    const initialFormData = useMemo(() => {
        const data: Record<string, any> = {}
        FORM_FIELDS_CONFIG.forEach(field => {
            data[field.id] = field.defaultValue || ''
        })
        data.neutralDelivery = false
        return data
    }, [])

    const [formData, setFormData] = useState(initialFormData)
    const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(SHIPPING_METHODS_CONFIG[0].id)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS_CONFIG[0].id)
    const [openSection, setOpenSection] = useState<typeof SECTIONS_CONFIG[number]['id']>('address')

    const shippingPrice = SHIPPING_RATES[shippingMethod]
    const subtotal = totalPrice
    const tax = subtotal * VAT_RATE
    const orderTotal = subtotal + tax + shippingPrice

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
            if (event.key === 'Escape') setUserMenuOpen(false)
        }
        document.addEventListener('mousedown', handlePointerDown)
        window.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
            window.removeEventListener('keydown', handleEscape)
        }
    }, [])

    const validateForm = () => {
        const requiredFields = FORM_FIELDS_CONFIG.filter(field => field.required)
        for (const field of requiredFields) {
            if (!formData[field.id]) {
                toast.error(`Veuillez remplir le champ : ${field.label}`)
                return false
            }
        }
        return true
    }

    async function handleSubmitOrder() {
        if (!validateForm()) return
        if (items.length === 0) { toast.error('Votre panier est vide'); return }
        setSubmitting(true)
        try {
            const orderItems = items.map((item) => {
                if (item.type === 'configurable') {
                    const optTotal = (item.options ?? []).reduce((s, o) => s + o.price, 0)
                    const unitPrice = item.basePrice + optTotal
                    return { productId: null, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity, description: `${item.name} (configuré)` }
                }
                return { productId: (item as any).productId || null, quantity: item.quantity, unitPrice: item.price, lineTotal: item.price * item.quantity, description: item.name }
            })
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: orderItems, shippingMethod, paymentMethod, shippingAddress: formData, subtotal, tax, shipping: shippingPrice, total: orderTotal }),
            })
            if (!res.ok) { const data = await res.json(); toast.error(data.error ?? 'Erreur lors de la commande'); return }
            clearCart()
            setOrderSuccess(true)
            toast.success('Commande passée avec succès !')
            router.push('/client/orders')
        } catch {
            toast.error('Erreur réseau, réessayez.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d0d9e3] border-t-[#2ad1a4]" />
            </div>
        )
    }

    if (!isAuthenticated) return <div className="min-h-screen bg-[#f3f3f5]" />

    const profileHref = isAdmin ? '/admin' : '/client/profile'
    const orderHref = isAdmin ? '/admin/orders' : '/client/orders'

    const renderFormFields = () => {
        const fields = FORM_FIELDS_CONFIG.filter(field => field.section === 'address')
        const rows = []
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i]
            if (field.colSpan === 'full') {
                rows.push(
                    <div key={field.id} className="col-span-full">
                        <Field label={field.label} type={field.type} required={field.required} value={formData[field.id]} onChange={(v) => setFormData(p => ({ ...p, [field.id]: v }))} />
                    </div>
                )
            } else if (field.colSpan === 'half') {
                const nextField = fields[i + 1]
                if (nextField?.colSpan === 'half') {
                    rows.push(
                        <div key={`${field.id}-${nextField.id}`} className="grid gap-4 sm:grid-cols-2 col-span-full">
                            <Field label={field.label} type={field.type} required={field.required} value={formData[field.id]} onChange={(v) => setFormData(p => ({ ...p, [field.id]: v }))} />
                            <Field label={nextField.label} type={nextField.type} required={nextField.required} value={formData[nextField.id]} onChange={(v) => setFormData(p => ({ ...p, [nextField.id]: v }))} />
                        </div>
                    )
                    i++
                }
            }
        }
        return rows
    }

    return (
        <div className="min-h-screen bg-[#f3f3f5] text-[#1a3a52]">

            {/* ── HEADER responsive ── */}
            <header className="bg-[#1a3a52] shadow-lg">
                <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">

                    {/* Ligne principale : logo + user */}
                    <div className="flex h-14 items-center justify-between gap-3 sm:h-16">

                        {/* Logo */}
                        <Link href="/" aria-label="Accueil" className="shrink-0">
                            <Image src="/redsys-logo.png" alt="Redsys" width={120} height={36} className="h-8 w-auto sm:h-10" priority />
                        </Link>

                        {/* Étapes — masquées sur très petit mobile, visibles dès sm */}
                        <div className="hidden items-center gap-2 sm:flex sm:gap-3">
                            {STEPS_CONFIG.map((step, idx) => (
                                <React.Fragment key={step.number}>
                                    {idx > 0 && <div className="h-px w-4 bg-white/30 sm:w-8" />}
                                    <StepBadge number={step.number} label={step.label} active={step.active} done={!step.active && step.number === 1} href={step.href} />
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Droite : retour panier + user */}
                        <div className="flex shrink-0 items-center gap-2">
                            <Link
                                href="/cart"
                                className="hidden items-center gap-1 rounded-full border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 sm:flex"
                            >
                                ← Panier
                            </Link>

                            <div ref={userMenuRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setUserMenuOpen((v) => !v)}
                                    className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1.5 transition hover:bg-white/20 sm:px-3"
                                >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2ad1a4] text-xs font-black text-[#1a3a52] sm:h-8 sm:w-8 sm:text-sm">
                                        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="hidden max-w-[90px] truncate text-xs font-semibold text-white sm:inline sm:max-w-[120px] sm:text-sm">
                                        {user?.name || user?.email}
                                    </span>
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-[#d0d9e3] bg-white shadow-xl sm:w-48">
                                        <Link href={profileHref} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-[#1a3a52] transition hover:bg-[#f0fdf9]">
                                            Mon profil
                                        </Link>
                                        <Link href={orderHref} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-[#1a3a52] transition hover:bg-[#f0fdf9]">
                                            Mes commandes
                                        </Link>
                                        <button onClick={() => { logout(); setUserMenuOpen(false) }} className="flex w-full items-center gap-2 border-t border-[#eef1f5] px-4 py-3 text-sm text-red-500 transition hover:bg-red-50">
                                            Se déconnecter
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Étapes sur mobile — affichées en dessous sur xs */}
                    <div className="flex items-center justify-center gap-2 pb-2 sm:hidden">
                        {STEPS_CONFIG.map((step, idx) => (
                            <React.Fragment key={step.number}>
                                {idx > 0 && <div className="h-px w-5 bg-white/30" />}
                                <StepBadge number={step.number} label={step.label} active={step.active} done={!step.active && step.number === 1} href={step.href} />
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </header>

            {/* ── MAIN ── */}
            <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
                <h1 className="mb-4 text-2xl font-black tracking-tight text-black sm:mb-6 sm:text-3xl">
                    Commander
                </h1>

                {/* Grid : colonne unique sur mobile, deux colonnes sur lg */}
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">

                    {/* ── COLONNE GAUCHE : accordéons ── */}
                    <section className="space-y-3 sm:space-y-4">
                        {SECTIONS_CONFIG.map((section) => (
                            <AccordionSection
                                key={section.id}
                                id={section.id}
                                title={section.title}
                                open={openSection === section.id}
                                onToggle={() => setOpenSection(section.id)}
                                summary={
                                    section.id === 'shipping'
                                        ? `${shippingMethod === 'standard' ? 'Standard' : 'Express'} — ${formatCurrency(SHIPPING_RATES[shippingMethod])}`
                                        : section.id === 'payment'
                                            ? PAYMENT_METHODS_CONFIG.find(m => m.id === paymentMethod)?.labelMain || paymentMethod
                                            : undefined
                                }
                            >
                                {section.id === 'address' && (
                                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                        {renderFormFields()}
                                        <label className="inline-flex items-center gap-2 text-sm text-[#37495f]">
                                            <input
                                                type="checkbox"
                                                checked={formData.neutralDelivery}
                                                onChange={(e) => setFormData(p => ({ ...p, neutralDelivery: e.target.checked }))}
                                                className="h-4 w-4 rounded border-[#bfc6d1]"
                                            />
                                            Bon de livraison neutre
                                        </label>
                                    </div>
                                )}

                                {section.id === 'shipping' && (
                                    <ChoiceBlockInline
                                        title="Modes de livraison"
                                        choices={SHIPPING_METHODS_CONFIG.map(method => ({
                                            id: method.id,
                                            labelLeft: formatCurrency(method.getPrice()),
                                            labelMain: method.labelMain,
                                            labelRight: method.labelRight,
                                        }))}
                                        value={shippingMethod}
                                        onChange={(value) => setShippingMethod(value as ShippingMethod)}
                                    />
                                )}

                                {section.id === 'payment' && (
                                    <ChoiceBlockInline
                                        title="Modes de paiement"
                                        choices={PAYMENT_METHODS_CONFIG.map(method => ({
                                            id: method.id,
                                            labelMain: method.labelMain,
                                            icon: paymentIcons[method.iconId as keyof typeof paymentIcons],
                                        }))}
                                        value={paymentMethod}
                                        onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                                    />
                                )}
                            </AccordionSection>
                        ))}
                    </section>

                    {/* ── COLONNE DROITE : résumé commande ── */}
                    {/* Sur mobile : affiché EN DESSOUS des accordéons naturellement */}
                    {/* Sur lg : sticky à droite */}
                    <aside className="h-fit rounded-xl border border-[#d6d8dc] bg-white lg:sticky lg:top-4">
                        <div className="bg-[#1a3a52] px-4 py-3 text-base font-bold text-white sm:px-5 sm:text-lg">
                            Résumé de la commande
                        </div>
                        <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">

                            {/* Articles */}
                            {items.length === 0 ? (
                                <div className="py-6 text-center text-sm text-gray-500">Votre panier est vide</div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((item, idx) => {
                                        let lineTotal = 0
                                        if (item.type === 'configurable') {
                                            const optionsTotal = (item.options ?? []).reduce((s, o) => s + o.price, 0)
                                            lineTotal = (item.basePrice + optionsTotal) * item.quantity
                                        } else {
                                            lineTotal = item.price * item.quantity
                                        }
                                        return (
                                            <div key={`${item.type}-${(item as any).modelId || idx}`} className="flex items-start gap-3">
                                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-[#d6d8dc] bg-white sm:h-14 sm:w-14">
                                                    {item.image ? (
                                                        <Image src={item.image} alt={item.name} width={56} height={56} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-xs text-[#91a2b5]">Img</div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold leading-snug text-[#1a3a52]">{item.name}</p>
                                                    <div className="mt-0.5 flex items-center justify-between gap-2">
                                                        <span className="text-xs text-[#5a7a9a]">x{item.quantity}</span>
                                                        <span className="text-xs font-semibold sm:text-sm">{formatCurrency(lineTotal)}</span>
                                                    </div>
                                                    {item.type === 'configurable' && (item.options ?? []).length > 0 && (
                                                        <ul className="mt-1.5 space-y-0.5 text-xs text-[#5a7a9a]">
                                                            {(item.options ?? []).map((opt, i) => (
                                                                <li key={i} className="truncate">{opt.label} +{formatCurrency(opt.price)}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {(item as any).type === 'spare' && (item as any).compatibleModelName && (
                                                        <div className="mt-1.5 inline-flex rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#566270]">
                                                            Compatible avec {(item as any).compatibleModelName}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Totaux */}
                            <div className="border-t border-[#e2e7ed] pt-3 text-sm">
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-[#5a7a9a]">Sous-total HT</span>
                                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-[#5a7a9a]">TVA ({Math.round(VAT_RATE * 100)}%)</span>
                                    <span className="font-medium">{formatCurrency(tax)}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-[#5a7a9a]">Livraison</span>
                                    <span className="font-medium">{formatCurrency(shippingPrice)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between border-t border-[#e2e7ed] pt-3">
                                    <span className="text-base font-black text-black sm:text-lg">Total TTC</span>
                                    <span className="text-base font-black text-black sm:text-xl">{formatCurrency(orderTotal)}</span>
                                </div>
                            </div>

                            {/* Code promo */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Code de réduction"
                                    className="h-10 min-w-0 flex-1 rounded border border-[#bfc6d1] px-3 text-sm outline-none focus:ring-2 focus:ring-[#2ad1a4]/40 sm:h-11"
                                />
                                <button type="button" className="h-10 rounded bg-[#e6eaef] px-3 text-sm font-semibold text-[#1a3a52] transition hover:bg-[#dce3eb] sm:h-11 sm:px-4">
                                    Appliquer
                                </button>
                            </div>

                            {/* Newsletter */}
                            <label className="inline-flex items-center gap-2 text-xs text-[#42566f] sm:text-sm">
                                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-[#bfc6d1]" />
                                S&apos;abonner à la newsletter
                            </label>

                            {/* Bouton commander */}
                            <button
                                type="button"
                                onClick={handleSubmitOrder}
                                disabled={submitting || items.length === 0}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2ad1a4] text-sm font-bold text-[#1a3a52] shadow-md transition hover:bg-[#20b890] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:text-base"
                            >
                                {submitting ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a3a52]/30 border-t-[#1a3a52]" />
                                        Traitement...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="h-4 w-4" />
                                        Passer la commande
                                    </>
                                )}
                            </button>

                            {/* Aide */}
                            <div className="rounded-lg border border-[#d6d8dc] p-3 text-[#1a3a52] sm:p-4">
                                <h3 className="text-sm font-semibold sm:text-base">Avez-vous besoin d&apos;aide ?</h3>
                                <div className="mt-3 space-y-1.5 text-xs sm:text-sm">
                                    <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" /> {SUPPORT_CONTACT.phone}</p>
                                    <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /> {SUPPORT_CONTACT.email}</p>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#667a92]">
                                    {FOOTER_LINKS.map((link) => (
                                        <Link key={link.label} href={link.href} className="hover:text-[#1a3a52]">
                                            {link.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Badges sécurité */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#607286]">
                                <span className="inline-flex items-center gap-1">🔒 SSL 256-bit</span>
                                <span className="inline-flex items-center gap-1">🛡 Données protégées</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    )
}

/* ── Composants ── */

function Field({ label, type = 'text', required, placeholder, defaultValue, value, onChange }: {
    label: string; type?: string; required?: boolean; placeholder?: string
    defaultValue?: string; value?: string; onChange?: (value: string) => void
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#37495f] sm:mb-1.5 sm:text-sm">
                {label}{required && <span className="ml-0.5 text-red-500">*</span>}
            </span>
            <input
                type={type} placeholder={placeholder} defaultValue={defaultValue} value={value}
                onChange={(e) => onChange?.(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#bfc6d1] bg-white px-3 text-sm text-[#1a3a52] outline-none transition focus:border-[#2ad1a4] focus:ring-2 focus:ring-[#2ad1a4]/20 sm:h-11"
            />
        </label>
    )
}

function StepBadge({ number, label, done, active, href }: { number: number; label: string; done?: boolean; active?: boolean; href?: string }) {
    const inner = (
        <div className={`flex items-center gap-1.5 text-xs font-semibold sm:gap-2 sm:text-sm ${active ? 'text-[#2ad1a4]' : done ? 'text-white/80' : 'text-white/40'}`}>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold sm:h-7 sm:w-7 sm:text-xs ${active ? 'bg-[#2ad1a4] text-[#1a3a52]' : done ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
                {done ? '✓' : number}
            </div>
            <span className="hidden xs:inline sm:inline">{label}</span>
        </div>
    )
    return href ? <Link href={href}>{inner}</Link> : inner
}

const paymentIcons: Record<string, React.ReactNode> = {
    bancontact: (<svg viewBox="0 0 40 24" className="h-5 w-9 sm:h-6 sm:w-10" fill="none"><rect width="40" height="24" rx="4" fill="#005498" /><rect x="20" width="20" height="24" rx="0" fill="#FFCB00" /><text x="5" y="16" fontSize="8" fill="white" fontWeight="bold">BC</text></svg>),
    belfius: (<svg viewBox="0 0 40 24" className="h-5 w-9 sm:h-6 sm:w-10" fill="none"><rect width="40" height="24" rx="4" fill="#CC0033" /><text x="4" y="16" fontSize="7" fill="white" fontWeight="bold">BELFIUS</text></svg>),
    card: (<svg viewBox="0 0 40 24" className="h-5 w-9 sm:h-6 sm:w-10" fill="none"><rect width="40" height="24" rx="4" fill="#1A1F71" /><circle cx="15" cy="12" r="7" fill="#EB001B" opacity="0.9" /><circle cx="25" cy="12" r="7" fill="#F79E1B" opacity="0.9" /><ellipse cx="20" cy="12" rx="3" ry="7" fill="#FF5F00" /></svg>),
    gpay: (<svg viewBox="0 0 40 24" className="h-5 w-9 sm:h-6 sm:w-10" fill="none"><rect width="40" height="24" rx="4" fill="#f8f9fa" stroke="#e0e0e0" strokeWidth="1" /><text x="4" y="16" fontSize="9" fontWeight="bold"><tspan fill="#4285F4">G</tspan><tspan fill="#34A853">P</tspan><tspan fill="#EA4335">a</tspan><tspan fill="#FBBC05">y</tspan></text></svg>),
    kbc: (<svg viewBox="0 0 40 24" className="h-5 w-9 sm:h-6 sm:w-10" fill="none"><rect width="40" height="24" rx="4" fill="#00833e" /><text x="6" y="16" fontSize="8" fill="white" fontWeight="bold">KBC</text></svg>),
    paypal: (<svg viewBox="0 0 40 24" className="h-5 w-9 sm:h-6 sm:w-10" fill="none"><rect width="40" height="24" rx="4" fill="#003087" /><text x="4" y="16" fontSize="8" fill="white" fontWeight="bold">PayPal</text></svg>),
    bank: (<svg viewBox="0 0 40 24" className="h-5 w-9 sm:h-6 sm:w-10" fill="none"><rect width="40" height="24" rx="4" fill="#f0f4f8" stroke="#d0d9e3" strokeWidth="1" /><path d="M8 16V10M14 16V10M20 16V10M26 16V10M32 16V10M6 10L20 5L34 10H6zM6 17H34" stroke="#1a3a52" strokeWidth="1.5" strokeLinecap="round" /></svg>),
    chorus: (<svg viewBox="0 0 40 24" className="h-5 w-9 sm:h-6 sm:w-10" fill="none"><rect width="40" height="24" rx="4" fill="#003189" /><text x="3" y="16" fontSize="7" fill="white" fontWeight="bold">CHORUS</text></svg>),
}

function AccordionSection({ id, title, open, onToggle, children, summary }: {
    id: string; title: string; open: boolean; onToggle: () => void
    children: React.ReactNode; summary?: string
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-[#d6d8dc] bg-white">
            <button type="button" onClick={onToggle} className="flex w-full items-center justify-between bg-[#1a3a52] px-4 py-3 text-left transition hover:bg-[#1f4570] sm:px-5 sm:py-4">
                <span className="text-sm font-bold text-white sm:text-base">{title}</span>
                <div className="flex items-center gap-2">
                    {!open && summary && <span className="hidden text-xs text-white/60 sm:inline">{summary}</span>}
                    <svg className={`h-4 w-4 text-white/70 transition-transform duration-200 sm:h-5 sm:w-5 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>
            {open && <div className="p-4 sm:p-5">{children}</div>}
        </div>
    )
}

function ChoiceBlockInline({ title, choices, value, onChange }: {
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
                    <label key={choice.id} className={`flex cursor-pointer items-center gap-2 border-b border-[#e2e7ed] py-3 text-sm last:border-0 sm:gap-4 sm:py-4 ${selected ? 'bg-[#f0fdf9]' : ''}`}>
                        <input type="radio" name={title} checked={selected} onChange={() => onChange(choice.id)} className="h-4 w-4 shrink-0 accent-[#2ad1a4]" />
                        {choice.icon && <span className="shrink-0">{choice.icon}</span>}
                        {choice.labelLeft && <span className="w-20 shrink-0 text-xs font-semibold text-[#273f59] sm:w-28 sm:text-sm">{choice.labelLeft}</span>}
                        <span className="min-w-0 flex-1 text-xs font-medium text-[#1a3a52] sm:text-sm">{choice.labelMain}</span>
                        {choice.labelRight && <span className="hidden text-xs text-[#4a6179] sm:inline">{choice.labelRight}</span>}
                    </label>
                )
            })}
        </div>
    )
}