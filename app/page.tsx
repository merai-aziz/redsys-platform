"use client"

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Cpu,
  HardDrive,
  Network,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
  Globe,
  Phone,
  User,
  Package,
} from 'lucide-react'

/* ──────────────────────────────────────────────
   Types  (unchanged from original)
────────────────────────────────────────────── */
interface Brand { id: string; name: string }
interface Category {
  id: string; name: string
  subCategories?: Array<{ id: string; name: string; subCategories?: Array<{ id: string; name: string }> }>
}
interface EquipmentSpec { id: string; specKey: string; specValue: string; unit: string }
interface EquipmentItem {
  id: string; name: string; reference: string; description?: string | null
  photo?: string | null; price?: string | null; quantity: number
  status: 'AVAILABLE' | 'OUT_OF_STOCK'
  equipmentType: 'SERVER' | 'STORAGE' | 'NETWORK' | 'COMPONENT'
  specs: EquipmentSpec[]
  brand: { id: string; name: string }
  category: { id: string; name: string }
}
interface CatalogPayload { brands: Brand[]; categories: Category[]; equipment: EquipmentItem[] }

/* ──────────────────────────────────────────────
   Helpers (unchanged logic)
────────────────────────────────────────────── */
function safePayload(payload: unknown): CatalogPayload {
  const p = payload as Partial<CatalogPayload> | null | undefined
  return {
    brands: Array.isArray(p?.brands) ? p.brands : [],
    categories: Array.isArray(p?.categories) ? p.categories : [],
    equipment: Array.isArray(p?.equipment) ? p.equipment : [],
  }
}

function typeLabel(type: EquipmentItem['equipmentType']) {
  return type === 'SERVER' ? 'Serveur' : type === 'STORAGE' ? 'Stockage' : type === 'NETWORK' ? 'Réseau' : 'Composant'
}

function typeIcon(type: EquipmentItem['equipmentType']) {
  if (type === 'SERVER') return <Cpu className="h-3 w-3" />
  if (type === 'STORAGE') return <HardDrive className="h-3 w-3" />
  if (type === 'NETWORK') return <Network className="h-3 w-3" />
  return <Package className="h-3 w-3" />
}

/* ──────────────────────────────────────────────
   Mega-menu overlay  (Renewtech-style 3-col)
────────────────────────────────────────────── */
interface MegaMenuProps {
  brandCategoryMap: { brandName: string; categories: string[] }[]
  selectedBrand: string | null
  selectedCategory: string | null
  onSelectBrand: (b: string | null) => void
  onSelectCategory: (c: string | null) => void
  onClose: () => void
}

function MegaMenu({ brandCategoryMap, selectedBrand, selectedCategory, onSelectBrand, onSelectCategory, onClose }: MegaMenuProps) {
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(selectedBrand ?? brandCategoryMap[0]?.brandName ?? null)

  const currentCategories = useMemo(
    () => brandCategoryMap.find(b => b.brandName === hoveredBrand)?.categories ?? [],
    [hoveredBrand, brandCategoryMap]
  )

  return (
    <div className="absolute left-0 top-full z-50 w-full shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="mx-auto max-w-7xl">
        <div className="flex overflow-hidden rounded-b-2xl border border-t-0 border-[#d0d9e3] bg-white">

          {/* Col 1 – Brands */}
          <div className="w-56 shrink-0 border-r border-[#eef1f5] bg-[#f8fafc]">
            <p className="px-5 pt-5 pb-3 text-[10px] font-bold uppercase tracking-widest text-[#a5b8cc]">Marques</p>
            {brandCategoryMap.map(b => (
              <button
                key={b.brandName}
                onMouseEnter={() => setHoveredBrand(b.brandName)}
                onClick={() => { onSelectBrand(selectedBrand === b.brandName ? null : b.brandName); onClose() }}
                className={`flex w-full items-center justify-between px-5 py-2.5 text-sm font-semibold transition-colors ${
                  hoveredBrand === b.brandName ? 'bg-[#1a3a52] text-white' : 'text-[#1a3a52] hover:bg-[#eef3f8]'
                }`}
              >
                <span>{b.brandName}</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              </button>
            ))}
          </div>

          {/* Col 2 – Categories of hovered brand */}
          <div className="w-56 shrink-0 border-r border-[#eef1f5]">
            <p className="px-5 pt-5 pb-3 text-[10px] font-bold uppercase tracking-widest text-[#a5b8cc]">Catégories</p>
            {currentCategories.length === 0 ? (
              <p className="px-5 py-3 text-xs text-[#a5b8cc]">Aucune catégorie</p>
            ) : currentCategories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  onSelectBrand(hoveredBrand)
                  onSelectCategory(selectedCategory === cat ? null : cat)
                  onClose()
                }}
                className={`flex w-full items-center gap-2 px-5 py-2.5 text-sm transition-colors ${
                  selectedCategory === cat && selectedBrand === hoveredBrand
                    ? 'bg-[#e8faf4] font-semibold text-[#0f7a54]'
                    : 'text-[#334e68] hover:bg-[#f0f7ff] hover:text-[#1a3a52]'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#2ad1a4] shrink-0" />
                {cat}
              </button>
            ))}
          </div>

          {/* Col 3 – Brand summary / promo */}
          <div className="flex-1 p-8">
            {hoveredBrand ? (
              <div className="h-full">
                <h3 className="text-2xl font-black text-[#1a3a52]">{hoveredBrand}</h3>
                <p className="mt-1 text-sm text-[#5a7a9a]">
                  {brandCategoryMap.find(b => b.brandName === hoveredBrand)?.categories.length ?? 0} catégorie(s) disponible(s)
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(brandCategoryMap.find(b => b.brandName === hoveredBrand)?.categories ?? []).map(cat => (
                    <button
                      key={cat}
                      onClick={() => { onSelectBrand(hoveredBrand); onSelectCategory(cat); onClose() }}
                      className="rounded-full border border-[#d0d9e3] bg-[#f5f7fa] px-3 py-1 text-xs font-medium text-[#1a3a52] transition hover:border-[#2ad1a4] hover:bg-[#e8faf4] hover:text-[#0f7a54]"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { onSelectBrand(hoveredBrand); onSelectCategory(null); onClose() }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1a3a52] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#2ad1a4] hover:text-[#1a3a52]"
                >
                  Voir tous les produits {hoveredBrand}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[#a5b8cc]">
                <p className="text-sm">Survolez une marque pour explorer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Main page
────────────────────────────────────────────── */
export default function Home() {
  const [catalog, setCatalog] = useState<CatalogPayload>({ brands: [], categories: [], equipment: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [equipmentType, setEquipmentType] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Mega-menu state
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch with debounce (unchanged logic)
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (query.trim()) params.set('search', query.trim())
        if (equipmentType) params.set('equipmentType', equipmentType)
        if (selectedBrand) params.set('brand', selectedBrand)
        if (selectedCategory) params.set('category', selectedCategory)

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
  }, [query, equipmentType, selectedBrand, selectedCategory])

  // Build brand→category map (unchanged logic)
  const brandCategoryMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    catalog.equipment.forEach(item => {
      if (!map.has(item.brand.name)) map.set(item.brand.name, new Set())
      map.get(item.brand.name)?.add(item.category.name)
    })
    return Array.from(map.entries())
      .map(([brandName, categories]) => ({ brandName, categories: Array.from(categories).sort() }))
      .sort((a, b) => a.brandName.localeCompare(b.brandName))
  }, [catalog.equipment])

  // Filtered equipment (unchanged logic + category filter)
  const filteredEquipment = useMemo(() => {
    let list = catalog.equipment
    if (selectedBrand) list = list.filter(i => i.brand.name === selectedBrand)
    if (selectedCategory) list = list.filter(i => i.category.name === selectedCategory)
    return list
  }, [catalog.equipment, selectedBrand, selectedCategory])

  function clearFilters() { setSelectedBrand(null); setSelectedCategory(null); setEquipmentType(''); setQuery('') }

  const hasFilters = selectedBrand || selectedCategory || equipmentType || query

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-sans">

      {/* ── Top utility bar ── */}
      <div className="bg-[#0f2436] text-xs text-white/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 sm:px-6 lg:px-8">
          <span>Livraison rapide · Support technique 24/7</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Français</span>
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> +216 XX XXX XXX</span>
          </div>
        </div>
      </div>

      {/* ── Main header ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1a3a52] shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 py-4">
            {/* Logo */}
            <div className="shrink-0 text-xl font-black tracking-tight text-white">
              Redsys<span className="text-[#2ad1a4]">Tech</span>
            </div>

            {/* Search */}
            <div className="relative hidden flex-1 md:block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un équipement, une référence…"
                className="h-10 w-full rounded-full bg-white/15 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:bg-white/25 focus:ring-2 focus:ring-[#2ad1a4]/50"
              />
            </div>

            {/* Right actions */}
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

          {/* ── Navigation bar with mega-menu trigger ── */}
          <nav className="relative border-t border-white/10" ref={menuRef}>
            <div className="flex items-center gap-1 py-2">
              {/* Produits mega-menu button */}
              <button
                onClick={() => setMenuOpen(o => !o)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                  menuOpen ? 'bg-white text-[#1a3a52]' : 'text-white hover:bg-white/10'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Produits
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Quick type filters */}
              {(['SERVER', 'STORAGE', 'NETWORK', 'COMPONENT'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setEquipmentType(equipmentType === t ? '' : t)}
                  className={`hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex ${
                    equipmentType === t ? 'bg-[#2ad1a4] text-[#1a3a52]' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {typeIcon(t)}
                  {typeLabel(t)}
                </button>
              ))}

              {/* Active filter chips */}
              {hasFilters && (
                <div className="ml-auto flex items-center gap-2">
                  {selectedBrand && (
                    <span className="flex items-center gap-1.5 rounded-full bg-[#2ad1a4]/20 px-3 py-1 text-xs font-semibold text-[#2ad1a4]">
                      {selectedBrand}
                      {selectedCategory && <span className="text-white/60">›</span>}
                      {selectedCategory && <span>{selectedCategory}</span>}
                      <button onClick={clearFilters}><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {!selectedBrand && (query || equipmentType) && (
                    <button onClick={clearFilters} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/20">
                      <X className="h-3 w-3" /> Réinitialiser
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mega-menu dropdown */}
            {menuOpen && brandCategoryMap.length > 0 && (
              <MegaMenu
                brandCategoryMap={brandCategoryMap}
                selectedBrand={selectedBrand}
                selectedCategory={selectedCategory}
                onSelectBrand={setSelectedBrand}
                onSelectCategory={setSelectedCategory}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </nav>
        </div>

        {/* Mobile search */}
        <div className="border-t border-white/10 px-4 py-2 md:hidden">
          <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2">
            <Search className="h-4 w-4 text-white/40" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
            />
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="border-b border-[#d0d9e3] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Breadcrumb */}
          {(selectedBrand || selectedCategory) && (
            <nav className="mb-4 flex items-center gap-2 text-sm text-[#5a7a9a]">
              <button onClick={clearFilters} className="hover:text-[#1a3a52]">Tous les produits</button>
              {selectedBrand && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <button onClick={() => setSelectedCategory(null)} className="hover:text-[#1a3a52]">{selectedBrand}</button>
                </>
              )}
              {selectedCategory && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-semibold text-[#1a3a52]">{selectedCategory}</span>
                </>
              )}
            </nav>
          )}

          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-black text-[#1a3a52] sm:text-4xl">
                {selectedBrand
                  ? selectedCategory
                    ? `${selectedBrand} · ${selectedCategory}`
                    : selectedBrand
                  : 'Équipements informatiques'}
              </h1>
              <p className="mt-1 text-sm text-[#5a7a9a]">
                {loading ? 'Chargement…' : `${filteredEquipment.length} résultat(s) trouvé(s)`}
              </p>
            </div>

            {/* Type filter (desktop secondary) */}
            <select
              value={equipmentType}
              onChange={e => setEquipmentType(e.target.value)}
              className="hidden rounded-lg border border-[#d0d9e3] bg-white px-4 py-2 text-sm font-semibold text-[#1a3a52] hover:border-[#a5b8cc] sm:block"
            >
              <option value="">Tous les types</option>
              <option value="SERVER">Serveur</option>
              <option value="STORAGE">Storage</option>
              <option value="NETWORK">Réseau</option>
              <option value="COMPONENT">Composant</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Products grid ── */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d0d9e3] bg-white p-16 text-[#5a7a9a]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d0d9e3] border-t-[#2ad1a4]" />
            <p className="mt-4 text-sm">Chargement du catalogue…</p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d0d9e3] bg-white p-16 text-center text-[#5a7a9a]">
            <Package className="h-12 w-12 text-[#d0d9e3]" />
            <p className="mt-4 font-semibold text-[#1a3a52]">Aucun équipement trouvé</p>
            <p className="mt-1 text-sm">Essayez d&apos;autres filtres ou{' '}
              <button onClick={clearFilters} className="text-[#2ad1a4] underline">réinitialisez la recherche</button>
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEquipment.map(item => (
              <article
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-[#d0d9e3] bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#a5b8cc]"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f7fa]">
                  {item.photo ? (
                    <img src={item.photo} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingCart className="h-10 w-10 text-[#d0d9e3]" />
                    </div>
                  )}
                  {/* Type badge */}
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#1a3a52]/90 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                    {typeIcon(item.equipmentType)}
                    {typeLabel(item.equipmentType)}
                  </span>
                  {/* Status */}
                  <span className={`absolute right-3 top-3 h-2 w-2 rounded-full ${item.status === 'AVAILABLE' ? 'bg-[#2ad1a4]' : 'bg-amber-400'}`} title={item.status === 'AVAILABLE' ? 'Disponible' : 'Rupture'} />
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <h3 className="font-bold leading-snug text-[#1a3a52] line-clamp-2 group-hover:text-[#0f2d45]">{item.name}</h3>
                    <p className="mt-0.5 text-[11px] text-[#7a8fa3]">Réf: {item.reference}</p>
                  </div>

                  {item.description && (
                    <p className="line-clamp-2 text-xs text-[#5a7a9a]">{item.description}</p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#eef3f8] px-2.5 py-0.5 text-[11px] font-semibold text-[#1a3a52]">{item.brand.name}</span>
                    <span className="rounded-full bg-[#eef3f8] px-2.5 py-0.5 text-[11px] font-medium text-[#334e68]">{item.category.name}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${item.status === 'AVAILABLE' ? 'bg-[#daf4e9] text-[#0f7a54]' : 'bg-[#fdeecf] text-[#9a6b0c]'}`}>
                      {item.status === 'AVAILABLE' ? 'Disponible' : 'Rupture'}
                    </span>
                  </div>

                  {/* Specs */}
                  {item.specs.length > 0 && (
                    <div className="space-y-1 border-t border-[#f0f3f6] pt-2.5 text-xs">
                      {item.specs.slice(0, 3).map(spec => (
                        <div key={spec.id} className="flex items-center justify-between gap-2">
                          <span className="text-[#7a8fa3]">{spec.specKey}</span>
                          <span className="font-semibold text-[#1a3a52]">{spec.specValue}{spec.unit && <span className="font-normal text-[#a5b8cc]"> {spec.unit}</span>}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Price + CTA */}
                  <div className="mt-auto flex items-center justify-between border-t border-[#f0f3f6] pt-3">
                    <p className="text-xl font-black text-[#1a3a52]">
                      {item.price ? `${item.price} DT` : <span className="text-sm font-semibold text-[#5a7a9a]">Sur demande</span>}
                    </p>
                    <button className="flex items-center gap-1.5 rounded-full bg-[#1a3a52] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#2ad1a4] hover:text-[#1a3a52]">
                      <ShoppingCart className="h-3 w-3" />
                      Ajouter
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}