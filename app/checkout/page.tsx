"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Phone, Lock, ChevronDown, CheckCircle2, ShoppingCart, Package, CreditCard, MapPin, Truck, User, LogOut, Bell, ChevronRight, Shield, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

import { SHIPPING_RATES, VAT_RATE, SUPPORT_CONTACT } from '@/lib/constants'
import React from 'react'

type ShippingMethod = 'standard' | 'express'
type PaymentMethod = 'bancontact' | 'belfius' | 'card' | 'gpay' | 'kbc' | 'paypal' |'flouci' | 'bank' | 'chorus'

function formatCurrency(value: number) {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

// Calcule le prix unitaire réel d'une ligne "configurable" en tenant
// compte de la quantité de CHAQUE option (option.qty), pas seulement de sa présence.
// Fix du bug hérité de CartContext.totalPrice qui ne multipliait pas par option.qty.
function getConfigurableUnitPrice(item: { basePrice: number; options?: Array<{ price: number; qty?: number }> }) {
    const optionsTotal = (item.options ?? []).reduce((s, o) => s + o.price * (o.qty ?? 1), 0)
    return item.basePrice + optionsTotal
}

interface AppNotification {
    id: string
    title: string
    message: string
    type: string
    isRead: boolean
    createdAt: string
    referenceType?: string
    referenceId?: string
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
    { id: 'invoiceEmail', label: 'E-mail de facture', type: 'email', required: false, section: 'address', colSpan: 'half' },
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
    { id: 'flouci', labelMain: 'Flouci', iconId: 'flouci' },
    { id: 'bank', labelMain: 'Virement bancaire préalable', iconId: 'bank' },
    { id: 'chorus', labelMain: 'Chorus Pro', iconId: 'chorus' },
] as const

const SECTIONS_CONFIG = [
    { id: 'address', title: 'Adresse de livraison', icon: MapPin, step: 2 },
    { id: 'shipping', title: 'Modes de livraison', icon: Truck, step: 2 },
    { id: 'payment', title: 'Modes de paiement', icon: CreditCard, step: 2 },
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
    const { items, clearCart } = useCart()
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const userMenuRef = useRef<HTMLDivElement>(null)
    const [notifications, setNotifications] = useState<AppNotification[]>([])

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

    // FIX : on ne se fie plus à useCart().totalPrice (bug : ne multiplie pas les options
    // par leur quantité). On recalcule un sous-total fiable ici.
    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => {
            if (item.type === 'configurable') {
                return sum + getConfigurableUnitPrice(item) * item.quantity
            }
            return sum + item.price * item.quantity
        }, 0)
    }, [items])

    const tax = subtotal * VAT_RATE
    const orderTotal = subtotal + tax + shippingPrice

    useEffect(() => {
        if (!isAuthenticated) return
        async function fetchNotifications() {
            try {
                const res = await fetch('/api/notifications')
                if (res.ok) {
                    const data = await res.json()
                    setNotifications(data.notifications ?? [])
                }
            } catch { }
        }
        void fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [isAuthenticated])

    const totalUnreadCount = useMemo(
        () => notifications.filter((n) => !n.isRead).length,
        [notifications]
    )

    const orderUnread = useMemo(
        () => notifications.filter((n) => !n.isRead && (n.type === 'ORDER_STATUS_UPDATE' || n.referenceType === 'ORDER')).length,
        [notifications]
    )
    const ticketUnread = useMemo(
        () => notifications.filter((n) => !n.isRead && n.referenceType === 'TICKET').length,
        [notifications]
    )

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
                    // FIX : unitPrice tient maintenant compte de la quantité de chaque option
                    const unitPrice = getConfigurableUnitPrice(item)
                    // modelId = String(product.id) du produit configurable
                    const productId = Number(item.modelId)

                    // Transmet les options réellement sélectionnées
                    // (optionId = ConfigurationValue.id) pour que le backend sache
                    // EXACTEMENT quel(s) produit(s) standard décrémenter.
                    const selectedOptions = (item.options ?? [])
                        .filter((o): o is typeof o & { optionId: number } => typeof o.optionId === 'number')
                        .map((o) => ({
                            configurationValueId: o.optionId,
                            quantity: o.qty ?? 1,
                        }))

                    return {
                        productId: Number.isFinite(productId) && productId > 0 ? productId : null,
                        quantity: item.quantity,
                        unitPrice,
                        lineTotal: unitPrice * item.quantity,
                        description: `${item.name} (configuré)`,
                        selectedOptions,
                    }
                }
                // STANDARD et SPARE : modelId = String(product.id)
                const productId = Number(item.modelId)
                return {
                    productId: Number.isFinite(productId) && productId > 0 ? productId : null,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    lineTotal: item.price * item.quantity,
                    description: item.name,
                }
            })

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: orderItems,
                    shippingMethod,
                    paymentMethod,
                    shippingAddress: formData,
                    subtotal,
                    tax,
                    shipping: shippingPrice,
                    total: orderTotal,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                toast.error(data.error ?? 'Erreur lors de la commande')
                return
            }

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
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
                    <p className="text-sm font-medium text-slate-500">Chargement…</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) return <div className="min-h-screen bg-slate-50" />

    const profileHref = isAdmin ? '/admin' : '/client/profile'
    const orderHref = isAdmin ? '/admin' : '/client/orders'
    const ticketsHref = isAdmin ? '/admin' : '/client/tickets'

    const renderFormFields = () => {
        const fields = FORM_FIELDS_CONFIG.filter(field => field.section === 'address')
        const rows: React.ReactNode[] = []
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
                        <div key={`${field.id}-${nextField.id}`} className="col-span-full grid gap-4 sm:grid-cols-2">
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
        <div className="min-h-screen bg-slate-50 text-slate-800">

            {/* ── HEADER ── */}
            <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f2537] shadow-lg shadow-black/20">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between gap-4 sm:h-18">

                        {/* Logo */}
                        <Link href="/" aria-label="Accueil" className="shrink-0 transition-opacity hover:opacity-80">
                            <Image src="/redsys-logo.png" alt="Redsys" width={130} height={38} className="h-9 w-auto sm:h-10" priority />
                        </Link>

                        {/* Steps — desktop */}
                        <nav className="hidden items-center gap-1 sm:flex" aria-label="Étapes de commande">
                            {STEPS_CONFIG.map((step, idx) => (
                                <React.Fragment key={step.number}>
                                    {idx > 0 && (
                                        <div className="mx-2 flex items-center">
                                            <ChevronRight className="h-4 w-4 text-white/20" />
                                        </div>
                                    )}
                                    <StepBadge number={step.number} label={step.label} active={step.active} done={!step.active && step.number === 1} href={step.href} />
                                </React.Fragment>
                            ))}
                        </nav>

                        {/* Right actions */}
                        <div className="flex shrink-0 items-center gap-2.5">
                            <Link href="/cart"
                                className="hidden items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white sm:flex">
                                <ShoppingCart className="h-3.5 w-3.5" />
                                Panier
                            </Link>

                            <div ref={userMenuRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setUserMenuOpen((v) => !v)}
                                    className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 transition hover:border-white/25 hover:bg-white/10"
                                    aria-expanded={userMenuOpen}
                                    aria-haspopup="true"
                                >
                                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white shadow-sm">
                                        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                                        {totalUnreadCount > 0 && (
                                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-black text-white ring-2 ring-[#0f2537]">
                                                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className="hidden max-w-[110px] truncate text-sm font-medium text-white/90 sm:block">
                                        {user?.name || user?.email}
                                    </span>
                                    <ChevronDown className={`hidden h-3.5 w-3.5 text-white/50 transition-transform duration-200 sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/10">
                                        <div className="border-b border-slate-100 px-4 py-3">
                                            <p className="text-xs text-slate-400">Connecté en tant que</p>
                                            <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">{user?.name || user?.email}</p>
                                        </div>

                                        <div className="py-1.5">
                                            <MenuLink href={profileHref} icon={<User className="h-4 w-4" />} onClick={() => setUserMenuOpen(false)}>
                                                Mon profil
                                            </MenuLink>
                                            <MenuLink href={orderHref} icon={<Package className="h-4 w-4" />} onClick={() => setUserMenuOpen(false)} badge={orderUnread}>
                                                Mes commandes
                                            </MenuLink>
                                            <MenuLink href={ticketsHref} icon={<Bell className="h-4 w-4" />} onClick={() => setUserMenuOpen(false)} badge={ticketUnread}>
                                                Mes Tickets
                                            </MenuLink>
                                        </div>

                                        <div className="border-t border-slate-100 py-1.5">
                                            <button
                                                onClick={() => { logout(); setUserMenuOpen(false) }}
                                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-rose-500 transition hover:bg-rose-50"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Se déconnecter
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Steps — mobile */}
                    <div className="flex items-center justify-center gap-1 pb-3 sm:hidden">
                        {STEPS_CONFIG.map((step, idx) => (
                            <React.Fragment key={step.number}>
                                {idx > 0 && <div className="mx-1 h-px w-6 bg-white/20" />}
                                <StepBadge number={step.number} label={step.label} active={step.active} done={!step.active && step.number === 1} href={step.href} />
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </header>

            {/* ── MAIN ── */}
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">

                {/* Page title */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
                        Finaliser ma commande
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Complétez les informations ci-dessous pour valider votre achat.</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8 xl:grid-cols-[1fr_400px]">

                    {/* ── LEFT: Sections ── */}
                    <div className="space-y-4">
                        {SECTIONS_CONFIG.map((section, sIdx) => {
                            const Icon = section.icon
                            const isOpen = openSection === section.id
                            const summary =
                                section.id === 'shipping'
                                    ? `${shippingMethod === 'standard' ? 'Standard' : 'Express'} — ${formatCurrency(SHIPPING_RATES[shippingMethod])}`
                                    : section.id === 'payment'
                                        ? PAYMENT_METHODS_CONFIG.find(m => m.id === paymentMethod)?.labelMain
                                        : undefined

                            return (
                                <div
                                    key={section.id}
                                    className={`overflow-hidden rounded-2xl border transition-all duration-200 ${isOpen ? 'border-emerald-300 shadow-lg shadow-emerald-500/5' : 'border-slate-200 bg-white shadow-sm hover:shadow-md'}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setOpenSection(section.id)}
                                        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition sm:px-6 ${isOpen ? 'bg-gradient-to-r from-[#0f2537] to-[#1a3a52]' : 'bg-white hover:bg-slate-50'}`}
                                    >
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isOpen ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                                            <span className={`text-sm font-bold sm:text-base ${isOpen ? 'text-white' : 'text-slate-700'}`}>
                                                {section.title}
                                            </span>
                                            <div className="flex shrink-0 items-center gap-2">
                                                {!isOpen && summary && (
                                                    <span className="hidden rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline">
                                                        {summary}
                                                    </span>
                                                )}
                                                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white/70' : 'text-slate-400'}`} />
                                            </div>
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="bg-white p-5 sm:p-6">
                                            {section.id === 'address' && (
                                                <div className="grid grid-cols-1 gap-4">
                                                    {renderFormFields()}
                                                    <label className="col-span-full mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.neutralDelivery}
                                                            onChange={(e) => setFormData(p => ({ ...p, neutralDelivery: e.target.checked }))}
                                                            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-emerald-500"
                                                        />
                                                        <span className="text-sm font-medium text-slate-600">Bon de livraison neutre</span>
                                                    </label>
                                                </div>
                                            )}
                                            {section.id === 'shipping' && (
                                                <div className="space-y-2.5">
                                                    {SHIPPING_METHODS_CONFIG.map((method) => {
                                                        const selected = shippingMethod === method.id
                                                        return (
                                                            <label
                                                                key={method.id}
                                                                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${selected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="shipping"
                                                                    checked={selected}
                                                                    onChange={() => setShippingMethod(method.id as ShippingMethod)}
                                                                    className="h-4 w-4 shrink-0 accent-emerald-500"
                                                                />
                                                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-emerald-100' : 'bg-white'}`}>
                                                                    <Truck className={`h-5 w-5 ${selected ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className={`text-sm font-semibold ${selected ? 'text-emerald-800' : 'text-slate-700'}`}>{method.labelMain}</p>
                                                                    <p className="mt-0.5 text-xs text-slate-500">{method.labelRight}</p>
                                                                </div>
                                                                <span className={`shrink-0 text-sm font-bold ${selected ? 'text-emerald-700' : 'text-slate-600'}`}>
                                                                    {formatCurrency(method.getPrice())}
                                                                </span>
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                            {section.id === 'payment' && (
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {PAYMENT_METHODS_CONFIG.map((method) => {
                                                        const selected = paymentMethod === method.id
                                                        return (
                                                            <label
                                                                key={method.id}
                                                                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3.5 transition-all ${selected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="payment"
                                                                    checked={selected}
                                                                    onChange={() => setPaymentMethod(method.id as PaymentMethod)}
                                                                    className="h-4 w-4 shrink-0 accent-emerald-500"
                                                                />
                                                                <span className="shrink-0">{paymentIcons[method.iconId as keyof typeof paymentIcons]}</span>
                                                                <span className={`min-w-0 flex-1 text-sm font-medium ${selected ? 'text-emerald-800' : 'text-slate-700'}`}>
                                                                    {method.labelMain}
                                                                </span>
                                                                {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* ── RIGHT: Order summary ── */}
                    <aside className="h-fit">
                        <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">

                            {/* Header */}
                            <div className="bg-gradient-to-r from-[#0f2537] to-[#1a3a52] px-5 py-4 sm:px-6">
                                <h2 className="text-base font-bold text-white sm:text-lg">Résumé de la commande</h2>
                                <p className="mt-0.5 text-xs text-white/50">{items.length} article{items.length !== 1 ? 's' : ''}</p>
                            </div>

                            <div className="p-5 sm:p-6">

                                {/* Cart items */}
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                                            <ShoppingCart className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <p className="text-sm text-slate-500">Votre panier est vide</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {items.map((item, idx) => {
                                            let lineTotal = 0
                                            if (item.type === 'configurable') {
                                                // FIX : multiplie chaque option par sa quantité propre
                                                lineTotal = getConfigurableUnitPrice(item) * item.quantity
                                            } else {
                                                lineTotal = item.price * item.quantity
                                            }
                                            return (
                                                <div key={`${item.type}-${(item as any).modelId || idx}`} className="flex items-start gap-3">
                                                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                                        {item.image ? (
                                                            <Image src={item.image} alt={item.name} width={56} height={56} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                <Package className="h-5 w-5 text-slate-300" />
                                                            </div>
                                                        )}
                                                        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white shadow">
                                                            {item.quantity}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold leading-snug text-slate-700">{item.name}</p>
                                                        {item.type === 'configurable' && (item.options ?? []).length > 0 && (
                                                            <ul className="mt-1 space-y-0.5">
                                                                {(item.options ?? []).map((opt, i) => {
                                                                    const optQty = opt.qty ?? 1
                                                                    return (
                                                                        <li key={i} className="truncate text-xs text-slate-400">
                                                                            {opt.label}
                                                                            {optQty > 1 && <span className="text-slate-400"> ×{optQty}</span>}{' '}
                                                                            <span className="text-slate-500">+{formatCurrency(opt.price * optQty)}</span>
                                                                        </li>
                                                                    )
                                                                })}
                                                            </ul>
                                                        )}
                                                        {(item as any).type === 'spare' && (item as any).compatibleModelName && (
                                                            <div className="mt-1.5 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                                                                Compatible: {(item as any).compatibleModelName}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="shrink-0 text-sm font-bold text-slate-800">{formatCurrency(lineTotal)}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Promo code */}
                                <div className="mt-5 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Code de réduction"
                                        className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20"
                                    />
                                    <button
                                        type="button"
                                        className="h-10 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-95"
                                    >
                                        Appliquer
                                    </button>
                                </div>

                                {/* Totals */}
                                <div className="mt-5 space-y-2.5 rounded-xl bg-slate-50 p-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Sous-total HT</span>
                                        <span className="font-medium text-slate-700">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">TVA ({Math.round(VAT_RATE * 100)}%)</span>
                                        <span className="font-medium text-slate-700">{formatCurrency(tax)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Livraison</span>
                                        <span className="font-medium text-slate-700">{formatCurrency(shippingPrice)}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                                        <span className="text-base font-extrabold text-slate-800">Total TTC</span>
                                        <span className="text-xl font-extrabold text-slate-900">{formatCurrency(orderTotal)}</span>
                                    </div>
                                </div>

                                {/* Newsletter */}
                                <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-slate-500">
                                    <input type="checkbox" defaultChecked className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-emerald-500" />
                                    S&apos;abonner à la newsletter
                                </label>

                                {/* CTA */}
                                <button
                                    type="button"
                                    onClick={handleSubmitOrder}
                                    disabled={submitting || items.length === 0}
                                    className="mt-5 flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-emerald-500 hover:shadow-xl hover:shadow-emerald-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-base"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Traitement en cours…
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-4 w-4" />
                                            Passer la commande
                                        </>
                                    )}
                                </button>

                                {/* Trust badges */}
                                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                                        SSL 256-bit
                                    </span>
                                    <span className="h-3.5 w-px bg-slate-200" />
                                    <span className="flex items-center gap-1.5">
                                        <Lock className="h-3.5 w-3.5 text-emerald-500" />
                                        Données protégées
                                    </span>
                                </div>

                                {/* Support */}
                                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="text-sm font-semibold text-slate-700">Besoin d&apos;aide ?</h3>
                                    <div className="mt-3 space-y-2 text-xs text-slate-500 sm:text-sm">
                                        <a href={`tel:${SUPPORT_CONTACT.phone}`} className="flex items-center gap-2.5 transition hover:text-slate-700">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm">
                                                <Phone className="h-3.5 w-3.5 text-emerald-500" />
                                            </div>
                                            {SUPPORT_CONTACT.phone}
                                        </a>
                                        <a href={`mailto:${SUPPORT_CONTACT.email}`} className="flex items-center gap-2.5 transition hover:text-slate-700">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm">
                                                <Mail className="h-3.5 w-3.5 text-emerald-500" />
                                            </div>
                                            {SUPPORT_CONTACT.email}
                                        </a>
                                    </div>
                                    <div className="mt-3.5 flex flex-wrap gap-3">
                                        {FOOTER_LINKS.map((link) => (
                                            <Link key={link.label} href={link.href} className="text-xs text-slate-400 underline underline-offset-2 transition hover:text-slate-600">
                                                {link.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    )
}

/* ── Sub-components ── */

function Field({ label, type = 'text', required, placeholder, value, onChange }: {
    label: string
    type?: string
    required?: boolean
    placeholder?: string
    value?: string
    onChange?: (value: string) => void
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
            </span>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 sm:h-12"
            />
        </label>
    )
}

function StepBadge({ number, label, done, active, href }: {
    number: number
    label: string
    done?: boolean
    active?: boolean
    href?: string
}) {
    const inner = (
        <div className={`flex items-center gap-2 text-xs font-semibold sm:text-sm ${active ? 'text-emerald-400' : done ? 'text-white/70' : 'text-white/30'}`}>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${active ? 'bg-emerald-400 text-[#0f2537] shadow-md shadow-emerald-500/30' : done ? 'bg-white/20 text-white' : 'bg-white/10 text-white/30'}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : number}
            </div>
            <span className="hidden xs:inline sm:inline">{label}</span>
        </div>
    )
    return href ? <Link href={href}>{inner}</Link> : inner
}

function MenuLink({ href, icon, children, onClick, badge }: {
    href: string
    icon: React.ReactNode
    children: React.ReactNode
    onClick?: () => void
    badge?: number
}) {
    return (
        <Link href={href} onClick={onClick}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
            <span className="text-slate-400">{icon}</span>
            <span className="flex-1">{children}</span>
            {badge && badge > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 px-1 text-[10px] font-bold text-rose-600">
                    {badge}
                </span>
            ) : null}
        </Link>
    )
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
    flouci: (<svg viewBox="0 0 40 24" className="h-5 w-9 sm:h-6 sm:w-10" fill="none">
            <rect width="40" height="24" rx="4" fill="#0D1B2A" />
            <text x="5" y="16" fontSize="7" fill="#FFFFFF" fontWeight="bold" letterSpacing="0.5">FLOUCI</text>
            <circle cx="32" cy="12" r="4" fill="#00D4AA" opacity="0.8" />
            <path d="M29 10L32 14L35 10" stroke="#0D1B2A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>),
}
