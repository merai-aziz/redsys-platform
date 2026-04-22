'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Domain {
  id: string
  code: string
  name: string
  icon?: string | null
  displayOrder: number
}

interface Brand {
  id: string
  name: string
  logo?: string | null
  domainId: string
  sortOrder: number
}

interface Series {
  id: string
  name: string
  image?: string | null
  description?: string | null
  familyId: string
  brandId: string
  domainId: string
  sortOrder: number
}

interface Model {
  id: string
  name: string
  reference: string
  condition?: string | null
  seriesId: string
  brandId: string
  domainId: string
}

interface CatalogPayload {
  domains: Domain[]
  brands: Brand[]
  series: Series[]
  models: Model[]
}

type MenuKind = 'products' | 'server' | 'storage' | 'network'

function safePayload(payload: unknown): CatalogPayload {
  const p = payload as Partial<CatalogPayload> | null | undefined
  return {
    domains: Array.isArray(p?.domains) ? p.domains : [],
    brands: Array.isArray(p?.brands) ? p.brands : [],
    series: Array.isArray(p?.series) ? p.series : [],
    models: Array.isArray(p?.models) ? p.models : [],
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

function toSectionByDomain(
  domainId: string | null,
  serverDomainId: string | null,
  storageDomainId: string | null,
  networkDomainId: string | null,
): string {
  if (domainId === serverDomainId) return 'server'
  if (domainId === storageDomainId) return 'storage'
  if (domainId === networkDomainId) return 'network'
  return 'products'
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
  onExploreDomain: (domainId: string | null) => void
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
  onSelectBrand,
  onSelectSeries,
  onSelectModel,
  onExploreDomain,
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
                    onSelectModel(selectedModel === m.id ? null : m.id, {
                      domainId: activeDomainId,
                      brandId: effectiveHoveredBrand,
                      seriesId: effectiveHoveredSeries,
                    })
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
                    onExploreDomain(activeDomainId)
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

export function ConfiguratorTopMenu() {
  const router = useRouter()
  const [catalog, setCatalog] = useState<CatalogPayload>({
    domains: [],
    brands: [],
    series: [],
    models: [],
  })

  const [menuOpen, setMenuOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<MenuKind | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
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

  useEffect(() => {
    let mounted = true

    const loadCatalog = async () => {
      const res = await fetch('/api/catalog')
      if (!res.ok) return
      const payload = await res.json()
      if (mounted) {
        setCatalog(safePayload(payload))
      }
    }

    void loadCatalog()

    return () => {
      mounted = false
    }
  }, [])

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

  function goToSection(section: string, extras?: Record<string, string | null | undefined>) {
    const params = new URLSearchParams()
    params.set('section', section)

    if (extras?.brandId) params.set('brandId', extras.brandId)
    if (extras?.seriesId) params.set('seriesId', extras.seriesId)
    if (extras?.modelId) params.set('modelId', extras.modelId)

    router.push(`/?${params.toString()}#products`)
  }

  function openMenuVisual(menu: MenuKind) {
    setActiveMenu(menu)
    setMenuOpen(true)
  }

  function openDomainMenu(menu: MenuKind) {
    openMenuVisual(menu)
  }

  function openProductsMenu() {
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

    if (model.condition === 'CONFIGURABLE') {
      router.push(`/configurator/${modelId}`)
      return
    }

    const section = toSectionByDomain(
      context?.domainId ?? model.domainId,
      serverDomainId,
      storageDomainId,
      networkDomainId,
    )

    goToSection(section, {
      brandId: context?.brandId ?? model.brandId,
      seriesId: context?.seriesId ?? model.seriesId,
      modelId,
    })
  }

  return (
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
          onMouseEnter={() => openMenuVisual('products')}
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
            openDomainMenu('server')
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
            openDomainMenu('storage')
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
            openDomainMenu('network')
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
                goToSection('products', { brandId })
              }}
              onPickSeries={(brandId, seriesId) => {
                goToSection('products', { brandId, seriesId })
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
              onSelectBrand={setSelectedBrand}
              onSelectSeries={setSelectedSeries}
              onSelectModel={(modelId, context) => {
                if (modelId) {
                  setSelectedModel(modelId)
                  openModelConfigurator(modelId, context)
                  return
                }
                setSelectedModel(null)
              }}
              onExploreDomain={(domainId) => {
                goToSection(toSectionByDomain(domainId, serverDomainId, storageDomainId, networkDomainId))
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
  )
}
