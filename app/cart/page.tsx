"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package, ShoppingCart, Trash2, Minus, Plus, ChevronDown, ChevronUp,
  Tag, Cpu, HardDrive, MemoryStick, Wifi, Server, Settings2, ArrowRight,
  ShoppingBag, Sparkles
} from 'lucide-react'

import { SiteHeader } from '@/components/SiteHeader'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

interface Domain { id: string; code: string; name: string; icon?: string | null; displayOrder: number }
interface Brand { id: string; name: string; logo?: string | null; domainId: string; sortOrder: number }
interface Series { id: string; name: string; image?: string | null; description?: string | null; familyId: string; brandId: string; domainId: string; sortOrder: number }
interface Model {
  id: string
  name: string
  reference: string
  shortDescription?: string | null
  longDescription?: string | null
  basePrice: number
  image?: string | null
  stockQty?: number
  status?: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED'
  condition?: string | null
  poe?: boolean
  specs?: Array<{ key: string; value: string }>
  brandName?: string
  familyName?: string
  categoryName?: string
  seriesId: string
  brandId: string
  domainId: string
  filterValues?: Array<{
    filterId: number
    filterName: string
    valueId: number
    value: string
  }>
}
interface SKU { id: string; sku: string; modelId: string; price: number; stock: number; condition: string }
interface CompatibilityLink { partProductId: string; targetProductId: string }
interface SparepartFilterDefinition {
  targetProductId: string
  filters: Array<{ id: number; name: string; values?: Array<{ id: number; value: string }> }>
}
interface SparepartDomainFilterDefinition {
  domainCode: string
  filters: Array<{ id: number; name: string; values?: Array<{ id: number; value: string }> }>
}
interface FamilyFilterDefinition {
  familyId: string
  filters: Array<{
    name: string
    values: string[]
  }>
}
interface CatalogPayload {
  domains: Domain[]
  brands: Brand[]
  series: Series[]
  models: Model[]
  skus: SKU[]
  familyFilters: FamilyFilterDefinition[]
  compatibilities: CompatibilityLink[]
  sparepartFilters: SparepartFilterDefinition[]
  sparepartDomainFilters: SparepartDomainFilterDefinition[]
}

function safePayload(payload: unknown): CatalogPayload {
  const p = payload as Partial<CatalogPayload> | null | undefined
  return {
    domains: Array.isArray(p?.domains) ? p.domains : [],
    brands: Array.isArray(p?.brands) ? p.brands : [],
    series: Array.isArray(p?.series) ? p.series : [],
    models: Array.isArray(p?.models) ? p.models : [],
    skus: Array.isArray(p?.skus) ? p.skus : [],
    familyFilters: Array.isArray(p?.familyFilters) ? p.familyFilters : [],
    compatibilities: Array.isArray(p?.compatibilities) ? p.compatibilities : [],
    sparepartFilters: Array.isArray(p?.sparepartFilters) ? p.sparepartFilters : [],
    sparepartDomainFilters: Array.isArray(p?.sparepartDomainFilters) ? p.sparepartDomainFilters : [],
  }
}

function formatCurrency(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function getBrandName(catalog: CatalogPayload, brandId: string, fallback?: string) {
  return catalog.brands.find((brand) => brand.id === brandId)?.name ?? fallback ?? ''
}

function getSectionFromDomainId(catalog: CatalogPayload, domainId: string | null) {
  if (!domainId || domainId === 'domain-products') return 'products'
  const domain = catalog.domains.find((entry) => entry.id === domainId)
  const code = domain?.code.toUpperCase() ?? ''
  if (code === 'SERVER') return 'server'
  if (code === 'STORAGE') return 'storage'
  if (code === 'NETWORK') return 'network'
  return 'products'
}

// Detect option type icon from label
function getOptionIcon(label: string) {
  const lower = label.toLowerCase()
  if (lower.startsWith('cpu') || lower.includes('processor') || lower.includes('processeur')) return Cpu
  if (lower.startsWith('ram') || lower.includes('memory') || lower.includes('mémoire')) return MemoryStick
  if (lower.includes('disk') || lower.includes('hdd') || lower.includes('ssd') || lower.includes('storage') || lower.includes('stockage')) return HardDrive
  if (lower.includes('network') || lower.includes('réseau') || lower.includes('nic') || lower.includes('wifi')) return Wifi
  if (lower.includes('server') || lower.includes('serveur')) return Server
  return Settings2
}

// Parse "CPU · 2-core · Intel Xeon Silver" → { type, spec, name }
function parseOptionLabel(label: string): { type: string; spec: string | null; name: string } {
  const parts = label.split('·').map((s) => s.trim())
  if (parts.length >= 3) return { type: parts[0], spec: parts[1], name: parts.slice(2).join(' · ') }
  if (parts.length === 2) return { type: parts[0], spec: null, name: parts[1] }
  return { type: '', spec: null, name: label }
}

// ── InlineOptionEditor ────────────────────────────────────────────────────────
function InlineOptionEditor({
  modelId,
  options,
}: {
  modelId: string
  options: Array<{ label: string; price: number; optionId?: number; qty?: number }>
}) {
  const { removeOption, updateOptionQty } = useCart()
  const [expanded, setExpanded] = useState(false)
  const SHOW = 3
  const hasMore = options.length > SHOW
  const visible = expanded ? options : options.slice(0, SHOW)

  return (
    <div className="rounded-xl bg-[#f8fafc] border border-[#eef2f6] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-[#eef2f6] bg-gradient-to-r from-[#f0fdf9] to-[#f8fafc]">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#2ad1a4]/20">
          <Tag size={11} className="text-[#2ad1a4]" />
        </div>
        <span className="text-xs font-bold text-[#1a3a52] uppercase tracking-wider">
          Options configurées
        </span>
        <span className="ml-auto inline-flex items-center rounded-full bg-[#f0fdf9] border border-[#9fe1cb] px-2 py-0.5 text-[10px] font-semibold text-[#0f6e56]">
          {options.length}
        </span>
      </div>

      <ul className="divide-y divide-[#f0f3f6]">
        {visible.map((option, i) => {
          const { type, spec, name } = parseOptionLabel(option.label)
          const OptionIcon = getOptionIcon(option.label)
          const isPaid = option.price > 0
          const qty = option.qty ?? 1
          const unitPrice = isPaid && qty > 0 ? option.price / qty : option.price

          return (
            <li key={`${option.label}-${i}`} className="flex items-start gap-3 px-4 py-3">
              {/* Icon */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f0fdf9] mt-0.5">
                <OptionIcon size={14} className="text-[#2ad1a4]" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Type + spec row */}
                {(type || spec) && (
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    {type && (
                      <span className="inline-flex items-center rounded-md bg-[#2ad1a4]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0f6e56]">
                        {type}
                      </span>
                    )}
                    {spec && (
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                        {spec}
                      </span>
                    )}
                  </div>
                )}
                {/* Product name */}
                <p className="text-sm font-semibold text-[#1a3a52] leading-snug truncate">
                  {name || option.label}
                </p>

                {/* Qty controls for paid options */}
                {isPaid && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">Qté :</span>
                    <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => updateOptionQty(modelId, i, qty - 1)}
                        className="flex h-5 w-5 items-center justify-center text-[#1a3a52] hover:text-[#2ad1a4] hover:bg-[#f0fdf9] transition text-xs font-bold"
                      >
                        −
                      </button>
                      <span className="min-w-[1.5rem] text-center text-[11px] font-bold text-[#1a3a52] border-x border-gray-200 py-0.5">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOptionQty(modelId, i, qty + 1)}
                        className="flex h-5 w-5 items-center justify-center text-[#1a3a52] hover:text-[#2ad1a4] hover:bg-[#f0fdf9] transition text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                    {qty > 1 && (
                      <span className="text-[10px] text-gray-400">
                        × {formatCurrency(unitPrice)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: price + remove */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`text-sm font-bold ${option.price === 0 ? 'text-[#0f6e56]' : 'text-[#1a3a52]'}`}>
                  {option.price === 0 ? (
                    <span className="rounded-full bg-[#f0fdf9] border border-[#9fe1cb] px-2 py-0.5 text-[10px] font-semibold text-[#0f6e56]">
                      Inclus
                    </span>
                  ) : (
                    formatCurrency(option.price)
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeOption(modelId, i)}
                  title="Retirer cette option"
                  className="flex items-center justify-center w-6 h-6 rounded-md border border-red-100 bg-white text-red-400 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-[#eef2f6] py-2 text-xs font-semibold text-[#5a7a9a] hover:bg-[#f5f7fa] transition"
        >
          {expanded ? (
            <><ChevronUp size={13} /> Voir moins</>
          ) : (
            <><ChevronDown size={13} /> {options.length - SHOW} option{options.length - SHOW > 1 ? 's' : ''} de plus</>
          )}
        </button>
      )}
    </div>
  )
}

// ── QuantityControls ─────────────────────────────────────────────────────────
function QuantityControls({
  modelId,
  quantity,
  onUpdate,
  onRemove,
}: {
  modelId: string
  quantity: number
  onUpdate: (id: string, qty: number) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#5a7a9a]">Qté</span>
        <div className="flex items-center rounded-full border border-[#d0d9e3] bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => onUpdate(modelId, quantity - 1)}
            className="flex h-9 w-9 items-center justify-center text-[#1a3a52] transition hover:bg-[#f5f7fa]"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[3rem] px-2 text-center text-sm font-bold text-[#1a3a52] border-x border-[#d0d9e3]">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdate(modelId, quantity + 1)}
            className="flex h-9 w-9 items-center justify-center text-[#1a3a52] transition hover:bg-[#f5f7fa]"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(modelId)}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-100 px-3 py-1.5 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:border-red-200"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Supprimer
      </button>
    </div>
  )
}

// ── ProductImage ─────────────────────────────────────────────────────────────
function ProductImage({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#f5f7fa] to-[#eef2f6] border border-[#eef2f6]">
      {src ? (
        <Image src={src} alt={alt} width={160} height={160} className="h-full w-full object-cover" />
      ) : (
        <Package className="h-10 w-10 text-[#d0d9e3]" />
      )}
    </div>
  )
}

// ── SubtotalRow ───────────────────────────────────────────────────────────────
function SubtotalRow({ amount }: { amount: number }) {
  return (
    <div className="flex items-center justify-between border-t border-[#f0f3f6] pt-3 mt-1">
      <span className="text-sm font-medium text-[#5a7a9a]">Sous-total</span>
      <span className="text-lg font-black text-[#1a3a52]">{formatCurrency(amount)}</span>
    </div>
  )
}

// ── ItemTypeBadge ─────────────────────────────────────────────────────────────
function ItemTypeBadge({ type }: { type: 'standard' | 'configurable' | 'spare' }) {
  const config = {
    configurable: { label: 'Configurable', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    spare: { label: 'Pièce détachée', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    standard: { label: 'Standard', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  }[type]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
      {type === 'configurable' && <Sparkles size={9} className="mr-1" />}
      {config.label}
    </span>
  )
}

// ── Main CartPage ─────────────────────────────────────────────────────────────
export default function CartPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart()
  const [catalog, setCatalog] = useState<CatalogPayload>({
    domains: [], brands: [], series: [], models: [], skus: [],
    familyFilters: [], compatibilities: [], sparepartFilters: [], sparepartDomainFilters: [],
  })
  const [query, setQuery] = useState('')
  const activeSectionRef = useRef<'products' | 'server' | 'storage' | 'network'>('products')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/catalog', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setCatalog(safePayload(data)))
      .catch((err) => { if (err instanceof Error && err.name === 'AbortError') return })
    return () => controller.abort()
  }, [])

  const cartSubtotal = totalPrice
  const vatRate = 0.19
  const vatAmount = cartSubtotal * vatRate
  const grandTotal = cartSubtotal + vatAmount

  function pushCatalogUrl(section: 'products' | 'server' | 'storage' | 'network', params: Record<string, string | null | undefined> = {}) {
    const searchParams = new URLSearchParams()
    searchParams.set('section', section)
    Object.entries(params).forEach(([key, value]) => { if (value) searchParams.set(key, value) })
    router.push(`/?${searchParams.toString()}`)
  }

  function handleSelectDomain(domainId: string | null) {
    const section = getSectionFromDomainId(catalog, domainId)
    activeSectionRef.current = section
    pushCatalogUrl(section)
  }

  function handleSelectBrand(brandId: string | null) {
    if (!brandId) { pushCatalogUrl(activeSectionRef.current); return }
    pushCatalogUrl(activeSectionRef.current, { brandId })
  }

  function handleSelectSeries(seriesId: string | null) {
    if (!seriesId) { pushCatalogUrl(activeSectionRef.current); return }
    const seriesRecord = catalog.series.find((entry) => entry.id === seriesId)
    pushCatalogUrl(activeSectionRef.current, { brandId: seriesRecord?.brandId, seriesId })
  }

  function handleSelectModel(modelId: string | null, context?: { domainId: string | null; brandId: string | null; seriesId: string | null }) {
    const section = getSectionFromDomainId(catalog, context?.domainId ?? null)
    activeSectionRef.current = section
    if (!modelId) { pushCatalogUrl(section, { brandId: context?.brandId, seriesId: context?.seriesId }); return }
    pushCatalogUrl(section, { brandId: context?.brandId, seriesId: context?.seriesId, modelId })
  }

  function goToCheckout() {
    if (!isAuthenticated) { router.push('/login?redirect=/checkout'); return }
    router.push('/checkout')
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-sans text-[#1a3a52]">
      <SiteHeader
        catalog={catalog}
        query={query}
        onQueryChange={setQuery}
        onSelectDomain={handleSelectDomain}
        onSelectBrand={handleSelectBrand}
        onSelectSeries={handleSelectSeries}
        onSelectModel={handleSelectModel}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          /* ── Panier vide ── */
          <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-[#d0d9e3] bg-white px-6 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f0fdf9] to-[#e8f5f0] border border-[#c8e6dc]">
              <ShoppingCart className="h-9 w-9 text-[#2ad1a4]" />
            </div>
            <h1 className="mt-6 text-3xl font-black text-[#1a3a52]">Votre panier est vide</h1>
            <p className="mt-2 text-sm text-[#5a7a9a] max-w-xs">Ajoutez des produits depuis le catalogue pour continuer.</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2ad1a4] px-6 py-3 font-bold text-white transition hover:bg-[#20b890]"
            >
              <ShoppingBag size={16} />
              Retour catalogue
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">

            {/* ── Articles ── */}
            <section className="space-y-4">

              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d0d9e3] bg-white px-5 py-4 shadow-sm">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#1a3a52]">Mon panier</h1>
                  <p className="mt-1 text-sm text-[#5a7a9a]">
                    {totalItems} article{totalItems > 1 ? 's' : ''} · {formatCurrency(cartSubtotal)} HT
                  </p>
                </div>
                <button
                  onClick={() => { if (confirm('Vider tout le panier ?')) clearCart() }}
                  className="flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Vider le panier</span>
                  <span className="sm:hidden">Vider</span>
                </button>
              </div>

              {items.map((item) => {
                const quantity = item.quantity

                /* ── CONFIGURABLE ── */
                if (item.type === 'configurable') {
                  const optionsTotal = item.options.reduce((sum, o) => sum + o.price, 0)
                  const unitPrice = item.basePrice + optionsTotal
                  const subtotal = unitPrice * quantity

                  return (
                    <article
                      key={`${item.type}-${item.modelId}`}
                      className="rounded-2xl border border-[#d0d9e3] bg-white shadow-sm overflow-hidden"
                    >
                      {/* Top accent bar */}
                      <div className="h-1 bg-gradient-to-r from-[#2ad1a4] to-[#1ab88f]" />

                      <div className="p-5">
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <ProductImage src={item.image} alt={item.name} />

                          <div className="flex min-w-0 flex-1 flex-col gap-3">
                            {/* Titre + marque + badge */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <ItemTypeBadge type="configurable" />
                                </div>
                                <h2 className="text-base sm:text-lg font-bold text-[#1a3a52] leading-snug">{item.name}</h2>
                                <p className="mt-0.5 text-sm font-medium text-[#5a7a9a]">{item.brandName}</p>
                              </div>
                            </div>

                            {/* Base price info */}
                            {item.options.length > 0 && (
                              <div className="flex items-center justify-between text-xs text-[#94a3b8] bg-[#f8fafc] rounded-lg px-3 py-2">
                                <span>Prix de base du produit</span>
                                <span className="font-semibold text-[#5a7a9a]">{formatCurrency(item.basePrice)}</span>
                              </div>
                            )}

                            {/* Options editor */}
                            {item.options.length > 0 && (
                              <InlineOptionEditor modelId={item.modelId} options={item.options} />
                            )}

                            {/* Qté + supprimer */}
                            <QuantityControls
                              modelId={item.modelId}
                              quantity={quantity}
                              onUpdate={updateQuantity}
                              onRemove={removeItem}
                            />

                            <SubtotalRow amount={subtotal} />
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                }

                /* ── SPARE ── */
                if (item.type === 'spare') {
                  const subtotal = item.price * quantity

                  return (
                    <article
                      key={`${item.type}-${item.modelId}`}
                      className="rounded-2xl border border-[#d0d9e3] bg-white shadow-sm overflow-hidden"
                    >
                      <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
                      <div className="p-5">
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <ProductImage src={item.image} alt={item.name} />

                          <div className="flex min-w-0 flex-1 flex-col gap-3">
                            <div>
                              <div className="mb-1">
                                <ItemTypeBadge type="spare" />
                              </div>
                              <h2 className="text-base sm:text-lg font-bold text-[#1a3a52] leading-snug">{item.name}</h2>
                              <p className="mt-0.5 text-sm font-medium text-[#5a7a9a]">{item.brandName}</p>
                              {item.compatibleModelName && (
                                <span className="mt-2 inline-flex rounded-full bg-[#f5f7fa] border border-[#e2e8f0] px-3 py-1 text-xs font-semibold text-[#5a7a9a]">
                                  Compatible avec {item.compatibleModelName}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between bg-[#f8fafc] rounded-lg px-3 py-2">
                              <span className="text-xs text-[#94a3b8]">Prix unitaire</span>
                              <span className="text-sm font-bold text-[#1a3a52]">{formatCurrency(item.price)}</span>
                            </div>

                            <QuantityControls
                              modelId={item.modelId}
                              quantity={quantity}
                              onUpdate={updateQuantity}
                              onRemove={removeItem}
                            />

                            <SubtotalRow amount={subtotal} />
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                }

                /* ── STANDARD ── */
                const subtotal = item.price * quantity

                return (
                  <article
                    key={`${item.type}-${item.modelId}`}
                    className="rounded-2xl border border-[#d0d9e3] bg-white shadow-sm overflow-hidden"
                  >
                    <div className="h-1 bg-gradient-to-r from-[#5a7a9a] to-[#3d6080]" />
                    <div className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <ProductImage src={item.image} alt={item.name} />

                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                          <div>
                            <div className="mb-1">
                              <ItemTypeBadge type="standard" />
                            </div>
                            <h2 className="text-base sm:text-lg font-bold text-[#1a3a52] leading-snug">{item.name}</h2>
                            <p className="mt-0.5 text-sm font-medium text-[#5a7a9a]">{item.brandName}</p>
                            <p className="mt-0.5 text-xs text-[#94a3b8]">Réf. {item.reference}</p>
                          </div>

                          <div className="flex items-center justify-between bg-[#f8fafc] rounded-lg px-3 py-2">
                            <span className="text-xs text-[#94a3b8]">Prix unitaire</span>
                            <span className="text-sm font-bold text-[#1a3a52]">{formatCurrency(item.price)}</span>
                          </div>

                          <QuantityControls
                            modelId={item.modelId}
                            quantity={quantity}
                            onUpdate={updateQuantity}
                            onRemove={removeItem}
                          />

                          <SubtotalRow amount={subtotal} />
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>

            {/* ── Résumé ── */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-[#d0d9e3] bg-white shadow-sm overflow-hidden">

                {/* Header résumé */}
                <div className="bg-gradient-to-r from-[#1a3a52] to-[#2a5070] px-5 py-5">
                  <h2 className="text-lg font-black text-white">Résumé de commande</h2>
                  <p className="mt-1 text-xs text-white/60">
                    {totalItems} article{totalItems > 1 ? 's' : ''} sélectionné{totalItems > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Lignes */}
                <div className="px-5 py-5 space-y-3 text-sm border-b border-[#eef2f6]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5a7a9a]">Articles</span>
                    <span className="font-semibold text-[#1a3a52]">
                      {totalItems} article{totalItems > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5a7a9a]">Total HT</span>
                    <span className="font-bold text-[#1a3a52]">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#94a3b8]">
                    <span>TVA (19%)</span>
                    <span className="font-medium">{formatCurrency(vatAmount)}</span>
                  </div>
                </div>

                {/* Total TTC */}
                <div className="px-5 py-4 bg-[#f8fafc]">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-base font-bold text-[#1a3a52]">Total TTC</span>
                      <p className="text-[10px] text-[#94a3b8] mt-0.5">TVA incluse</p>
                    </div>
                    <span className="text-2xl font-black text-[#1a3a52]">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-5 pb-5 pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={goToCheckout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2ad1a4] px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-[#20b890] active:scale-[0.98] text-sm"
                  >
                    Passer au paiement
                    <ArrowRight size={16} />
                  </button>
                  <Link
                    href="/"
                    className="flex w-full items-center justify-center rounded-xl border border-[#d0d9e3] px-5 py-3 text-sm font-semibold text-[#5a7a9a] transition hover:bg-[#f5f7fa]"
                  >
                    Continuer mes achats
                  </Link>
                </div>

                {/* Security note */}
                <div className="border-t border-[#eef2f6] px-5 py-3 flex items-center justify-center gap-2">
                  <span className="text-[11px] text-[#94a3b8] text-center">
                    🔒 Paiement sécurisé · Livraison mondiale
                  </span>
                </div>
              </div>
            </aside>

          </div>
        )}
      </main>
    </div>
  )
}