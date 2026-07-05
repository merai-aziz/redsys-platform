"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, ShoppingCart, Trash2, Minus, Plus, AlertTriangle } from 'lucide-react'

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

function getSectionFromDomainId(catalog: CatalogPayload, domainId: string | null) {
  if (!domainId || domainId === 'domain-products') return 'products'

  const domain = catalog.domains.find((entry) => entry.id === domainId)
  const code = domain?.code.toUpperCase() ?? ''

  if (code === 'SERVER') return 'server'
  if (code === 'STORAGE') return 'storage'
  if (code === 'NETWORK') return 'network'

  return 'products'
}

// --- Vérification de stock -------------------------------------------------

interface StockStatus {
  inStock: boolean
  label: string | null
}

function getModelStockStatus(catalog: CatalogPayload, modelId: string | null | undefined): StockStatus {
  if (!modelId) return { inStock: true, label: null }

  const model = catalog.models.find((m) => m.id === modelId)
  if (!model) return { inStock: true, label: null } // pas de donnée = pas de faux positif

  if (model.status === 'OUT_OF_STOCK' || (typeof model.stockQty === 'number' && model.stockQty <= 0)) {
    return { inStock: false, label: `${model.name} est en rupture de stock` }
  }

  if (model.status === 'DISCONTINUED') {
    return { inStock: false, label: `${model.name} n'est plus disponible` }
  }

  return { inStock: true, label: null }
}

// Best-effort : /api/catalog n'expose pas le stock des configurationValue.standard_product.
// On tente une correspondance par optionId au cas où ce produit apparaîtrait aussi dans catalog.models.
// Si rien n'est trouvé, on n'affiche AUCUN message (pour ne jamais afficher une fausse rupture).
function getOptionStockStatus(catalog: CatalogPayload, option: { label: string; optionId?: number }): StockStatus {
  if (option.optionId == null) return { inStock: true, label: null }

  const model = catalog.models.find((m) => m.id === String(option.optionId))
  if (!model) return { inStock: true, label: null }

  if (model.status === 'OUT_OF_STOCK' || (typeof model.stockQty === 'number' && model.stockQty <= 0)) {
    return { inStock: false, label: `${option.label} est en rupture de stock` }
  }

  return { inStock: true, label: null }
}

export default function CartPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const {
    items,
    removeItem,
    updateQuantity,
    updateOptionQty,
    removeOption,
    clearCart,
    totalItems,
    totalPrice,
  } = useCart()
  const [catalog, setCatalog] = useState<CatalogPayload>({
    domains: [],
    brands: [],
    series: [],
    models: [],
    skus: [],
    familyFilters: [],
    compatibilities: [],
    sparepartFilters: [],
    sparepartDomainFilters: [],
  })
  const [query, setQuery] = useState('')
  const activeSectionRef = useRef<'products' | 'server' | 'storage' | 'network'>('products')

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/catalog', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setCatalog(safePayload(data)))
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return
      })

    return () => {
      controller.abort()
    }
  }, [])

  // Le total du contexte ne multiplie pas les options par leur qty (bug dans CartContext.tsx,
  // ligne `optionsTotal = ... + option.price`). On recalcule ici un total fiable pour l'affichage,
  // en attendant la correction de ce fichier.
  const reliableSubtotal = items.reduce((sum, item) => {
    if (item.type === 'configurable') {
      const optionsTotal = item.options.reduce((s, o) => s + o.price * (o.qty ?? 1), 0)
      return sum + item.basePrice * item.quantity + optionsTotal
    }
    return sum + item.price * item.quantity
  }, 0)

  const cartSubtotal = reliableSubtotal
  const vatRate = 0.19
  const vatAmount = cartSubtotal * vatRate
  const grandTotal = cartSubtotal + vatAmount

  function pushCatalogUrl(section: 'products' | 'server' | 'storage' | 'network', params: Record<string, string | null | undefined> = {}) {
    const searchParams = new URLSearchParams()
    searchParams.set('section', section)

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value)
      }
    })

    router.push(`/?${searchParams.toString()}`)
  }

  function handleSelectDomain(domainId: string | null) {
    const section = getSectionFromDomainId(catalog, domainId)
    activeSectionRef.current = section
    pushCatalogUrl(section)
  }

  function handleSelectBrand(brandId: string | null) {
    if (!brandId) {
      pushCatalogUrl(activeSectionRef.current)
      return
    }

    pushCatalogUrl(activeSectionRef.current, { brandId })
  }

  function handleSelectSeries(seriesId: string | null) {
    if (!seriesId) {
      pushCatalogUrl(activeSectionRef.current)
      return
    }

    const seriesRecord = catalog.series.find((entry) => entry.id === seriesId)
    pushCatalogUrl(activeSectionRef.current, {
      brandId: seriesRecord?.brandId,
      seriesId,
    })
  }

  function handleSelectModel(
    modelId: string | null,
    context?: {
      domainId: string | null
      brandId: string | null
      seriesId: string | null
    },
  ) {
    const section = getSectionFromDomainId(catalog, context?.domainId ?? null)
    activeSectionRef.current = section

    if (!modelId) {
      pushCatalogUrl(section, {
        brandId: context?.brandId,
        seriesId: context?.seriesId,
      })
      return
    }

    pushCatalogUrl(section, {
      brandId: context?.brandId,
      seriesId: context?.seriesId,
      modelId,
    })
  }

  function goToCheckout() {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout')
      return
    }

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
          <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-[#d0d9e3] bg-white px-6 py-16 text-center">
            <ShoppingCart className="h-16 w-16 text-[#d0d9e3]" />
            <h1 className="mt-6 text-3xl font-black text-[#1a3a52]">Votre panier est vide</h1>
            <p className="mt-2 text-sm text-[#5a7a9a]">Ajoutez des produits depuis le catalogue pour continuer.</p>
            <Link
              href="/catalog"
              className="mt-6 inline-flex items-center rounded-full bg-[#2ad1a4] px-6 py-3 font-bold text-[#1a3a52] transition hover:bg-[#20b890]"
            >
              Retour catalogue
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-[#d0d9e3] bg-white px-5 py-4 shadow-sm">
                <div>
                  <h1 className="text-3xl font-black text-[#1a3a52]">Panier</h1>
                  <p className="mt-1 text-sm text-[#5a7a9a]">{totalItems} article{totalItems > 1 ? 's' : ''}</p>
                </div>
                {items.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Vider tout le panier ?')) clearCart()
                    }}
                    className="flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Vider le panier
                  </button>
                )}
              </div>

              {items.map((item) => {
                const quantity = item.quantity

                if (item.type === 'configurable') {
                  const mainStock = getModelStockStatus(catalog, item.modelId)
                  const optionsTotal = item.options.reduce((sum, option) => sum + option.price * (option.qty ?? 1), 0)
                  const subtotal = item.basePrice * quantity + optionsTotal

                  return (
                    <article key={`${item.type}-${item.modelId}`} className="rounded-2xl border border-[#d0d9e3] bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-5 md:flex-row">
                        <div className="flex-shrink-0">
                          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl bg-[#f5f7fa]">
                            {item.image ? (
                              <Image src={item.image} alt={item.name} width={160} height={160} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-10 w-10 text-[#d0d9e3]" />
                            )}
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                          <div>
                            <h2 className="text-lg font-bold text-[#1a3a52]">{item.name}</h2>
                            <p className="mt-1 text-sm text-[#5a7a9a]">{item.brandName}</p>
                          </div>

                          {!mainStock.inStock && (
                            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                              <span>{mainStock.label}</span>
                            </div>
                          )}

                          <div className="rounded-xl bg-[#f8fafc] p-3 text-sm text-[#334e68]">
                            <p className="font-semibold text-[#1a3a52]">Options</p>
                            <ul className="mt-2 space-y-2">
                              {item.options.map((option, optionIndex) => {
                                const optionStock = getOptionStockStatus(catalog, option)
                                const optionQty = option.qty ?? 1

                                return (
                                  <li
                                    key={`${item.modelId}-${option.label}-${optionIndex}`}
                                    className="flex flex-col gap-2 border-b border-[#e5ebf1] pb-2 last:border-b-0 last:pb-0"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <span>{option.label}</span>
                                      <span className="font-medium">{formatCurrency(option.price)}</span>
                                    </div>

                                    {!optionStock.inStock && (
                                      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{optionStock.label}</span>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center rounded-full border border-[#d0d9e3] bg-white">
                                        <button
                                          type="button"
                                          onClick={() => updateOptionQty(item.modelId, optionIndex, optionQty - 1)}
                                          className="flex h-7 w-7 items-center justify-center text-[#1a3a52] transition hover:bg-[#f5f7fa]"
                                        >
                                          <Minus className="h-3.5 w-3.5" />
                                        </button>
                                        <span className="min-w-8 px-2 text-center text-xs font-semibold text-[#1a3a52]">
                                          {optionQty}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateOptionQty(item.modelId, optionIndex, optionQty + 1)}
                                          disabled={!optionStock.inStock}
                                          className="flex h-7 w-7 items-center justify-center text-[#1a3a52] transition hover:bg-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => removeOption(item.modelId, optionIndex)}
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Retirer
                                      </button>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-[#5a7a9a]">Qté</span>
                              <div className="flex items-center rounded-full border border-[#d0d9e3] bg-white">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.modelId, quantity - 1)}
                                  className="flex h-9 w-9 items-center justify-center text-[#1a3a52] transition hover:bg-[#f5f7fa]"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-12 px-3 text-center font-semibold text-[#1a3a52]">{quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.modelId, quantity + 1)}
                                  disabled={!mainStock.inStock}
                                  className="flex h-9 w-9 items-center justify-center text-[#1a3a52] transition hover:bg-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.modelId)}
                              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </button>
                          </div>

                          <div className="flex items-center justify-between border-t border-[#f0f3f6] pt-3">
                            <span className="text-sm text-[#5a7a9a]">Sous-total</span>
                            <span className="text-lg font-black text-[#1a3a52]">{formatCurrency(subtotal)}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                }

                if (item.type === 'spare') {
                  const stock = getModelStockStatus(catalog, item.modelId)
                  const subtotal = item.price * quantity

                  return (
                    <article key={`${item.type}-${item.modelId}`} className="rounded-2xl border border-[#d0d9e3] bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-5 md:flex-row">
                        <div className="flex-shrink-0">
                          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl bg-[#f5f7fa]">
                            {item.image ? (
                              <Image src={item.image} alt={item.name} width={160} height={160} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-10 w-10 text-[#d0d9e3]" />
                            )}
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                          <div>
                            <h2 className="text-lg font-bold text-[#1a3a52]">{item.name}</h2>
                            <p className="mt-1 text-sm text-[#5a7a9a]">{item.brandName}</p>
                            {item.compatibleModelName && (
                              <span className="mt-2 inline-flex rounded-full bg-[#f5f7fa] px-3 py-1 text-xs font-semibold text-[#5a7a9a]">
                                Compatible avec {item.compatibleModelName}
                              </span>
                            )}
                          </div>

                          {!stock.inStock && (
                            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                              <span>{stock.label}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-[#5a7a9a]">Qté</span>
                              <div className="flex items-center rounded-full border border-[#d0d9e3] bg-white">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.modelId, quantity - 1)}
                                  className="flex h-9 w-9 items-center justify-center text-[#1a3a52] transition hover:bg-[#f5f7fa]"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-12 px-3 text-center font-semibold text-[#1a3a52]">{quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.modelId, quantity + 1)}
                                  disabled={!stock.inStock}
                                  className="flex h-9 w-9 items-center justify-center text-[#1a3a52] transition hover:bg-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.modelId)}
                              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </button>
                          </div>

                          <div className="flex items-center justify-between border-t border-[#f0f3f6] pt-3">
                            <span className="text-sm text-[#5a7a9a]">Sous-total</span>
                            <span className="text-lg font-black text-[#1a3a52]">{formatCurrency(subtotal)}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                }

                const stock = getModelStockStatus(catalog, item.modelId)
                const subtotal = item.price * quantity

                return (
                  <article key={`${item.type}-${item.modelId}`} className="rounded-2xl border border-[#d0d9e3] bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-5 md:flex-row">
                      <div className="flex-shrink-0">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl bg-[#f5f7fa]">
                          {item.image ? (
                            <Image src={item.image} alt={item.name} width={160} height={160} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-10 w-10 text-[#d0d9e3]" />
                          )}
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <div>
                          <h2 className="text-lg font-bold text-[#1a3a52]">{item.name}</h2>
                          <p className="mt-1 text-sm text-[#5a7a9a]">{item.brandName}</p>
                          <p className="mt-1 text-sm text-[#5a7a9a]">Référence: {item.reference}</p>
                        </div>

                        {!stock.inStock && (
                          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>{stock.label}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#5a7a9a]">Qté</span>
                            <div className="flex items-center rounded-full border border-[#d0d9e3] bg-white">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.modelId, quantity - 1)}
                                className="flex h-9 w-9 items-center justify-center text-[#1a3a52] transition hover:bg-[#f5f7fa]"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="min-w-12 px-3 text-center font-semibold text-[#1a3a52]">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.modelId, quantity + 1)}
                                disabled={!stock.inStock}
                                className="flex h-9 w-9 items-center justify-center text-[#1a3a52] transition hover:bg-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.modelId)}
                            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#f0f3f6] pt-3">
                          <span className="text-sm text-[#5a7a9a]">Sous-total</span>
                          <span className="text-lg font-black text-[#1a3a52]">{formatCurrency(subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-[#d0d9e3] bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-black text-[#1a3a52]">Résumé</h2>
                <div className="mt-4 space-y-3 border-t border-[#d0d9e3] pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5a7a9a]">Nombre d&apos;articles</span>
                    <span className="font-semibold text-[#1a3a52]">{totalItems}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5a7a9a]">Total HT</span>
                    <span className="font-semibold text-[#1a3a52]">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5a7a9a]">TVA 19%</span>
                    <span className="font-semibold text-[#1a3a52]">{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#d0d9e3] pt-3">
                    <span className="text-lg font-black text-[#1a3a52]">Total TTC</span>
                    <span className="text-lg font-black text-[#1a3a52]">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goToCheckout}
                  className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#2ad1a4] px-5 py-3 font-bold text-[#1a3a52] transition hover:bg-[#20b890]"
                >
                  Passer au paiement
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}