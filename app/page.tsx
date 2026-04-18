"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  Search,
  ShoppingCart,
  Globe,
  Phone,
  User,
  Package,
} from 'lucide-react'

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Card,
  CardContent,
} from '@/components/ui/card'

interface Domain { id: string; code: string; name: string; icon?: string | null; displayOrder: number }
interface Brand { id: string; name: string; logo?: string | null; domainId: string; sortOrder: number }
interface Series { id: string; name: string; image?: string | null; description?: string | null; brandId: string; domainId: string; sortOrder: number }
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
  seriesId: string
  brandId: string
  domainId: string
}
interface SKU { id: string; sku: string; modelId: string; price: number; stock: number; condition: string }
interface CatalogPayload {
  domains: Domain[]
  brands: Brand[]
  series: Series[]
  models: Model[]
  skus: SKU[]
}

type MenuKind = 'products' | 'server' | 'storage' | 'network'

function safePayload(payload: unknown): CatalogPayload {
  const p = payload as Partial<CatalogPayload> | null | undefined
  return {
    domains: Array.isArray(p?.domains) ? p.domains : [],
    brands: Array.isArray(p?.brands) ? p.brands : [],
    series: Array.isArray(p?.series) ? p.series : [],
    models: Array.isArray(p?.models) ? p.models : [],
    skus: Array.isArray(p?.skus) ? p.skus : [],
  }
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').toLowerCase()
}

function findDomainIdByCode(domains: Domain[], code: string, fallbackNamePart: string) {
  const exact = domains.find((d) => d.code === code)
  if (exact) return exact.id

  const fallback = domains.find((d) => normalizeText(d.name).includes(fallbackNamePart))
  return fallback?.id ?? null
}

interface DomainMegaMenuProps {
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
  onSelectModel: (m: string | null) => void
  onClose: () => void
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
}: DomainMegaMenuProps) {
  const activeDomainId = domain?.id ?? null
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(selectedBrand ?? null)
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(selectedSeries ?? null)

  const modelsInDomain = useMemo(
    () => models.filter((m) => m.domainId === activeDomainId),
    [activeDomainId, models],
  )

  const brandsInDomain = useMemo(
    () => brands.filter((b) => modelsInDomain.some((m) => m.brandId === b.id)),
    [brands, modelsInDomain],
  )

  const effectiveHoveredBrand = useMemo(() => {
    if (hoveredBrand && brandsInDomain.some((b) => b.id === hoveredBrand)) return hoveredBrand
    return brandsInDomain[0]?.id ?? null
  }, [brandsInDomain, hoveredBrand])

  const seriesInBrand = useMemo(
    () =>
      series.filter(
        (s) =>
          s.brandId === effectiveHoveredBrand
          && s.domainId === activeDomainId
          && modelsInDomain.some((m) => m.brandId === effectiveHoveredBrand && m.seriesId === s.id),
      ),
    [activeDomainId, effectiveHoveredBrand, modelsInDomain, series],
  )

  const effectiveHoveredSeries = useMemo(() => {
    if (hoveredSeries && seriesInBrand.some((s) => s.id === hoveredSeries)) return hoveredSeries
    return seriesInBrand[0]?.id ?? null
  }, [hoveredSeries, seriesInBrand])

  const modelsInSeries = useMemo(
    () =>
      modelsInDomain
        .filter((m) => m.brandId === effectiveHoveredBrand && m.seriesId === effectiveHoveredSeries)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [effectiveHoveredBrand, effectiveHoveredSeries, modelsInDomain],
  )

  const domainInfo = domain

  return (
    <div className="absolute left-0 top-full z-50 w-full animate-in slide-in-from-top-2 fade-in shadow-2xl duration-150">
      <div className="mx-auto max-w-7xl">
        <div className="flex overflow-hidden rounded-b-2xl border border-t-0 border-[#d0d9e3] bg-white">
          <div className="w-52 shrink-0 border-r border-[#eef1f5] bg-[#f8fafc]">
            <p className="px-5 pb-3 pt-5 text-[10px] font-bold uppercase tracking-widest text-[#a5b8cc]">
              Marques
            </p>
            {brandsInDomain.length === 0 ? (
              <p className="px-5 py-3 text-xs text-[#a5b8cc]">Aucune marque</p>
            ) : (
              brandsInDomain.map((b) => (
                <button
                  key={b.id}
                  onMouseEnter={() => setHoveredBrand(b.id)}
                  onClick={() => {
                    onSelectDomain(activeDomainId)
                    onSelectBrand(selectedBrand === b.id ? null : b.id)
                    onSelectSeries(null)
                    onSelectModel(null)
                  }}
                  className={`flex w-full items-center justify-between px-5 py-2.5 text-sm font-semibold transition-colors ${
                    hoveredBrand === b.id
                      ? 'bg-[#1a3a52] text-white'
                      : 'text-[#1a3a52] hover:bg-[#eef3f8]'
                  }`}
                >
                  <span>{b.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              ))
            )}
          </div>

          <div className="w-56 shrink-0 border-r border-[#eef1f5]">
            <p className="px-5 pb-3 pt-5 text-[10px] font-bold uppercase tracking-widest text-[#a5b8cc]">
              {familyTitle}
            </p>
            {seriesInBrand.length === 0 ? (
              <p className="px-5 py-3 text-xs text-[#a5b8cc]">Aucune famille</p>
            ) : (
              seriesInBrand.map((s) => (
                <button
                  key={s.id}
                  onMouseEnter={() => setHoveredSeries(s.id)}
                  onClick={() => {
                    onSelectDomain(activeDomainId)
                    onSelectBrand(effectiveHoveredBrand)
                    onSelectSeries(selectedSeries === s.id ? null : s.id)
                    onSelectModel(null)
                  }}
                  className={`flex w-full items-center gap-2 px-5 py-2.5 text-sm transition-colors ${
                    selectedSeries === s.id
                      ? 'bg-[#e8faf4] font-semibold text-[#0f7a54]'
                      : 'text-[#334e68] hover:bg-[#f0f7ff] hover:text-[#1a3a52]'
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2ad1a4]" />
                  <span>{getFamilyLabel ? getFamilyLabel(s) : s.name}</span>
                </button>
              ))
            )}
          </div>

          <div className="w-80 shrink-0 border-r border-[#eef1f5]">
            <p className="px-5 pb-3 pt-5 text-[10px] font-bold uppercase tracking-widest text-[#a5b8cc]">
              Modeles
            </p>
            {modelsInSeries.length === 0 ? (
              <p className="px-5 py-3 text-xs text-[#a5b8cc]">Aucun modele</p>
            ) : (
              modelsInSeries.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectDomain(activeDomainId)
                    onSelectBrand(effectiveHoveredBrand)
                    onSelectSeries(effectiveHoveredSeries)
                    onSelectModel(selectedModel === m.id ? null : m.id)
                    onClose()
                  }}
                  className={`flex w-full items-center gap-2 px-5 py-2.5 text-sm transition-colors ${
                    selectedModel === m.id
                      ? 'bg-[#e8faf4] font-semibold text-[#0f7a54]'
                      : 'text-[#334e68] hover:bg-[#f0f7ff]'
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a5b8cc]" />
                  {m.name}
                </button>
              ))
            )}
          </div>

          <div className="flex-1 p-8">
            {domainInfo ? (
              <div className="h-full">
                <h3 className="text-2xl font-black text-[#1a3a52]">
                  {domainInfo.icon && <span className="mr-2">{domainInfo.icon}</span>}
                  {domainInfo.name}
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
  )
}

interface ProductsMegaMenuProps {
  brands: Brand[]
  series: Series[]
  models: Model[]
  onPickBrand: (brandId: string) => void
  onPickSeries: (brandId: string, seriesId: string) => void
}

function ProductsMegaMenu({ brands, series, models, onPickBrand, onPickSeries }: ProductsMegaMenuProps) {
  const cards = useMemo(() => {
    const standardModels = models.filter((m) => m.condition === 'STANDARD')

    const uniqueBrands = Array.from(
      brands
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .reduce((acc, brand) => {
          const key = brand.name.toLowerCase()
          if (!acc.has(key) && standardModels.some((m) => m.brandId === brand.id)) acc.set(key, brand)
          return acc
        }, new Map<string, Brand>())
        .values(),
    )

    return uniqueBrands.map((brand) => {
      const categories = series
        .filter((s) => s.brandId === brand.id)
        .filter((s) => standardModels.some((m) => m.brandId === brand.id && m.seriesId === s.id))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .slice(0, 5)
        .map((item) => ({ id: item.id, label: item.name }))

      return {
        ...brand,
        categories: categories.length > 0 ? categories : [{ id: null as string | null, label: 'Accessoires' }],
      }
    })
  }, [brands, models, series])

  return (
    <div className="absolute left-0 top-full z-50 w-full animate-in slide-in-from-top-2 fade-in shadow-2xl duration-150">
      <div className="mx-auto max-w-7xl rounded-b-2xl border border-t-0 border-[#d0d9e3] bg-[#d9e2e5] p-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6">
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
  )
}

export default function Home() {
  const router = useRouter()
  const [catalog, setCatalog] = useState<CatalogPayload>({
    domains: [],
    brands: [],
    series: [],
    models: [],
    skus: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all')
  const [poeFilter, setPoeFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [selectedSpec, setSelectedSpec] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'position' | 'name' | 'price' | 'stock'>('stock')

  const [menuOpen, setMenuOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<MenuKind | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const serverDomainId = useMemo(() => findDomainIdByCode(catalog.domains, 'SERVER', 'serveur'), [catalog.domains])
  const storageDomainId = useMemo(() => findDomainIdByCode(catalog.domains, 'STORAGE', 'storage'), [catalog.domains])
  const networkDomainId = useMemo(() => findDomainIdByCode(catalog.domains, 'NETWORK', 'reseau'), [catalog.domains])

  const activeDomain = useMemo(() => {
    if (activeMenu === 'server') return catalog.domains.find((d) => d.id === serverDomainId) ?? null
    if (activeMenu === 'storage') return catalog.domains.find((d) => d.id === storageDomainId) ?? null
    if (activeMenu === 'network') return catalog.domains.find((d) => d.id === networkDomainId) ?? null
    return null
  }, [activeMenu, catalog.domains, networkDomainId, serverDomainId, storageDomainId])

  const getServerFamilyLabel = (s: Series) => {
    const raw = `${s.name} ${s.description ?? ''}`.toLowerCase()
    if (raw.includes('rack')) return 'Rack Servers'
    if (raw.includes('tower')) return 'Tower Servers'
    if (raw.includes('blade')) return 'Blade Servers'
    return s.name
  }

  function openMenuVisual(menu: MenuKind) {
    setActiveMenu(menu)
    setMenuOpen(true)
  }

  function selectDomain(domainId: string | null) {
    setSelectedDomain(domainId)
    setSelectedBrand(null)
    setSelectedSeries(null)
    setSelectedModel(null)
  }

  function openDomainMenu(menu: MenuKind, domainId: string | null) {
    selectDomain(domainId)
    openMenuVisual(menu)
  }

  function openProductsMenu() {
    setSelectedDomain('domain-products')
    setSelectedBrand(null)
    setSelectedSeries(null)
    setSelectedModel(null)
    setActiveMenu('products')
    setMenuOpen(true)
  }

  function openProductsMenuVisual() {
    setActiveMenu('products')
    setMenuOpen(true)
  }

  function openModelConfigurator(modelId: string) {
    const model = catalog.models.find((entry) => entry.id === modelId)
    if (!model) return

    setMenuOpen(false)
    setActiveMenu(null)
    if (model.condition !== 'CONFIGURABLE') {
      setSelectedModel(modelId)
      return
    }
    router.push(`/configurator/${modelId}`)
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setActiveMenu(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [menuOpen])

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (query.trim()) params.set('search', query.trim())
        if (selectedDomain) params.set('domainId', selectedDomain)
        if (selectedBrand) params.set('brandId', selectedBrand)
        if (selectedSeries) params.set('seriesId', selectedSeries)
        if (selectedModel) params.set('modelId', selectedModel)

        const res = await fetch(`/api/catalog?${params.toString()}`)
        if (!res.ok) throw new Error('Erreur de chargement du catalogue')
        const data = await res.json()
        setCatalog(safePayload(data))
        setError(null)
      } catch {
        setError('Impossible de charger le catalogue pour le moment.')
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => window.clearTimeout(timer)
  }, [query, selectedDomain, selectedBrand, selectedSeries, selectedModel])

  const selectedDomainRecord = useMemo(
    () => catalog.domains.find((domain) => domain.id === selectedDomain) ?? null,
    [catalog.domains, selectedDomain],
  )
  const selectedBrandRecord = useMemo(
    () => catalog.brands.find((brand) => brand.id === selectedBrand) ?? null,
    [catalog.brands, selectedBrand],
  )
  const selectedSeriesRecord = useMemo(
    () => catalog.series.find((seriesItem) => seriesItem.id === selectedSeries) ?? null,
    [catalog.series, selectedSeries],
  )

  const isProductsDomain = selectedDomain === 'domain-products'
  const isConfiguratorDomain = selectedDomain === serverDomainId || selectedDomain === storageDomainId || selectedDomain === networkDomainId

  const baseModels = useMemo(() => {
    if (!selectedDomain) return []

    let list = catalog.models
    if (selectedDomain) list = list.filter((model) => model.domainId === selectedDomain)
    if (selectedBrand) list = list.filter((model) => model.brandId === selectedBrand)
    if (selectedSeries) list = list.filter((model) => model.seriesId === selectedSeries)
    if (selectedModel) list = list.filter((model) => model.id === selectedModel)

    if (isProductsDomain) {
      list = list.filter((model) => model.condition === 'STANDARD')
    } else {
      list = list.filter((model) => model.condition === 'CONFIGURABLE')
    }

    return list
  }, [catalog.models, isProductsDomain, selectedBrand, selectedDomain, selectedModel, selectedSeries])

  const standardSpecChoices = useMemo(() => {
    const set = new Set<string>()
    baseModels
      .filter((model) => model.condition === 'STANDARD')
      .forEach((model) => {
        ;(model.specs ?? []).forEach((entry) => {
          const key = `${entry.key}: ${entry.value}`
          if (entry.key && entry.value) set.add(key)
        })
      })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [baseModels])

  const filteredModels = useMemo(() => {
    return baseModels
      .filter((model) => {
        if (isConfiguratorDomain) {
          if (stockFilter === 'in' && (model.stockQty ?? 0) <= 0) return false
          if (stockFilter === 'out' && (model.stockQty ?? 0) > 0) return false
          if (poeFilter === 'yes' && !model.poe) return false
          if (poeFilter === 'no' && model.poe) return false
        }

        if (isProductsDomain && selectedSpec) {
          if (model.condition !== 'STANDARD') return false
          const [specKey, specValue] = selectedSpec.split(':').map((part) => part.trim())
          const match = (model.specs ?? []).some((entry) => entry.key === specKey && entry.value === specValue)
          if (!match) return false
        }
        return true
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [baseModels, isConfiguratorDomain, isProductsDomain, poeFilter, selectedSpec, stockFilter])

  const sortedModels = useMemo(() => {
    const withIndex = filteredModels.map((model, index) => ({ model, index }))

    return withIndex
      .sort((left, right) => {
        if (sortBy === 'position') return left.index - right.index

        if (sortBy === 'name') {
          return left.model.name.localeCompare(right.model.name)
        }

        if (sortBy === 'price') {
          return left.model.basePrice - right.model.basePrice || left.model.name.localeCompare(right.model.name)
        }

        const leftInStock = (left.model.stockQty ?? 0) > 0
        const rightInStock = (right.model.stockQty ?? 0) > 0
        if (leftInStock !== rightInStock) return leftInStock ? -1 : 1
        return left.model.name.localeCompare(right.model.name)
      })
      .map((entry) => entry.model)
  }, [filteredModels, sortBy])

  const pageSize = 12
  const totalPages = Math.max(1, Math.ceil(sortedModels.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const visibleModels = sortedModels.slice((safePage - 1) * pageSize, safePage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [query, selectedDomain, selectedBrand, selectedSeries, selectedModel, stockFilter, poeFilter, selectedSpec])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  function clearFilters() {
    setSelectedDomain(null)
    setSelectedBrand(null)
    setSelectedSeries(null)
    setSelectedModel(null)
    setQuery('')
    setStockFilter('all')
    setPoeFilter('all')
    setSelectedSpec('')
    setSortBy('stock')
    setCurrentPage(1)
  }

  const activeTitle = selectedModel
    ? catalog.models.find((model) => model.id === selectedModel)?.name
    : selectedSeriesRecord && selectedBrandRecord
      ? `${selectedBrandRecord.name.toUpperCase()} - ${selectedSeriesRecord.name.toUpperCase()}`
      : selectedBrandRecord?.name
        ? selectedBrandRecord.name
        : selectedDomainRecord?.name
          ? selectedDomainRecord.name
          : 'Catalogue de produits'

  const resultsStart = sortedModels.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const resultsEnd = Math.min(safePage * pageSize, sortedModels.length)

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-sans text-[#1a3a52]">
      <div className="bg-[#0f2436] text-xs text-white/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 sm:px-6 lg:px-8">
          <span>Livraison rapide · Support technique 24/7</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Français</span>
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> +216 XX XXX XXX</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1a3a52] shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 py-4">
            <div className="shrink-0 text-xl font-black tracking-tight text-white">
              Redsys<span className="text-[#2ad1a4]">Tech</span>
            </div>

            <div className="relative hidden flex-1 md:block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un équipement, une référence…"
                className="h-10 w-full rounded-full bg-white/15 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:bg-white/25 focus:ring-2 focus:ring-[#2ad1a4]/50"
              />
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Link href="/login" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white sm:flex">
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">Se connecter</span>
              </Link>
              <Link href="/cart" className="flex items-center gap-2 rounded-full bg-[#2ad1a4] px-4 py-2 font-bold text-[#1a3a52] transition hover:bg-[#20b890]">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Panier</span>
              </Link>
            </div>
          </div>

          <nav
            ref={menuRef}
            onMouseLeave={() => {
              setMenuOpen(false)
              setActiveMenu(null)
            }}
            className="relative border-t border-white/10"
          >
            <div className="flex items-center gap-1 py-2">
              <button
                onMouseEnter={openProductsMenuVisual}
                onClick={() => {
                  if (menuOpen && activeMenu === 'products') {
                    setMenuOpen(false)
                    setActiveMenu(null)
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
                    setMenuOpen(false)
                    setActiveMenu(null)
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
                    setMenuOpen(false)
                    setActiveMenu(null)
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
                    setMenuOpen(false)
                    setActiveMenu(null)
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
                      selectDomain('domain-products')
                      setSelectedBrand(brandId)
                      setSelectedSeries(null)
                      setSelectedModel(null)
                      setStockFilter('all')
                      setPoeFilter('all')
                      setMenuOpen(false)
                      setActiveMenu(null)
                    }}
                    onPickSeries={(brandId, seriesId) => {
                      selectDomain('domain-products')
                      setSelectedBrand(brandId)
                      setSelectedSeries(seriesId)
                      setSelectedModel(null)
                      setStockFilter('all')
                      setPoeFilter('all')
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
                    getFamilyLabel={activeMenu === 'server' ? getServerFamilyLabel : undefined}
                    onSelectDomain={selectDomain}
                    onSelectBrand={(brandId) => {
                      setSelectedBrand(brandId)
                      setSelectedSpec('')
                    }}
                    onSelectSeries={(seriesId) => {
                      setSelectedSeries(seriesId)
                      setSelectedSpec('')
                    }}
                    onSelectModel={(modelId) => {
                      if (modelId) {
                        openModelConfigurator(modelId)
                        return
                      }
                      setSelectedModel(null)
                    }}
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
            />
          </div>
        </div>
      </header>

      <section className="border-b border-[#d0d9e3] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {(selectedDomain || selectedBrand || selectedSeries || selectedModel) && (
            <nav className="mb-4 flex items-center gap-2 text-sm text-[#5a7a9a]">
              <button onClick={clearFilters} className="hover:text-[#1a3a52]">Accueil</button>
              {selectedDomainRecord && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <button onClick={() => { setSelectedBrand(null); setSelectedSeries(null); setSelectedModel(null) }} className="hover:text-[#1a3a52]">
                    {selectedDomainRecord.name.toUpperCase()}
                  </button>
                </>
              )}
              {selectedBrandRecord && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <button onClick={() => { setSelectedSeries(null); setSelectedModel(null) }} className="hover:text-[#1a3a52]">
                    {selectedBrandRecord.name.toUpperCase()}
                  </button>
                </>
              )}
              {selectedSeriesRecord && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <button onClick={() => setSelectedModel(null)} className="hover:text-[#1a3a52]">
                    {selectedSeriesRecord.name.toUpperCase()}
                  </button>
                </>
              )}
              {selectedModel && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-semibold text-[#1a3a52]">
                    {catalog.models.find((model) => model.id === selectedModel)?.name}
                  </span>
                </>
              )}
            </nav>
          )}

          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black sm:text-4xl">{activeTitle}</h1>
              <p className="mt-1 text-sm text-[#5a7a9a]">
                {loading ? 'Chargement...' : `Produits ${resultsStart}-${resultsEnd} sur ${sortedModels.length}`}
              </p>

              {isProductsDomain && (
                <div className="mt-4 grid gap-3 lg:max-w-lg">
                  <select
                    className="h-10 rounded border border-[#d0d9e3] bg-white px-3 text-sm text-[#1a3a52]"
                    value={selectedSpec}
                    onChange={(event) => setSelectedSpec(event.target.value)}
                  >
                    <option value="">Specs standard: Toutes</option>
                    {standardSpecChoices.map((specValue) => (
                      <option key={specValue} value={specValue}>{specValue}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <main id="products" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {!selectedDomain ? (
          <Card className="border-[#d0d9e3] bg-white shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7a8fa3]">Catalogue</p>
              <h2 className="mt-2 text-2xl font-black text-[#1a3a52] sm:text-3xl">Selectionnez une section dans le header</h2>
              <p className="mt-3 text-sm text-[#5a7a9a]">
                Utilisez Produits pour les produits standards (avec filtre par specs), ou les configurateurs Serveur / Storage / Reseau avec filtres PoE et stock.
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d0d9e3] bg-white p-16 text-[#5a7a9a]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d0d9e3] border-t-[#2ad1a4]" />
            <p className="mt-4 text-sm">Chargement du catalogue...</p>
          </div>
        ) : isConfiguratorDomain ? (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-[#d0d9e3] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-[#1a3a52]">Filtres</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setStockFilter('all')
                      setPoeFilter('all')
                    }}
                    className="text-sm text-[#7a8fa3] transition hover:text-[#1a3a52]"
                  >
                    Réinitialiser
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl bg-[#f8fafc] p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#7a8fa3]">Stock</p>
                    <div className="space-y-2">
                      {[
                        { value: 'all', label: 'Tous' },
                        { value: 'in', label: 'En stock' },
                        { value: 'out', label: 'Rupture' },
                      ].map((item) => {
                        const active = stockFilter === item.value
                        return (
                          <label
                            key={item.value}
                            className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${active ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="stock-filter"
                                checked={active}
                                onChange={() => setStockFilter(item.value as 'all' | 'in' | 'out')}
                                className="h-4 w-4 accent-[#2ad1a4]"
                              />
                              {item.label}
                            </span>
                            {item.value !== 'all' && <span className="text-xs text-[#7a8fa3]">({item.value === 'in' ? 'stock' : 'rupture'})</span>}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#f8fafc] p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#7a8fa3]">PoE</p>
                    <div className="space-y-2">
                      {[
                        { value: 'all', label: 'Tous' },
                        { value: 'yes', label: 'Oui' },
                        { value: 'no', label: 'Non' },
                      ].map((item) => {
                        const active = poeFilter === item.value
                        return (
                          <label
                            key={item.value}
                            className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${active ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="poe-filter"
                                checked={active}
                                onChange={() => setPoeFilter(item.value as 'all' | 'yes' | 'no')}
                                className="h-4 w-4 accent-[#2ad1a4]"
                              />
                              {item.label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-2xl border border-[#d0d9e3] bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-[#5a7a9a]">
                  {sortedModels.length === 0 ? 'Aucun produit disponible' : `Produits ${resultsStart}-${resultsEnd} sur ${sortedModels.length}`}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#5a7a9a]">Tri</span>
                  <select
                    className="h-10 min-w-[220px] rounded-lg border border-[#d0d9e3] bg-white px-3 text-sm text-[#1a3a52] shadow-sm outline-none transition focus:border-[#2ad1a4]"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as 'position' | 'name' | 'price' | 'stock')}
                  >
                    <option value="position">Position</option>
                    <option value="name">Nom du produit</option>
                    <option value="price">Prix</option>
                    <option value="stock">État du stock</option>
                  </select>
                </div>
              </div>

              {sortedModels.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d0d9e3] bg-white p-10 text-center text-[#5a7a9a] sm:p-16">
                  <Package className="h-12 w-12 text-[#d0d9e3]" />
                  <p className="mt-4 font-semibold text-[#1a3a52]">Aucun modele trouve</p>
                  <p className="mt-1 text-sm">
                    Essayez d&apos;autres filtres ou{' '}
                    <button onClick={clearFilters} className="text-[#2ad1a4] underline">
                      reinitialisez la recherche
                    </button>
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleModels.map((model) => {
                    const brand = catalog.brands.find((brandItem) => brandItem.id === model.brandId)
                    const seriesItem = catalog.series.find((seriesEntry) => seriesEntry.id === model.seriesId)
                    const stockQty = model.stockQty ?? 0
                    const isInStock = stockQty > 0

                    return (
                      <article key={model.id} className="group flex flex-col overflow-hidden rounded-xl border border-[#d0d9e3] bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#a5b8cc] hover:shadow-lg">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f7fa]">
                          {model.image ? (
                            <Image
                              src={model.image}
                              alt={model.name}
                              width={640}
                              height={480}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Package className="h-10 w-10 text-[#d0d9e3]" />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div>
                            <h3 className="line-clamp-2 font-bold leading-snug text-[#1a3a52] group-hover:text-[#0f2d45]">{model.name}</h3>
                            <p className="mt-0.5 text-[11px] text-[#7a8fa3]">Ref: {model.reference}</p>
                            {seriesItem && <p className="mt-0.5 text-[11px] text-[#7a8fa3]">Serie: {seriesItem.name}</p>}
                            {model.shortDescription && <p className="mt-1 line-clamp-2 text-xs text-[#5a7a9a]">{model.shortDescription}</p>}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {brand && <span className="rounded-full bg-[#eef3f8] px-2.5 py-0.5 text-[11px] font-semibold text-[#1a3a52]">{brand.name}</span>}
                            {seriesItem && <span className="rounded-full bg-[#eef3f8] px-2.5 py-0.5 text-[11px] font-medium text-[#334e68]">{seriesItem.name}</span>}
                            <span className={isInStock ? 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700' : 'rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700'}>
                              {isInStock ? 'En stock' : 'Rupture'}
                            </span>
                            <span className={model.poe ? 'rounded-full bg-cyan-100 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-700' : 'rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600'}>
                              {model.poe ? 'PoE Oui' : 'PoE Non'}
                            </span>
                            <span className={model.condition === 'CONFIGURABLE' ? 'rounded-full bg-[#e8faf4] px-2.5 py-0.5 text-[11px] font-semibold text-[#0f7a54]' : 'rounded-full bg-[#eef3f8] px-2.5 py-0.5 text-[11px] font-semibold text-[#1a3a52]'}>
                              {model.condition === 'CONFIGURABLE' ? 'Configurable' : 'Standard'}
                            </span>
                          </div>

                          {model.condition === 'STANDARD' && (model.specs?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {model.specs?.slice(0, 4).map((entry) => (
                                <span key={`${model.id}-${entry.key}-${entry.value}`} className="rounded-full border border-[#d0d9e3] px-2.5 py-0.5 text-[11px] text-[#334e68]">
                                  {entry.key}: {entry.value}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-auto flex items-center justify-between border-t border-[#f0f3f6] pt-3">
                            <p className="text-xl font-black text-[#1a3a52]">{model.basePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                            <button
                              type="button"
                              onClick={() => openModelConfigurator(model.id)}
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition ${model.condition === 'CONFIGURABLE' ? 'bg-[#2ad1a4] text-[#1a3a52] hover:bg-[#20b890]' : 'bg-[#eef3f8] text-[#1a3a52] hover:bg-[#dce8f2]'}`}
                            >
                              {model.condition === 'CONFIGURABLE' ? 'Configurer' : 'Voir fiche'}
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <Pagination className="pt-2">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        text="Precedent"
                        onClick={(event) => {
                          event.preventDefault()
                          setCurrentPage((page) => Math.max(1, page - 1))
                        }}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === safePage}
                          onClick={(event) => {
                            event.preventDefault()
                            setCurrentPage(page)
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        text="Suivant"
                        onClick={(event) => {
                          event.preventDefault()
                          setCurrentPage((page) => Math.min(totalPages, page + 1))
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleModels.map((model) => {
                const brand = catalog.brands.find((brandItem) => brandItem.id === model.brandId)
                const seriesItem = catalog.series.find((seriesEntry) => seriesEntry.id === model.seriesId)
                const stockQty = model.stockQty ?? 0
                const isInStock = stockQty > 0

                return (
                  <article key={model.id} className="group flex flex-col overflow-hidden rounded-xl border border-[#d0d9e3] bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#a5b8cc] hover:shadow-lg">
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f7fa]">
                      {model.image ? (
                        <Image
                          src={model.image}
                          alt={model.name}
                          width={640}
                          height={480}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-10 w-10 text-[#d0d9e3]" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <h3 className="line-clamp-2 font-bold leading-snug text-[#1a3a52] group-hover:text-[#0f2d45]">{model.name}</h3>
                        <p className="mt-0.5 text-[11px] text-[#7a8fa3]">Ref: {model.reference}</p>
                        {seriesItem && <p className="mt-0.5 text-[11px] text-[#7a8fa3]">Serie: {seriesItem.name}</p>}
                        {model.shortDescription && <p className="mt-1 line-clamp-2 text-xs text-[#5a7a9a]">{model.shortDescription}</p>}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {brand && <span className="rounded-full bg-[#eef3f8] px-2.5 py-0.5 text-[11px] font-semibold text-[#1a3a52]">{brand.name}</span>}
                        {seriesItem && <span className="rounded-full bg-[#eef3f8] px-2.5 py-0.5 text-[11px] font-medium text-[#334e68]">{seriesItem.name}</span>}
                        <span className={isInStock ? 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700' : 'rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700'}>
                          {isInStock ? 'En stock' : 'Rupture'}
                        </span>
                        <span className={model.poe ? 'rounded-full bg-cyan-100 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-700' : 'rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600'}>
                          {model.poe ? 'PoE Oui' : 'PoE Non'}
                        </span>
                        <span className={model.condition === 'CONFIGURABLE' ? 'rounded-full bg-[#e8faf4] px-2.5 py-0.5 text-[11px] font-semibold text-[#0f7a54]' : 'rounded-full bg-[#eef3f8] px-2.5 py-0.5 text-[11px] font-semibold text-[#1a3a52]'}>
                          {model.condition === 'CONFIGURABLE' ? 'Configurable' : 'Standard'}
                        </span>
                      </div>

                      {model.condition === 'STANDARD' && (model.specs?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {model.specs?.slice(0, 4).map((entry) => (
                            <span key={`${model.id}-${entry.key}-${entry.value}`} className="rounded-full border border-[#d0d9e3] px-2.5 py-0.5 text-[11px] text-[#334e68]">
                              {entry.key}: {entry.value}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between border-t border-[#f0f3f6] pt-3">
                        <p className="text-xl font-black text-[#1a3a52]">{model.basePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                        <button
                          type="button"
                          onClick={() => openModelConfigurator(model.id)}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition ${model.condition === 'CONFIGURABLE' ? 'bg-[#2ad1a4] text-[#1a3a52] hover:bg-[#20b890]' : 'bg-[#eef3f8] text-[#1a3a52] hover:bg-[#dce8f2]'}`}
                        >
                          {model.condition === 'CONFIGURABLE' ? 'Configurer' : 'Voir fiche'}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {totalPages > 1 && (
              <Pagination className="pt-2">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text="Precedent"
                      onClick={(event) => {
                        event.preventDefault()
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === safePage}
                        onClick={(event) => {
                          event.preventDefault()
                          setCurrentPage(page)
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text="Suivant"
                      onClick={(event) => {
                        event.preventDefault()
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
