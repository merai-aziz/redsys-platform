"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Phone,
  Search,
  ShoppingCart,
  User,
} from 'lucide-react'
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

type MenuKind = 'products' | 'server' | 'storage' | 'network'



function normalizeText(value: string | null | undefined) {
  return String(value ?? '').toLowerCase()
}

function findDomainIdByCode(domains: Domain[], code: string, fallbackNamePart: string) {
  const exact = domains.find((d) => d.code === code)
  if (exact) return exact.id

  const fallback = domains.find((d) => normalizeText(d.name).includes(fallbackNamePart))
  return fallback?.id ?? null
}

function getServerFamilyLabel(series: Series) {
  const raw = `${series.name} ${series.description ?? ''}`.toLowerCase()
  if (raw.includes('rack')) return 'Rack Servers'
  if (raw.includes('tower')) return 'Tower Servers'
  if (raw.includes('blade')) return 'Blade Servers'
  return series.name
}

function DomainMegaMenu({
  domain,
  brands,
  series,
  models,
  selectedBrand,
  selectedSeries,
  selectedModel,
  familyTitle,
  exploreLabel,
  getFamilyLabel,
  onSelectDomain,
  onSelectBrand,
  onSelectSeries,
  onSelectModel,
  onClose,
}: {
  domain: Domain | null
  brands: Brand[]
  series: Series[]
  models: Model[]
  selectedBrand: string | null
  selectedSeries: string | null
  selectedModel: string | null
  familyTitle: string
  exploreLabel: string
  getFamilyLabel?: (s: Series) => string
  onSelectDomain: (d: string | null) => void
  onSelectBrand: (b: string | null) => void
  onSelectSeries: (s: string | null) => void
  onSelectModel: (
    m: string | null,
    context?: {
      domainId: string | null
      brandId: string | null
      seriesId: string | null
    },
  ) => void
  onClose: () => void
}) {
  const activeDomainId = domain?.id ?? null
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(selectedBrand ?? null)
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(selectedSeries ?? null)
  const [mobileTab, setMobileTab] = useState<'brands' | 'series' | 'models'>('brands')

  const modelsInDomain = useMemo(
    () => models.filter((model) => model.domainId === activeDomainId),
    [activeDomainId, models],
  )

  const brandsInDomain = useMemo(
    () => brands.filter((brand) => modelsInDomain.some((model) => model.brandId === brand.id)),
    [brands, modelsInDomain],
  )

  const effectiveHoveredBrand = useMemo(() => {
    if (hoveredBrand && brandsInDomain.some((brand) => brand.id === hoveredBrand)) return hoveredBrand
    return brandsInDomain[0]?.id ?? null
  }, [brandsInDomain, hoveredBrand])

  const seriesInBrand = useMemo(
    () =>
      series.filter(
        (serie) =>
          serie.brandId === effectiveHoveredBrand
          && serie.domainId === activeDomainId
          && modelsInDomain.some((model) => model.brandId === effectiveHoveredBrand && model.seriesId === serie.id),
      ),
    [activeDomainId, effectiveHoveredBrand, modelsInDomain, series],
  )

  const effectiveHoveredSeries = useMemo(() => {
    if (hoveredSeries && seriesInBrand.some((serie) => serie.id === hoveredSeries)) return hoveredSeries
    return seriesInBrand[0]?.id ?? null
  }, [hoveredSeries, seriesInBrand])

  const modelsInSeries = useMemo(
    () =>
      modelsInDomain
        .filter((model) => model.brandId === effectiveHoveredBrand && model.seriesId === effectiveHoveredSeries)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [effectiveHoveredBrand, effectiveHoveredSeries, modelsInDomain],
  )

  return (
    <div className="absolute left-0 top-full z-50 w-full max-h-[calc(100vh-120px)] overflow-y-auto overscroll-contain animate-in slide-in-from-top-2 fade-in shadow-2xl duration-150">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-b-2xl border border-t-0 border-[#d0d9e3] bg-white overflow-hidden">
          
          {/* VERSION MOBILE : onglets + contenu scrollable */}
          <div className="flex flex-col lg:hidden">
            
            {/* Barre d'onglets sticky en haut du menu */}
            <div className="flex border-b border-[#eef1f5] bg-[#f8fafc]">
              {[
                { key: 'brands' as const, label: 'Marques', count: (modelsInDomain.length > 0 ? brandsInDomain.length : 0) },
                { key: 'series' as const, label: familyTitle, count: (modelsInDomain.length > 0 ? seriesInBrand.length : 0) },
                { key: 'models' as const, label: 'Modèles', count: (modelsInDomain.length > 0 ? modelsInSeries.length : 0) },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMobileTab(tab.key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold transition ${
                    mobileTab === tab.key
                      ? 'border-b-2 border-[#2ad1a4] text-[#1a3a52]'
                      : 'text-[#a5b8cc]'
                  }`}
                >
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    mobileTab === tab.key ? 'bg-[#2ad1a4] text-white' : 'bg-[#eef1f5] text-[#a5b8cc]'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Contenu de l'onglet actif — scrollable verticalement */}
            <div className="max-h-64 overflow-y-auto overscroll-contain">
              
              {mobileTab === 'brands' && brandsInDomain.length === 0 && (
                <p className="px-5 py-4 text-xs text-[#a5b8cc]">Aucune marque</p>
              )}

              {mobileTab === 'brands' && brandsInDomain.map((brand) => (
                <button
                  key={brand.id}
                  onMouseEnter={() => setHoveredBrand(brand.id)}
                  onClick={() => {
                    setHoveredBrand(brand.id)
                    setMobileTab('series')
                    onSelectDomain(activeDomainId)
                    onSelectBrand(selectedBrand === brand.id ? null : brand.id)
                    onSelectSeries(null)
                    onSelectModel(null)
                  }}
                  className={`flex w-full items-center justify-between px-5 py-3 text-sm font-semibold transition-colors ${
                    hoveredBrand === brand.id
                      ? 'bg-[#2ad1a4] text-white'
                      : 'text-[#1a3a52] hover:bg-[#eef3f8]'
                  }`}
                >
                  <span>{brand.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              ))}

              {mobileTab === 'series' && seriesInBrand.length === 0 && (
                <p className="px-5 py-4 text-xs text-[#a5b8cc]">
                  Sélectionnez une marque d'abord
                </p>
              )}

              {mobileTab === 'series' && seriesInBrand.map((serie) => (
                <button
                  key={serie.id}
                  onMouseEnter={() => setHoveredSeries(serie.id)}
                  onClick={() => {
                    setHoveredSeries(serie.id)
                    setMobileTab('models')
                    onSelectDomain(activeDomainId)
                    onSelectBrand(effectiveHoveredBrand)
                    onSelectSeries(selectedSeries === serie.id ? null : serie.id)
                    onSelectModel(null)
                  }}
                  className={`flex w-full items-center gap-2 px-5 py-3 text-sm transition-colors ${
                    selectedSeries === serie.id
                      ? 'bg-[#2ad1a4] font-semibold text-white'
                      : 'text-[#334e68] hover:bg-[#f0f7ff] hover:text-[#1a3a52]'
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2ad1a4]" />
                  <span>{getFamilyLabel ? getFamilyLabel(serie) : serie.name}</span>
                </button>
              ))}

              {mobileTab === 'models' && modelsInSeries.length === 0 && (
                <p className="px-5 py-4 text-xs text-[#a5b8cc]">
                  Sélectionnez une famille d'abord
                </p>
              )}

              {mobileTab === 'models' && modelsInSeries.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(selectedModel === model.id ? null : model.id, {
                      domainId: activeDomainId,
                      brandId: effectiveHoveredBrand,
                      seriesId: effectiveHoveredSeries,
                    })
                    onClose()
                  }}
                  className={`flex w-full items-center gap-2 px-5 py-3 text-sm transition-colors ${
                    selectedModel === model.id
                      ? 'bg-[#2ad1a4] font-semibold text-white'
                      : 'text-[#334e68] hover:bg-[#f0f7ff]'
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a5b8cc]" />
                  {model.name}
                </button>
              ))}
            </div>

            {/* Bouton explorer en bas sur mobile */}
            <div className="border-t border-[#eef1f5] p-4">
              <button
                onClick={() => {
                  onSelectDomain(activeDomainId)
                  onSelectBrand(null)
                  onSelectSeries(null)
                  onSelectModel(null)
                  onClose()
                }}
                className="w-full rounded-full bg-[#1a3a52] py-2.5 text-sm font-bold text-white transition hover:bg-[#2ad1a4] hover:text-[#1a3a52]"
              >
                {exploreLabel}
              </button>
            </div>
          </div>

          {/* VERSION DESKTOP : colonnes fixes comme avant */}
          <div className="hidden lg:flex overflow-hidden">
            <div className="w-52 shrink-0 border-r border-[#eef1f5] bg-[#f8fafc]">
              <p className="px-5 pb-3 pt-5 text-[10px] font-bold uppercase tracking-widest text-[#a5b8cc]">Marques</p>
              {brandsInDomain.length === 0 ? (
                <p className="px-5 py-3 text-xs text-[#a5b8cc]">Aucune marque</p>
              ) : (
                brandsInDomain.map((brand) => (
                  <button
                    key={brand.id}
                    onMouseEnter={() => setHoveredBrand(brand.id)}
                    onClick={() => {
                      onSelectDomain(activeDomainId)
                      onSelectBrand(selectedBrand === brand.id ? null : brand.id)
                      onSelectSeries(null)
                      onSelectModel(null)
                    }}
                    className={`flex w-full items-center justify-between px-5 py-2.5 text-sm font-semibold transition-colors ${
                      hoveredBrand === brand.id
                        ? 'bg-[#2ad1a4] text-white'
                        : 'text-[#1a3a52] hover:bg-[#eef3f8]'
                    }`}
                  >
                    <span>{brand.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  </button>
                ))
              )}
            </div>

            <div className="w-56 shrink-0 border-r border-[#eef1f5]">
              <p className="px-5 pb-3 pt-5 text-[10px] font-bold uppercase tracking-widest text-[#a5b8cc]">{familyTitle}</p>
              {seriesInBrand.length === 0 ? (
                <p className="px-5 py-3 text-xs text-[#a5b8cc]">Aucune famille</p>
              ) : (
                seriesInBrand.map((serie) => (
                  <button
                    key={serie.id}
                    onMouseEnter={() => setHoveredSeries(serie.id)}
                    onClick={() => {
                      onSelectDomain(activeDomainId)
                      onSelectBrand(effectiveHoveredBrand)
                      onSelectSeries(selectedSeries === serie.id ? null : serie.id)
                      onSelectModel(null)
                    }}
                    className={`flex w-full items-center gap-2 px-5 py-2.5 text-sm transition-colors ${
                      selectedSeries === serie.id
                        ? 'bg-[#2ad1a4] font-semibold text-white'
                        : 'text-[#334e68] hover:bg-[#f0f7ff] hover:text-[#1a3a52]'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2ad1a4]" />
                    <span>{getFamilyLabel ? getFamilyLabel(serie) : serie.name}</span>
                  </button>
                ))
              )}
            </div>

            <div className="w-80 shrink-0 border-r border-[#eef1f5]">
              <p className="px-5 pb-3 pt-5 text-[10px] font-bold uppercase tracking-widest text-[#a5b8cc]">Modeles</p>
              {modelsInSeries.length === 0 ? (
                <p className="px-5 py-3 text-xs text-[#a5b8cc]">Aucun modele</p>
              ) : (
                modelsInSeries.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(selectedModel === model.id ? null : model.id, {
                        domainId: activeDomainId,
                        brandId: effectiveHoveredBrand,
                        seriesId: effectiveHoveredSeries,
                      })
                      onClose()
                    }}
                    className={`flex w-full items-center gap-2 px-5 py-2.5 text-sm transition-colors ${
                      selectedModel === model.id
                        ? 'bg-[#2ad1a4] font-semibold text-white'
                        : 'text-[#334e68] hover:bg-[#f0f7ff]'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a5b8cc]" />
                    {model.name}
                  </button>
                ))
              )}
            </div>

            <div className="flex-1 p-8">
              {domain ? (
                <div className="h-full">
                  <h3 className="text-2xl font-black text-[#1a3a52]">
                    {domain.icon && <span className="mr-2">{domain.icon}</span>}
                    {domain.name}
                  </h3>
                  <p className="mt-2 text-sm text-[#5a7a9a]">
                    {brandsInDomain.length} marque(s) · {seriesInBrand.length} famille(s) · {modelsInSeries.length} modele(s)
                  </p>
                  <button
                    onClick={() => {
                      onSelectDomain(activeDomainId)
                      onSelectBrand(null)
                      onSelectSeries(null)
                      onSelectModel(null)
                      onClose()
                    }}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1a3a52] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#2ad1a4] hover:text-[#1a3a52]"
                  >
                    {exploreLabel}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-[#a5b8cc]">
                  <p className="text-sm">Survolez un domaine</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductsMegaMenu({
  brands,
  series,
  models,
  onPickBrand,
  onPickSeries,
}: {
  brands: Brand[]
  series: Series[]
  models: Model[]
  onPickBrand: (brandId: string) => void
  onPickSeries: (brandId: string, seriesId: string) => void
}) {
  const cards = useMemo(() => {
    const standardModels = models.filter((model) => model.condition === 'STANDARD')

    const uniqueBrands = Array.from(
      brands
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
        .reduce((accumulator, brand) => {
          const key = brand.name.toLowerCase()
          if (!accumulator.has(key) && standardModels.some((model) => model.brandId === brand.id)) accumulator.set(key, brand)
          return accumulator
        }, new Map<string, Brand>())
        .values(),
    )

    return uniqueBrands.map((brand) => {
      const categories = series
        .filter((serie) => serie.brandId === brand.id)
        .filter((serie) => standardModels.some((model) => model.brandId === brand.id && model.seriesId === serie.id))
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
        .slice(0, 5)
        .map((item) => ({ id: item.id, label: item.name }))

      return {
        ...brand,
        categories: categories.length > 0 ? categories : [{ id: null as string | null, label: 'Accessoires' }],
      }
    })
  }, [brands, models, series])

  return (
    <div className="absolute left-0 top-full z-50 w-full max-h-[calc(100vh-120px)] overflow-y-auto overscroll-contain animate-in slide-in-from-top-2 fade-in shadow-2xl duration-150">
      <div className="mx-auto max-w-7xl rounded-b-2xl border border-t-0 border-[#d0d9e3] bg-[#d9e2e5]">
        <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-2 gap-4 p-4 sm:gap-6 sm:p-8 md:grid-cols-3 xl:grid-cols-6">
            {cards.map((card) => (
              <div key={card.id}>
                <button
                  onClick={() => onPickBrand(card.id)}
                  className="text-left text-2xl font-black uppercase tracking-tight text-[#0d2032] transition hover:text-[#1a3a52]"
                >
                  {card.name}
                </button>
                <ul className="mt-3 space-y-1 text-[15px] font-medium text-[#1f3347]">
                  {card.categories.map((item) => (
                    <li key={`${card.id}-${item.label}`}>
                      <button
                        onClick={() => {
                          if (item.id) {
                            onPickSeries(card.id, item.id)
                            return
                          }
                          onPickBrand(card.id)
                        }}
                        className="text-left transition hover:text-[#1a3a52]"
                      >
                        {item.label.toUpperCase()}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onPickBrand(card.id)}
                  className="mt-3 text-sm font-semibold text-[#1a3a52] underline underline-offset-4"
                >
                  Elargir
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export type SiteHeaderProps = {
  catalog: CatalogPayload
  query: string
  onQueryChange: (query: string) => void
  onSelectDomain: (domainId: string | null) => void
  onSelectBrand: (brandId: string | null) => void
  onSelectSeries: (seriesId: string | null) => void
  onSelectModel: (
    modelId: string | null,
    context?: {
      domainId: string | null
      brandId: string | null
      seriesId: string | null
    },
  ) => void
  selectedBrand?: string | null
  selectedSeries?: string | null
  selectedModel?: string | null
}

export function SiteHeader({
  catalog,
  query,
  onQueryChange,
  onSelectDomain,
  onSelectBrand,
  onSelectSeries,
  onSelectModel,
  selectedBrand = null,
  selectedSeries = null,
  selectedModel = null,
}: SiteHeaderProps) {
  const { totalItems } = useCart()
  const { user, logout, isAdmin } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<MenuKind | null>(null)
  const [authMenuOpen, setAuthMenuOpen] = useState(false)
  const menuRef = useRef<HTMLElement>(null)
  const authMenuRef = useRef<HTMLDivElement>(null)
  const profileHref = isAdmin ? '/admin' : '/client/profile'

  const serverDomainId = useMemo(() => findDomainIdByCode(catalog.domains, 'SERVER', 'serveur'), [catalog.domains])
  const storageDomainId = useMemo(() => findDomainIdByCode(catalog.domains, 'STORAGE', 'storage'), [catalog.domains])
  const networkDomainId = useMemo(() => findDomainIdByCode(catalog.domains, 'NETWORK', 'reseau'), [catalog.domains])

  const activeDomain = useMemo(() => {
    if (activeMenu === 'server') return catalog.domains.find((domain) => domain.id === serverDomainId) ?? null
    if (activeMenu === 'storage') return catalog.domains.find((domain) => domain.id === storageDomainId) ?? null
    if (activeMenu === 'network') return catalog.domains.find((domain) => domain.id === networkDomainId) ?? null
    return null
  }, [activeMenu, catalog.domains, networkDomainId, serverDomainId, storageDomainId])

  const getServerFamily = useMemo(() => getServerFamilyLabel, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
        setActiveMenu(null)
      }

      if (authMenuRef.current && !authMenuRef.current.contains(event.target as Node)) {
        setAuthMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setActiveMenu(null)
        setAuthMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [menuOpen])

  function openMenuVisual(menu: MenuKind) {
    setActiveMenu(menu)
    setMenuOpen(true)
    setAuthMenuOpen(false)
  }

  function selectDomain(domainId: string | null) {
    onSelectDomain(domainId)
    onSelectBrand(null)
    onSelectSeries(null)
    onSelectModel(null)
  }

  function openDomainMenu(menu: MenuKind, domainId: string | null) {
    selectDomain(domainId)
    openMenuVisual(menu)
  }

  function openProductsMenu() {
    selectDomain('domain-products')
    setActiveMenu('products')
    setMenuOpen(true)
    setAuthMenuOpen(false)
  }

  function openProductsMenuVisual() {
    setActiveMenu('products')
    setMenuOpen(true)
    setAuthMenuOpen(false)
  }

  function closeMenu() {
    setMenuOpen(false)
    setActiveMenu(null)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1a3a52] shadow-lg">
      <div className="bg-[#0f2436] text-xs text-white/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 sm:px-6 lg:px-8">
          <span>Livraison rapide · Support technique 24/7</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Français</span>
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> +216 XX XXX XXX</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 py-4">
          <div className="shrink-0 text-xl font-black tracking-tight text-white">
            <Link href="/" aria-label="Accueil" className="block">
              <Image
                src="/redsys-logo.png"
                alt="Redsys"
                width={220}
                height={64}
                className="h-12 w-auto"
                priority
              />
            </Link>
          </div>

          <div className="relative hidden flex-1 md:block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Rechercher un équipement, une référence…"
              className="h-10 w-full rounded-full bg-white/15 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:bg-white/25 focus:ring-2 focus:ring-[#2ad1a4]/50"
            />
          </div>

          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <div ref={authMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAuthMenuOpen((value) => !value)}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 text-white/90 transition hover:bg-white/10"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-bold uppercase text-white">
                    {user.name?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                  <span className="hidden lg:inline">{user.name}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {authMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-[#d0d9e3] bg-white shadow-xl">
                    <Link
                      href={profileHref}
                      className="block px-4 py-3 text-sm font-medium text-[#1a3a52] transition hover:bg-[#f5f7fa]"
                      onClick={() => setAuthMenuOpen(false)}
                    >
                      Mon profil
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await logout()
                        setAuthMenuOpen(false)
                      }}
                      className="block w-full px-4 py-3 text-left text-sm font-medium text-[#1a3a52] transition hover:bg-[#f5f7fa]"
                    >
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white sm:flex">
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">Se connecter</span>
              </Link>
            )}

            <Link href="/cart" className="flex items-center gap-2 rounded-full bg-[#2ad1a4] px-4 py-2 font-bold text-[#1a3a52] transition hover:bg-[#20b890]">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Panier</span>
              {totalItems > 0 && (
                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#1a3a52] px-1.5 py-0.5 text-[11px] font-black text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        <nav
          ref={menuRef}
          onMouseLeave={closeMenu}
          className="relative border-t border-white/10"
        >
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            <button
              onMouseEnter={openProductsMenuVisual}
              onClick={() => {
                if (menuOpen && activeMenu === 'products') {
                  closeMenu()
                  return
                }
                openProductsMenu()
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${menuOpen && activeMenu === 'products' ? 'bg-white text-[#1a3a52]' : 'text-white hover:bg-white/10'}`}
            >
              Produits
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen && activeMenu === 'products' ? 'rotate-180' : ''}`} />
            </button>

            <button
              onMouseEnter={() => openMenuVisual('server')}
              onClick={() => {
                if (menuOpen && activeMenu === 'server') {
                  closeMenu()
                  return
                }
                openDomainMenu('server', serverDomainId)
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${menuOpen && activeMenu === 'server' ? 'bg-white text-[#1a3a52]' : 'text-white hover:bg-white/10'}`}
            >
              Serveur-configurateur
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen && activeMenu === 'server' ? 'rotate-180' : ''}`} />
            </button>

            <button
              onMouseEnter={() => openMenuVisual('storage')}
              onClick={() => {
                if (menuOpen && activeMenu === 'storage') {
                  closeMenu()
                  return
                }
                openDomainMenu('storage', storageDomainId)
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${menuOpen && activeMenu === 'storage' ? 'bg-white text-[#1a3a52]' : 'text-white hover:bg-white/10'}`}
            >
              Storage-configurateur
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen && activeMenu === 'storage' ? 'rotate-180' : ''}`} />
            </button>

            <button
              onMouseEnter={() => openMenuVisual('network')}
              onClick={() => {
                if (menuOpen && activeMenu === 'network') {
                  closeMenu()
                  return
                }
                openDomainMenu('network', networkDomainId)
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${menuOpen && activeMenu === 'network' ? 'bg-white text-[#1a3a52]' : 'text-white hover:bg-white/10'}`}
            >
              Reseau-configurateur
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen && activeMenu === 'network' ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {menuOpen && (
            <>
              {activeMenu === 'products' && (
                <ProductsMegaMenu
                  brands={catalog.brands}
                  series={catalog.series}
                  models={catalog.models}
                  onPickBrand={(brandId) => {
                    onSelectDomain('domain-products')
                    onSelectBrand(brandId)
                    onSelectSeries(null)
                    onSelectModel(null)
                    setMenuOpen(false)
                    setActiveMenu(null)
                  }}
                  onPickSeries={(brandId, seriesId) => {
                    onSelectDomain('domain-products')
                    onSelectBrand(brandId)
                    onSelectSeries(seriesId)
                    onSelectModel(null)
                    setMenuOpen(false)
                    setActiveMenu(null)
                  }}
                />
              )}

              {(activeMenu === 'server' || activeMenu === 'storage' || activeMenu === 'network') && (
                <DomainMegaMenu
                  domain={activeDomain}
                  brands={catalog.brands}
                  series={catalog.series}
                  models={catalog.models}
                  selectedBrand={selectedBrand}
                  selectedSeries={selectedSeries}
                  selectedModel={selectedModel}
                  familyTitle={activeMenu === 'server' ? 'Familles' : 'Series'}
                  exploreLabel={activeMenu === 'server' ? 'Explorer tous les serveurs' : activeMenu === 'storage' ? 'Explorer tout le storage' : 'Explorer tout le reseau'}
                  getFamilyLabel={activeMenu === 'server' ? getServerFamily : undefined}
                  onSelectDomain={onSelectDomain}
                  onSelectBrand={onSelectBrand}
                  onSelectSeries={onSelectSeries}
                  onSelectModel={onSelectModel}
                  onClose={() => {
                    setMenuOpen(false)
                    setActiveMenu(null)
                  }}
                />
              )}
            </>
          )}
        </nav>
      </div>

      <div className="border-t border-white/10 px-4 py-2 md:hidden">
        <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2">
          <Search className="h-4 w-4 text-white/40" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Rechercher..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
          />
        </div>
      </div>
    </header>
  )
}