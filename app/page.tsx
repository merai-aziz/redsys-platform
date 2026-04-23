"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Clock3,
  ChevronDown,
  ChevronRight,
  HardDrive,
  MessageSquare,
  Network,
  Search,
  Server,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Star,
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

interface StandardSpecFilterGroup {
  key: string
  options: Array<{ value: string; count: number }>
}

type MenuKind = 'products' | 'server' | 'storage' | 'network'

const BrandIcons: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  cisco: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="currentColor" opacity="0.1" />
      <g transform="translate(20, 35)">
        <rect x="0" y="0" width="6" height="30" fill="currentColor" rx="2" />
        <rect x="10" y="5" width="6" height="25" fill="currentColor" rx="2" />
        <rect x="20" y="0" width="6" height="30" fill="currentColor" rx="2" />
        <rect x="30" y="10" width="6" height="20" fill="currentColor" rx="2" />
        <rect x="40" y="5" width="6" height="25" fill="currentColor" rx="2" />
      </g>
    </svg>
  ),
  dell: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="currentColor" opacity="0.1" />
      <path
        d="M 30 40 Q 30 30 40 30 L 60 30 Q 70 30 70 40 L 70 60 Q 70 70 60 70 L 40 70 Q 30 70 30 60 Z"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <circle cx="50" cy="50" r="8" fill="currentColor" />
    </svg>
  ),
  hp: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="currentColor" opacity="0.1" />
      <circle cx="35" cy="50" r="8" fill="currentColor" />
      <circle cx="65" cy="50" r="8" fill="currentColor" />
      <line x1="43" y1="50" x2="57" y2="50" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  fujitsu: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="currentColor" opacity="0.1" />
      <path d="M 30 50 L 50 35 L 70 50 L 50 65 Z" fill="currentColor" opacity="0.8" />
      <path d="M 35 55 L 50 68 L 65 55 L 50 42 Z" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  lenovo: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="currentColor" opacity="0.1" />
      <path d="M 25 35 L 40 60 L 55 35 L 70 60 L 75 50" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  ),
  ibm: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="currentColor" opacity="0.1" />
      <rect x="28" y="35" width="8" height="30" fill="currentColor" />
      <rect x="46" y="35" width="8" height="30" fill="currentColor" />
      <rect x="64" y="35" width="8" height="30" fill="currentColor" />
    </svg>
  ),
  brocade: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="currentColor" opacity="0.1" />
      <path d="M 30 50 L 50 30 L 70 50 M 30 50 L 50 70 L 70 50" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  huawei: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="currentColor" opacity="0.1" />
      <circle cx="30" cy="45" r="6" fill="currentColor" />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
      <circle cx="70" cy="45" r="6" fill="currentColor" />
      <path d="M 30 45 Q 50 60 70 45" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),
  default: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="currentColor" opacity="0.1" />
      <circle cx="50" cy="50" r="12" fill="currentColor" opacity="0.5" />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
    </svg>
  ),
}

const BRAND_COLORS: Record<string, { primary: string; light: string; dark: string }> = {
  cisco: { primary: 'from-red-500 to-red-600', light: 'bg-red-50', dark: 'text-red-600' },
  dell: { primary: 'from-cyan-500 to-blue-600', light: 'bg-cyan-50', dark: 'text-cyan-600' },
  hp: { primary: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', dark: 'text-blue-600' },
  fujitsu: { primary: 'from-orange-500 to-red-600', light: 'bg-orange-50', dark: 'text-orange-600' },
  lenovo: { primary: 'from-slate-600 to-slate-700', light: 'bg-slate-50', dark: 'text-slate-700' },
  ibm: { primary: 'from-indigo-600 to-indigo-700', light: 'bg-indigo-50', dark: 'text-indigo-600' },
  brocade: { primary: 'from-orange-600 to-orange-700', light: 'bg-orange-50', dark: 'text-orange-700' },
  huawei: { primary: 'from-red-600 to-red-700', light: 'bg-red-50', dark: 'text-red-600' },
  default: { primary: 'from-slate-500 to-slate-600', light: 'bg-slate-50', dark: 'text-slate-600' },
}

function getBrandColors(brandName: string) {
  const key = brandName.toLowerCase()
  return BRAND_COLORS[key] || BRAND_COLORS.default
}

function getBrandIcon(brandName: string) {
  const key = brandName.toLowerCase()
  return BrandIcons[key] || BrandIcons.default
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

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').toLowerCase()
}

function findDomainIdByCode(domains: Domain[], code: string, fallbackNamePart: string) {
  const exact = domains.find((d) => d.code === code)
  if (exact) return exact.id

  const fallback = domains.find((d) => normalizeText(d.name).includes(fallbackNamePart))
  return fallback?.id ?? null
}

function modelMatchesStandardFilter(model: Model, filterKey: string, optionValue: string) {
  const key = normalizeText(filterKey)
  const value = normalizeText(optionValue)

  if (key === 'stock') {
    const inStock = (model.stockQty ?? 0) > 0
    if (value.includes('stock') && !value.includes('rupture')) return inStock
    if (value.includes('rupture') || value.includes('out')) return !inStock
    if (value === 'all' || value === 'tous') return true
    return false
  }

  if (key === 'poe') {
    const poe = Boolean(model.poe)
    if (value === 'oui' || value === 'yes' || value === 'true') return poe
    if (value === 'non' || value === 'no' || value === 'false') return !poe
    if (value === 'all' || value === 'tous') return true
    return false
  }

  return (model.specs ?? []).some(
    (entry) => normalizeText(entry.key) === key && normalizeText(entry.value) === value,
  )
}

function getPortAndInterface(specs: Array<{ key: string; value: string }> | undefined) {
  if (!specs || specs.length === 0) return { port: '', interface: '' }
  const portSpec = specs.find((s) => normalizeText(s.key).includes('port'))
  const interfaceSpec = specs.find((s) => normalizeText(s.key).includes('interface'))
  return {
    port: portSpec?.value ?? '',
    interface: interfaceSpec?.value ?? '',
  }
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
  onSelectModel: (
    m: string | null,
    context?: {
      domainId: string | null
      brandId: string | null
      seriesId: string | null
    },
  ) => void
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
                      ? 'bg-[#2ad1a4] text-white'
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
                      ? 'bg-[#2ad1a4] font-semibold text-white'
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
                      onSelectModel(selectedModel === m.id ? null : m.id, {
                        domainId: activeDomainId,
                        brandId: effectiveHoveredBrand,
                        seriesId: effectiveHoveredSeries,
                      })
                    onClose()
                  }}
                  className={`flex w-full items-center gap-2 px-5 py-2.5 text-sm transition-colors ${
                    selectedModel === m.id
                      ? 'bg-[#2ad1a4] font-semibold text-white'
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
    familyFilters: [],
    compatibilities: [],
    sparepartFilters: [],
    sparepartDomainFilters: [],
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
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<string, string[]>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'position' | 'name' | 'price' | 'stock'>('stock')
  const [partsBrandId, setPartsBrandId] = useState<string | null>(null)
  const [partsModelId, setPartsModelId] = useState<string | null>(null)
  const [partsStockFilter, setPartsStockFilter] = useState<'all' | 'in' | 'out'>('all')
  const [partsSelectedFilters, setPartsSelectedFilters] = useState<Record<string, string[]>>({})

  const [menuOpen, setMenuOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<MenuKind | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const sectionParamAppliedRef = useRef(false)

  const serverDomainId = useMemo(() => findDomainIdByCode(catalog.domains, 'SERVER', 'serveur'), [catalog.domains])
  const storageDomainId = useMemo(() => findDomainIdByCode(catalog.domains, 'STORAGE', 'storage'), [catalog.domains])
  const networkDomainId = useMemo(() => findDomainIdByCode(catalog.domains, 'NETWORK', 'reseau'), [catalog.domains])

  const activeDomain = useMemo(() => {
    if (activeMenu === 'server') return catalog.domains.find((d) => d.id === serverDomainId) ?? null
    if (activeMenu === 'storage') return catalog.domains.find((d) => d.id === storageDomainId) ?? null
    if (activeMenu === 'network') return catalog.domains.find((d) => d.id === networkDomainId) ?? null
    return null
  }, [activeMenu, catalog.domains, networkDomainId, serverDomainId, storageDomainId])

  const partsTargetModels = useMemo(
    () => catalog.models.filter((model) => model.condition === 'CONFIGURABLE' && model.domainId !== 'domain-products'),
    [catalog.models],
  )

  const partsBrandOptions = useMemo(() => {
    const counts = new Map<string, number>()
    partsTargetModels.forEach((model) => {
      counts.set(model.brandId, (counts.get(model.brandId) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([brandId, count]) => {
        const brand = catalog.brands.find((entry) => entry.id === brandId)
        if (!brand) return null
        return { brandId, name: brand.name, count }
      })
      .filter((entry): entry is { brandId: string; name: string; count: number } => Boolean(entry))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [catalog.brands, partsTargetModels])

  const partsModelOptions = useMemo(
    () => partsTargetModels.filter((model) => (partsBrandId ? model.brandId === partsBrandId : false)).sort((a, b) => a.name.localeCompare(b.name)),
    [partsBrandId, partsTargetModels],
  )

  const partIdsByTargetModel = useMemo(() => {
    const map = new Map<string, Set<string>>()
    catalog.compatibilities.forEach((link) => {
      const existing = map.get(link.targetProductId) ?? new Set<string>()
      existing.add(link.partProductId)
      map.set(link.targetProductId, existing)
    })
    return map
  }, [catalog.compatibilities])

  const compatiblePartModels = useMemo(() => {
    if (!partsModelId) return []

    const sparePartIds = partIdsByTargetModel.get(partsModelId) ?? new Set<string>()
    const selectedTargetModel = catalog.models.find((model) => model.id === partsModelId) ?? null
    const hasExplicitCompatibilities = sparePartIds.size > 0

    return catalog.models
      .filter((model) => model.condition === 'STANDARD' && model.domainId === 'domain-products')
      .filter((model) => {
        const family = String(model.familyName ?? '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        return family.includes('piece') || family.includes('detache')
      })
      .filter((model) => {
        if (hasExplicitCompatibilities) return sparePartIds.has(model.id)
        if (!selectedTargetModel) return false
        return model.brandId === selectedTargetModel.brandId
      })
      .filter((model) => {
        if (partsStockFilter === 'in') return (model.stockQty ?? 0) > 0
        if (partsStockFilter === 'out') return (model.stockQty ?? 0) <= 0
        return true
      })
      .filter((model) => {
        const q = query.trim().toLowerCase()
        if (!q) return true
        const haystack = `${model.name} ${model.brandName ?? ''} ${model.familyName ?? ''} ${model.categoryName ?? ''} ${model.reference}`.toLowerCase()
        return haystack.includes(q)
      })
      .filter((model) => {
        return Object.entries(partsSelectedFilters).every(([filterName, values]) => {
          if (values.length === 0) return true
          const modelValues = (model.specs ?? [])
            .filter((entry) => normalizeText(entry.key) === normalizeText(filterName))
            .map((entry) => entry.value)
          return values.some((value) => modelValues.includes(value))
        })
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [catalog.models, partIdsByTargetModel, partsModelId, partsSelectedFilters, partsStockFilter, query])

  const selectedPartsBrand = useMemo(
    () => partsBrandOptions.find((entry) => entry.brandId === partsBrandId) ?? null,
    [partsBrandId, partsBrandOptions],
  )

  const selectedPartsModel = useMemo(
    () => partsModelOptions.find((entry) => entry.id === partsModelId) ?? null,
    [partsModelId, partsModelOptions],
  )

  const partsFilterDefinitions = useMemo(() => {
    if (!partsModelId) return []

    const explicitTargetFilters = catalog.sparepartFilters.find((entry) => entry.targetProductId === partsModelId)?.filters ?? []
    if (explicitTargetFilters.length > 0) return explicitTargetFilters

    const selectedModelDomainId = catalog.models.find((entry) => entry.id === partsModelId)?.domainId
    if (!selectedModelDomainId) return []

    const selectedModelDomainCode = catalog.domains.find((entry) => entry.id === selectedModelDomainId)?.code
    if (!selectedModelDomainCode) return []

    return catalog.sparepartDomainFilters.find((entry) => normalizeText(entry.domainCode) === normalizeText(selectedModelDomainCode))?.filters ?? []
  }, [catalog.domains, catalog.models, catalog.sparepartDomainFilters, catalog.sparepartFilters, partsModelId])

  const partsFilterGroups = useMemo(() => {
    const groups = new Map<string, Map<string, number>>()

    partsFilterDefinitions.forEach((filterDefinition) => {
      const key = normalizeText(filterDefinition.name)
      const values = new Map<string, number>()

      const sourceValues = filterDefinition.values && filterDefinition.values.length > 0
        ? filterDefinition.values.map((entry) => entry.value).filter(Boolean)
        : Array.from(
            new Set(
              compatiblePartModels.flatMap((model) =>
                (model.specs ?? [])
                  .filter((spec) => normalizeText(spec.key) === key)
                  .map((spec) => spec.value)
                  .filter(Boolean),
              ),
            ),
          )

      sourceValues.forEach((value) => {
        const count = compatiblePartModels.filter((model) =>
          (model.specs ?? []).some(
            (spec) => normalizeText(spec.key) === key && normalizeText(spec.value) === normalizeText(value),
          ),
        ).length
        values.set(value, count)
      })

      groups.set(filterDefinition.name, values)
    })

    return Array.from(groups.entries()).map(([key, values]) => ({
      key,
      options: Array.from(values.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value, 'fr', { numeric: true, sensitivity: 'base' })),
    }))
  }, [compatiblePartModels, partsFilterDefinitions])

  function togglePartsFilter(filterName: string, value: string, checked: boolean) {
    setPartsSelectedFilters((previous) => {
      const current = previous[filterName] ?? []
      const next = checked ? Array.from(new Set([...current, value])) : current.filter((entry) => entry !== value)
      return { ...previous, [filterName]: next }
    })
  }

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

  function openModelConfigurator(
    modelId: string,
    context?: {
      domainId: string | null
      brandId: string | null
      seriesId: string | null
    },
  ) {
    const model = catalog.models.find((entry) => entry.id === modelId)
    if (!model) return

    setMenuOpen(false)
    setActiveMenu(null)
    if (model.condition !== 'CONFIGURABLE') {
      if (context?.domainId !== undefined) setSelectedDomain(context.domainId)
      if (context?.brandId !== undefined) setSelectedBrand(context.brandId)
      if (context?.seriesId !== undefined) setSelectedSeries(context.seriesId)
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
    if (sectionParamAppliedRef.current) return

    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)

    const section = params.get('section')
    const brandIdParam = params.get('brandId')
    const seriesIdParam = params.get('seriesId')
    const modelIdParam = params.get('modelId')
    if (!section) {
      sectionParamAppliedRef.current = true
      return
    }

    if (section === 'products') {
      setSelectedDomain('domain-products')
      setSelectedBrand(brandIdParam)
      setSelectedSeries(seriesIdParam)
      setSelectedModel(modelIdParam)
      sectionParamAppliedRef.current = true
      return
    }

    if (section === 'server' && serverDomainId) {
      setSelectedDomain(serverDomainId)
      setSelectedBrand(brandIdParam)
      setSelectedSeries(seriesIdParam)
      setSelectedModel(modelIdParam)
      sectionParamAppliedRef.current = true
      return
    }

    if (section === 'storage' && storageDomainId) {
      setSelectedDomain(storageDomainId)
      setSelectedBrand(brandIdParam)
      setSelectedSeries(seriesIdParam)
      setSelectedModel(modelIdParam)
      sectionParamAppliedRef.current = true
      return
    }

    if (section === 'network' && networkDomainId) {
      setSelectedDomain(networkDomainId)
      setSelectedBrand(brandIdParam)
      setSelectedSeries(seriesIdParam)
      setSelectedModel(modelIdParam)
      sectionParamAppliedRef.current = true
    }
  }, [networkDomainId, serverDomainId, storageDomainId])

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/catalog')
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
  }, [])

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

  const selectedFamilyFilters = useMemo(() => {
    const familyId = selectedSeriesRecord?.familyId
    if (!familyId) return []

    const assigned = catalog.familyFilters.find((entry) => entry.familyId === familyId)
    if (!assigned) return []

    return assigned.filters
  }, [catalog.familyFilters, selectedSeriesRecord?.familyId])

  const selectedFamilyFilterKeys = useMemo(
    () => selectedFamilyFilters.map((entry) => entry.name.trim()).filter(Boolean),
    [selectedFamilyFilters],
  )

  const configuratorBrandOptions = useMemo(() => {
    if (!isConfiguratorDomain || !selectedDomain) return []

    const counts = new Map<string, number>()

    catalog.models.forEach((model) => {
      if (model.domainId !== selectedDomain) return
      if (model.condition !== 'CONFIGURABLE') return
      if (selectedSeries && model.seriesId !== selectedSeries) return

      counts.set(model.brandId, (counts.get(model.brandId) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([brandId, count]) => {
        const brand = catalog.brands.find((entry) => entry.id === brandId)
        if (!brand) return null

        return {
          brandId,
          name: brand.name,
          count,
        }
      })
      .filter((entry): entry is { brandId: string; name: string; count: number } => Boolean(entry))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [catalog.brands, catalog.models, isConfiguratorDomain, selectedDomain, selectedSeries])

  const configuratorBrandTotal = useMemo(
    () => configuratorBrandOptions.reduce((sum, item) => sum + item.count, 0),
    [configuratorBrandOptions],
  )

  const productBrandOptions = useMemo(() => {
    const counts = new Map<string, number>()

    catalog.models.forEach((model) => {
      if (model.domainId !== 'domain-products') return
      if (model.condition !== 'STANDARD') return

      counts.set(model.brandId, (counts.get(model.brandId) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([brandId, count]) => {
        const brand = catalog.brands.find((entry) => entry.id === brandId)
        if (!brand) return null

        return {
          brandId,
          name: brand.name,
          count,
        }
      })
      .filter((entry): entry is { brandId: string; name: string; count: number } => Boolean(entry))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [catalog.brands, catalog.models])

  const productBrandTotal = useMemo(
    () => productBrandOptions.reduce((sum, item) => sum + item.count, 0),
    [productBrandOptions],
  )

  const productFamilyOptions = useMemo(() => {
    if (!selectedBrand) return []

    const counts = new Map<string, number>()

    catalog.models.forEach((model) => {
      if (model.domainId !== 'domain-products') return
      if (model.condition !== 'STANDARD') return
      if (model.brandId !== selectedBrand) return

      counts.set(model.seriesId, (counts.get(model.seriesId) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([seriesId, count]) => {
        const family = catalog.series.find((entry) => entry.id === seriesId)
        if (!family) return null

        return {
          seriesId,
          name: family.name,
          count,
        }
      })
      .filter((entry): entry is { seriesId: string; name: string; count: number } => Boolean(entry))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [catalog.models, catalog.series, selectedBrand])

  const productFamilyTotal = useMemo(
    () => productFamilyOptions.reduce((sum, item) => sum + item.count, 0),
    [productFamilyOptions],
  )

  useEffect(() => {
    if (!isProductsDomain) return
    if (!selectedBrand) {
      if (selectedSeries) {
        setSelectedSeries(null)
      }
      return
    }

    if (selectedSeries && !productFamilyOptions.some((item) => item.seriesId === selectedSeries)) {
      setSelectedSeries(null)
    }
  }, [isProductsDomain, productFamilyOptions, selectedBrand, selectedSeries])

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

  const standardSpecGroups = useMemo<StandardSpecFilterGroup[]>(() => {
    if (!isProductsDomain || !selectedSeries) return []

    const groups = new Map<string, Map<string, number>>()

    selectedFamilyFilters.forEach((filterDef) => {
      const key = filterDef.name.trim()
      if (!key) return

      const valuesWithCount = new Map<string, number>()
      const configuredValues = filterDef.values.map((value) => value.trim()).filter(Boolean)

      const sourceValues = configuredValues.length > 0
        ? configuredValues
        : Array.from(
          new Set(
            baseModels.flatMap((model) =>
              (model.specs ?? [])
                .filter((entry) => normalizeText(entry.key) === normalizeText(key))
                .map((entry) => entry.value.trim())
                .filter(Boolean),
            ),
          ),
        )

      sourceValues.forEach((optionValue) => {
        const count = baseModels.filter(
          (model) => model.condition === 'STANDARD' && modelMatchesStandardFilter(model, key, optionValue),
        ).length
        valuesWithCount.set(optionValue, count)
      })

      groups.set(key, valuesWithCount)
    })

    const builtGroups = Array.from(groups.entries())
      .map(([key, values]) => ({
        key,
        options: Array.from(values.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value, 'fr', { numeric: true, sensitivity: 'base' })),
      }))
      .sort((a, b) => a.key.localeCompare(b.key, 'fr', { numeric: true, sensitivity: 'base' }))

    const allowed = new Set(selectedFamilyFilterKeys.map((key) => key.toLowerCase()))
    return builtGroups.filter((group) => allowed.has(group.key.toLowerCase()))
  }, [baseModels, isProductsDomain, selectedFamilyFilterKeys, selectedFamilyFilters, selectedSeries])

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return baseModels
      .filter((model) => {
        if (normalizedQuery) {
          const brandName = catalog.brands.find((brand) => brand.id === model.brandId)?.name ?? ''
          const seriesName = catalog.series.find((item) => item.id === model.seriesId)?.name ?? ''
          const domainName = catalog.domains.find((domain) => domain.id === model.domainId)?.name ?? ''
          const specsText = (model.specs ?? [])
            .map((entry) => `${entry.key} ${entry.value}`)
            .join(' ')

          const haystack = [
            model.name,
            model.reference,
            brandName,
            seriesName,
            domainName,
            model.shortDescription ?? '',
            model.longDescription ?? '',
            specsText,
          ]
            .join(' ')
            .toLowerCase()

          if (!haystack.includes(normalizedQuery)) return false
        }

        if (isConfiguratorDomain) {
          if (stockFilter === 'in' && (model.stockQty ?? 0) <= 0) return false
          if (stockFilter === 'out' && (model.stockQty ?? 0) > 0) return false
          if (poeFilter === 'yes' && !model.poe) return false
          if (poeFilter === 'no' && model.poe) return false
        }

        if (isProductsDomain && model.condition === 'STANDARD') {
          const activeSpecFilters = Object.entries(selectedSpecFilters).filter(([, values]) => values.length > 0)

          for (const [specKey, selectedValues] of activeSpecFilters) {
            const match = selectedValues.some((value) => modelMatchesStandardFilter(model, specKey, value))

            if (!match) return false
          }
        }
        return true
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [baseModels, catalog.brands, catalog.domains, catalog.series, isConfiguratorDomain, isProductsDomain, poeFilter, query, selectedSpecFilters, stockFilter])

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
  }, [query, selectedDomain, selectedBrand, selectedSeries, selectedModel, stockFilter, poeFilter, selectedSpecFilters])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!partsBrandId) {
      if (partsModelId) setPartsModelId(null)
      return
    }

    if (partsModelId && !partsModelOptions.some((model) => model.id === partsModelId)) {
      setPartsModelId(null)
    }
  }, [partsBrandId, partsModelId, partsModelOptions])

  function clearFilters() {
    setSelectedDomain(null)
    setSelectedBrand(null)
    setSelectedSeries(null)
    setSelectedModel(null)
    setQuery('')
    setStockFilter('all')
    setPoeFilter('all')
    setSelectedSpecFilters({})
    setSortBy('stock')
    setCurrentPage(1)
    setPartsBrandId(null)
    setPartsModelId(null)
    setPartsStockFilter('all')
  }

  function toggleStandardSpecFilter(specKey: string, specValue: string, checked: boolean) {
    setSelectedSpecFilters((previous) => {
      const current = previous[specKey] ?? []
      const nextValues = checked
        ? Array.from(new Set([...current, specValue]))
        : current.filter((value) => value !== specValue)

      if (nextValues.length === 0) {
        const next = { ...previous }
        delete next[specKey]
        return next
      }

      return {
        ...previous,
        [specKey]: nextValues,
      }
    })
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
  const hasActiveSelection = Boolean(selectedDomain || selectedBrand || selectedSeries || selectedModel)

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
                      setSelectedSpecFilters({})
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
                      setSelectedSpecFilters({})
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
                      setSelectedSpecFilters({})
                    }}
                    onSelectSeries={(seriesId) => {
                      setSelectedSeries(seriesId)
                      setSelectedSpecFilters({})
                    }}
                    onSelectModel={(modelId, context) => {
                      if (modelId) {
                        openModelConfigurator(modelId, context)
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

      {hasActiveSelection && (
        <section className="border-b border-[#d0d9e3] bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

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

            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black sm:text-4xl">{activeTitle}</h1>
                <p className="mt-1 text-sm text-[#5a7a9a]">
                  {loading ? 'Chargement...' : `Produits ${resultsStart}-${resultsEnd} sur ${sortedModels.length}`}
                </p>

                {isProductsDomain && selectedSeries && standardSpecGroups.length === 0 && (
                  <p className="mt-3 text-sm text-[#5a7a9a]">Aucun filtre configure pour cette famille.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <main id="products" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {!selectedDomain ? (
          loading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d0d9e3] bg-white p-16 text-[#5a7a9a]">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d0d9e3] border-t-[#2ad1a4]" />
              <p className="mt-4 text-sm">Chargement du Parts Finder...</p>
            </div>
          ) : (
          <div className="space-y-10">
            {!partsBrandId && (
              <>
                <div className="space-y-3 text-center">
                  <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Parts Finder</h1>
                  <p className="text-base text-slate-600 sm:text-lg">
                    Trouver des pièces détachées adaptées à votre serveur spécifique
                  </p>
                </div>

                <div className="mx-auto max-w-4xl">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 font-bold text-white shadow-lg">
                        1
                      </div>
                      <span className="hidden text-center text-xs font-semibold text-teal-600 sm:inline-block sm:text-sm">
                        Marque
                      </span>
                    </div>

                    <div className="hidden h-1 flex-1 rounded-full bg-gradient-to-r from-teal-200 to-slate-300 sm:block" />

                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-300 font-bold text-slate-600">
                        2
                      </div>
                      <span className="hidden text-center text-xs font-semibold text-slate-500 sm:inline-block sm:text-sm">
                        Modèle
                      </span>
                    </div>

                    <div className="hidden h-1 flex-1 rounded-full bg-gradient-to-r from-slate-300 to-slate-200 sm:block" />

                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-300 font-bold text-slate-600">
                        3
                      </div>
                      <span className="hidden text-center text-xs font-semibold text-slate-500 sm:inline-block sm:text-sm">
                        Résultats
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                  {partsBrandOptions.map((item) => {
                    const colors = getBrandColors(item.name)
                    const IconComponent = getBrandIcon(item.name)

                    return (
                      <button
                        key={item.brandId}
                        onClick={() => {
                          setPartsBrandId(item.brandId)
                          setPartsModelId(null)
                          setPartsSelectedFilters({})
                        }}
                        className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${colors.primary} opacity-0 transition-opacity duration-300 group-hover:opacity-5`} />

                        <div className="relative flex h-full flex-col space-y-4 p-6">
                          <div className={`${colors.light} flex items-center justify-center rounded-xl p-6 transition-transform duration-300 group-hover:scale-110`}>
                            <IconComponent className={`h-16 w-16 ${colors.dark}`} />
                          </div>

                          <div className="flex-1 space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-slate-950">
                              {item.name}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {item.count} modèle{item.count > 1 ? 's' : ''}
                            </p>
                          </div>

                          <span
                            className="flex items-center justify-center gap-2 rounded-xl bg-[#2ad1a4] px-4 py-3 font-semibold text-white transition-all duration-300 hover:bg-[#20b890] hover:shadow-lg"
                          >
                            Sélectionner
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {partsBrandId && !partsModelId && (
              <>
                <div className="space-y-3 text-center">
                  <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Parts Finder</h1>
                  <p className="text-base text-slate-600 sm:text-lg">
                    Trouver des pièces détachées adaptées à votre serveur spécifique
                  </p>
                </div>

                <div className="mx-auto max-w-4xl">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500 font-bold text-white">
                        ✓
                      </div>
                      <span className="hidden text-center text-xs font-semibold text-teal-600 sm:inline-block sm:text-sm">
                        Marque
                      </span>
                    </div>

                    <div className="hidden h-1 flex-1 rounded-full bg-gradient-to-r from-teal-200 to-teal-300 sm:block" />

                    <div className="flex flex-col items-center gap-2">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${getBrandColors(selectedPartsBrand?.name || '').primary} font-bold text-white shadow-lg`}>
                        2
                      </div>
                      <span className="hidden text-center text-xs font-semibold text-teal-600 sm:inline-block sm:text-sm">
                        Modèle
                      </span>
                    </div>

                    <div className="hidden h-1 flex-1 rounded-full bg-gradient-to-r from-slate-300 to-slate-200 sm:block" />

                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-300 font-bold text-slate-600">
                        3
                      </div>
                      <span className="hidden text-center text-xs font-semibold text-slate-500 sm:inline-block sm:text-sm">
                        Résultats
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setPartsBrandId(null)
                      setPartsModelId(null)
                    }}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Retour</span>
                  </button>
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    Modèles {selectedPartsBrand?.name}
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                  {partsModelOptions.map((model) => {
                    const brandColors = getBrandColors(selectedPartsBrand?.name || '')

                    return (
                      <button
                        key={model.id}
                          onClick={() => {
                            setPartsModelId(model.id)
                            setPartsSelectedFilters({})
                          }}
                        className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${brandColors.primary} opacity-0 transition-opacity duration-300 group-hover:opacity-5`} />

                        <div className="relative flex h-full flex-col space-y-4 p-6">
                          <div className={`${brandColors.light} flex aspect-video items-center justify-center rounded-xl p-8 transition-transform duration-300 group-hover:scale-110`}>
                            <div className="text-4xl font-black text-slate-600 opacity-30">
                              {model.name.charAt(0)}
                            </div>
                          </div>

                          <div className="flex-1">
                            <h3 className="line-clamp-2 text-base font-bold text-slate-900 transition-colors group-hover:text-slate-950">
                              {model.name}
                            </h3>
                          </div>

                          <span
                            className="flex items-center justify-center gap-2 rounded-xl bg-[#2ad1a4] px-4 py-3 font-semibold text-white transition-all duration-300 hover:bg-[#20b890] hover:shadow-lg"
                          >
                            Sélectionner
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {partsBrandId && partsModelId && (
              <>
                <div className="space-y-3 text-center">
                  <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Parts Finder</h1>
                  <p className="text-base text-slate-600 sm:text-lg">
                    Trouver des pièces détachées adaptées à votre serveur spécifique
                  </p>
                </div>

                <div className="mx-auto max-w-4xl">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500 font-bold text-white">
                        ✓
                      </div>
                      <span className="hidden text-center text-xs font-semibold text-teal-600 sm:inline-block sm:text-sm">
                        Marque
                      </span>
                    </div>

                    <div className="hidden h-1 flex-1 rounded-full bg-gradient-to-r from-teal-200 to-teal-300 sm:block" />

                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500 font-bold text-white">
                        ✓
                      </div>
                      <span className="hidden text-center text-xs font-semibold text-teal-600 sm:inline-block sm:text-sm">
                        Modèle
                      </span>
                    </div>

                    <div className="hidden h-1 flex-1 rounded-full bg-gradient-to-r from-teal-200 to-teal-300 sm:block" />

                    <div className="flex flex-col items-center gap-2">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${getBrandColors(selectedPartsBrand?.name || '').primary} font-bold text-white shadow-lg`}>
                        3
                      </div>
                      <span className="hidden text-center text-xs font-semibold text-teal-600 sm:inline-block sm:text-sm">
                        Résultats
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                    <div className="rounded-2xl border border-[#d0d9e3] bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-base font-bold text-[#1a3a52]">Filtres</h3>
                        <button
                          type="button"
                          onClick={() => {
                            setPartsSelectedFilters({})
                            setPartsStockFilter('all')
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
                              { value: 'all', label: 'Tous les stocks' },
                              { value: 'in', label: 'En stock' },
                              { value: 'out', label: 'En rupture' },
                            ].map((item) => {
                              const active = partsStockFilter === item.value
                              return (
                                <label
                                  key={item.value}
                                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${active ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                                >
                                  <span className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="parts-stock-filter"
                                      checked={active}
                                      onChange={() => setPartsStockFilter(item.value as 'all' | 'in' | 'out')}
                                      className="h-4 w-4 accent-[#2ad1a4]"
                                    />
                                    {item.label}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </div>

                        {partsFilterGroups.length === 0 ? (
                          <p className="rounded-xl bg-[#f8fafc] p-3 text-sm text-[#5a7a9a]">Aucun filtre disponible pour ces pièces.</p>
                        ) : (
                          partsFilterGroups.map((group) => (
                            <div key={group.key} className="rounded-xl bg-[#f8fafc] p-3">
                              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#7a8fa3]">{group.key}</p>
                              <div className="space-y-2">
                                {group.options.map((option) => {
                                  const checked = (partsSelectedFilters[group.key] ?? []).includes(option.value)
                                  return (
                                    <label
                                      key={`${group.key}-${option.value}`}
                                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${checked ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(event) => togglePartsFilter(group.key, option.value, event.target.checked)}
                                          className="h-4 w-4 accent-[#2ad1a4]"
                                        />
                                        {option.value}
                                      </span>
                                      <span className="text-xs text-[#7a8fa3]">({option.count})</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </aside>

                  <div className="space-y-4">
                    <div className="space-y-4 rounded-2xl border-2 border-slate-200 bg-white p-6 sm:flex sm:items-center sm:justify-between sm:space-y-0">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                          Pièces compatibles
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                          {selectedPartsBrand?.name} • {selectedPartsModel?.name}
                        </p>
                      </div>

                      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <button
                          onClick={() => {
                            setPartsModelId(null)
                            setPartsSelectedFilters({})
                          }}
                          className="order-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-100 sm:order-1 sm:justify-start"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Changer</span>
                        </button>
                      </div>
                    </div>

                    {compatiblePartModels.length === 0 ? (
                      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-12 text-center">
                        <p className="text-lg font-semibold text-slate-900">Aucune pièce compatible trouvée</p>
                        <p className="mt-2 text-sm text-slate-500">Essayez de modifier votre sélection</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                        {compatiblePartModels.map((model) => {
                          const inStock = (model.stockQty ?? 0) > 0
                          const brandColors = getBrandColors(selectedPartsBrand?.name || '')

                          return (
                            <article
                              key={model.id}
                              className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
                            >
                              <div className={`absolute inset-0 bg-gradient-to-br ${brandColors.primary} opacity-0 transition-opacity duration-300 group-hover:opacity-5`} />

                              <div className="relative flex h-full flex-col space-y-3 p-5">
                                <div className={`${brandColors.light} flex aspect-video items-center justify-center rounded-xl p-4 transition-transform duration-300 group-hover:scale-105`}>
                                  <div className="text-3xl font-black text-slate-600 opacity-30">
                                    {model.name.charAt(0)}
                                  </div>
                                </div>

                                <div className="flex-1 space-y-2">
                                  <h4 className="line-clamp-2 text-sm font-bold text-slate-900 transition-colors group-hover:text-slate-950">
                                    {model.name}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    {model.brandName} • {model.familyName}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                                  <span
                                    className={`text-xs font-bold uppercase tracking-wide ${
                                      inStock ? 'text-emerald-600' : 'text-amber-600'
                                    }`}
                                  >
                                    {inStock ? '✓ Stock' : '✕ Rupture'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <p className={`bg-gradient-to-br ${brandColors.primary} bg-clip-text text-lg font-black text-transparent`}>
                                    {model.basePrice.toLocaleString('fr-FR', {
                                      style: 'currency',
                                      currency: 'EUR',
                                    })}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => openModelConfigurator(model.id)}
                                    className="inline-flex items-center justify-center rounded-full bg-[#2ad1a4] p-2 text-white transition hover:bg-[#20b890]"
                                    title="Ajouter au panier"
                                  >
                                    <ShoppingCart className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          )
        ) : loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d0d9e3] bg-white p-16 text-[#5a7a9a]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d0d9e3] border-t-[#2ad1a4]" />
            <p className="mt-4 text-sm">Chargement du catalogue...</p>
          </div>
        ) : isConfiguratorDomain || isProductsDomain ? (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-[#d0d9e3] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-[#1a3a52]">Filtres</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (isConfiguratorDomain) {
                        setSelectedBrand(null)
                        setSelectedModel(null)
                        setStockFilter('all')
                        setPoeFilter('all')
                      }
                      if (isProductsDomain) {
                        setSelectedBrand(null)
                        setSelectedSeries(null)
                        setSelectedModel(null)
                        setSelectedSpecFilters({})
                      }
                    }}
                    className="text-sm text-[#7a8fa3] transition hover:text-[#1a3a52]"
                  >
                    Réinitialiser
                  </button>
                </div>

                <div className="space-y-4">
                  {isConfiguratorDomain && (
                    <>
                      <div className="rounded-xl bg-[#f8fafc] p-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#7a8fa3]">Marque</p>
                        <div className="space-y-2">
                          <label
                            className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${selectedBrand === null ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="brand-filter"
                                checked={selectedBrand === null}
                                onChange={() => {
                                  setSelectedBrand(null)
                                  setSelectedModel(null)
                                }}
                                className="h-4 w-4 accent-[#2ad1a4]"
                              />
                              Toutes
                            </span>
                            <span className="text-xs text-[#7a8fa3]">({configuratorBrandTotal})</span>
                          </label>

                          {configuratorBrandOptions.map((item) => {
                            const active = selectedBrand === item.brandId

                            return (
                              <label
                                key={item.brandId}
                                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${active ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                              >
                                <span className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="brand-filter"
                                    checked={active}
                                    onChange={() => {
                                      setSelectedBrand(item.brandId)
                                      setSelectedModel(null)
                                    }}
                                    className="h-4 w-4 accent-[#2ad1a4]"
                                  />
                                  {item.name}
                                </span>
                                <span className="text-xs text-[#7a8fa3]">({item.count})</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>

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
                    </>
                  )}

                  {isProductsDomain && (
                    <>
                      <div className="rounded-xl bg-[#f8fafc] p-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#7a8fa3]">Marque</p>
                        <div className="space-y-2">
                          <label
                            className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${selectedBrand === null ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="products-brand-filter"
                                checked={selectedBrand === null}
                                onChange={() => {
                                  setSelectedBrand(null)
                                  setSelectedSeries(null)
                                  setSelectedModel(null)
                                  setSelectedSpecFilters({})
                                }}
                                className="h-4 w-4 accent-[#2ad1a4]"
                              />
                              Toutes
                            </span>
                            <span className="text-xs text-[#7a8fa3]">({productBrandTotal})</span>
                          </label>

                          {productBrandOptions.map((item) => {
                            const active = selectedBrand === item.brandId

                            return (
                              <label
                                key={item.brandId}
                                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${active ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                              >
                                <span className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="products-brand-filter"
                                    checked={active}
                                    onChange={() => {
                                      setSelectedBrand(item.brandId)
                                      setSelectedSeries(null)
                                      setSelectedModel(null)
                                      setSelectedSpecFilters({})
                                    }}
                                    className="h-4 w-4 accent-[#2ad1a4]"
                                  />
                                  {item.name}
                                </span>
                                <span className="text-xs text-[#7a8fa3]">({item.count})</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#f8fafc] p-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#7a8fa3]">
                          {selectedBrandRecord ? `Famille - ${selectedBrandRecord.name}` : 'Famille'}
                        </p>
                        {!selectedBrand ? (
                          <p className="rounded-lg border border-[#d0d9e3] bg-white px-3 py-2 text-sm text-[#5a7a9a]">
                            Selectionnez une marque pour afficher les familles.
                          </p>
                        ) : productFamilyOptions.length === 0 ? (
                          <p className="rounded-lg border border-[#d0d9e3] bg-white px-3 py-2 text-sm text-[#5a7a9a]">
                            Aucune famille trouvee pour cette marque.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <label
                              className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${selectedSeries === null ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                            >
                              <span className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="products-family-filter"
                                  checked={selectedSeries === null}
                                  onChange={() => {
                                    setSelectedSeries(null)
                                    setSelectedModel(null)
                                    setSelectedSpecFilters({})
                                  }}
                                  className="h-4 w-4 accent-[#2ad1a4]"
                                />
                                Toutes
                              </span>
                              <span className="text-xs text-[#7a8fa3]">({productFamilyTotal})</span>
                            </label>

                            {productFamilyOptions.map((item) => {
                              const active = selectedSeries === item.seriesId

                              return (
                                <label
                                  key={item.seriesId}
                                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${active ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                                >
                                  <span className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="products-family-filter"
                                      checked={active}
                                      onChange={() => {
                                        setSelectedSeries(item.seriesId)
                                        setSelectedModel(null)
                                        setSelectedSpecFilters({})
                                      }}
                                      className="h-4 w-4 accent-[#2ad1a4]"
                                    />
                                    {item.name}
                                  </span>
                                  <span className="text-xs text-[#7a8fa3]">({item.count})</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {!selectedSeries ? (
                        <p className="rounded-xl bg-[#f8fafc] p-3 text-sm text-[#5a7a9a]">Selectionnez une famille pour afficher les filtres.</p>
                      ) : standardSpecGroups.length === 0 ? (
                        <p className="rounded-xl bg-[#f8fafc] p-3 text-sm text-[#5a7a9a]">Aucun filtre configure pour cette famille.</p>
                      ) : (
                        standardSpecGroups.map((group) => (
                          <div key={group.key} className="rounded-xl bg-[#f8fafc] p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#7a8fa3]">{group.key}</p>
                            <div className="space-y-2">
                              {group.options.map((option) => {
                                const checked = (selectedSpecFilters[group.key] ?? []).includes(option.value)

                                return (
                                  <label
                                    key={`${group.key}-${option.value}`}
                                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${checked ? 'border-[#2ad1a4] bg-[#f0fdf9] text-[#1a3a52] ring-1 ring-[#2ad1a4]' : 'border-[#d0d9e3] bg-white text-[#334e68] hover:border-[#a5b8cc] hover:bg-[#f9fbfc]'}`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(event) => toggleStandardSpecFilter(group.key, option.value, event.target.checked)}
                                        className="h-4 w-4 accent-[#2ad1a4]"
                                      />
                                      {option.value}
                                    </span>
                                    <span className="text-xs text-[#7a8fa3]">({option.count})</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </div>
            </aside>

            <div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-2xl border border-[#d0d9e3] bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-[#5a7a9a]">
                  {sortedModels.length === 0 ? 'Aucun article disponible' : `${resultsStart}-${resultsEnd} sur ${sortedModels.length}`}
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
                    const stockQty = model.stockQty ?? 0
                    const isInStock = stockQty > 0
                    const { port, interface: interfaceType } = getPortAndInterface(model.specs)
                    const fullName = [model.name, port, interfaceType].filter(Boolean).join(' / ')

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
                            <h3 className="line-clamp-2 font-bold leading-snug text-[#1a3a52] group-hover:text-[#0f2d45]">{fullName}</h3>
                            {brand && <p className="mt-1 text-sm font-semibold text-[#1a3a52]">{brand.name}</p>}
                          </div>

                          <div className="mt-auto flex items-center justify-between border-t border-[#f0f3f6] pt-3">
                            <div className="flex items-center gap-2">
                              <span className={isInStock ? 'text-xs font-semibold text-emerald-700' : 'text-xs font-semibold text-amber-700'}>
                                {isInStock ? 'En stock' : 'Rupture'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <p className="text-lg font-black text-[#1a3a52]">{model.basePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                            <button
                              type="button"
                              disabled={!isInStock}
                              onClick={() => openModelConfigurator(model.id)}
                              className={`inline-flex items-center justify-center rounded-full p-2 text-white transition ${isInStock ? 'bg-[#2ad1a4] hover:bg-[#20b890]' : 'cursor-not-allowed bg-slate-300 text-slate-500'}`}
                              title={isInStock ? (isConfiguratorDomain ? 'Configurer le modèle' : 'Ajouter au panier') : 'Rupture de stock'}
                            >
                              {isConfiguratorDomain ? (
                                <Sliders className="h-5 w-5" />
                              ) : (
                                <ShoppingCart className="h-5 w-5" />
                              )}
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
                const stockQty = model.stockQty ?? 0
                const isInStock = stockQty > 0
                const { port, interface: interfaceType } = getPortAndInterface(model.specs)
                const fullName = [model.name, port, interfaceType].filter(Boolean).join(' / ')

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
                        <h3 className="line-clamp-2 font-bold leading-snug text-[#1a3a52] group-hover:text-[#0f2d45]">{fullName}</h3>
                        {brand && <p className="mt-1 text-sm font-semibold text-[#1a3a52]">{brand.name}</p>}
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-[#f0f3f6] pt-3">
                        <div className="flex items-center gap-2">
                          <span className={isInStock ? 'text-xs font-semibold text-emerald-700' : 'text-xs font-semibold text-amber-700'}>
                            {isInStock ? 'En stock' : 'Rupture'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <p className="text-lg font-black text-[#1a3a52]">{model.basePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                        <button
                          type="button"
                              disabled={!isInStock}
                          onClick={() => openModelConfigurator(model.id)}
                              className={`inline-flex items-center justify-center rounded-full p-2 text-white transition ${isInStock ? 'bg-[#2ad1a4] hover:bg-[#20b890]' : 'cursor-not-allowed bg-slate-300 text-slate-500'}`}
                              title={isInStock ? 'Ajouter au panier' : 'Rupture de stock'}
                        >
                          <ShoppingCart className="h-5 w-5" />
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
