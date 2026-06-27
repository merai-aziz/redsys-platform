"use client"

/**
 * PartsFinder — composant autonome
 *
 * Props reçues depuis page.tsx (aucun changement de logique) :
 *   partsBrandId, partsModelId, partsStockFilter, partsSelectedFilters
 *   partsBrandOptions, partsModelOptions, compatiblePartModels
 *   selectedPartsBrand, selectedPartsModel, partsFilterGroups
 *   setPartsBrandId, setPartsModelId, setPartsStockFilter
 *   togglePartsFilter, addSparePartToCart, query
 *
 * Usage dans page.tsx — remplacer le bloc `!selectedDomain` par :
 *   <PartsFinder {...partsFinderProps} />
 */

import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Package,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  Server,
  Zap,
  X,
} from 'lucide-react'

/* ─── Brand palette ─────────────────────────────────────────────────────────── */
const BRAND_COLORS: Record<string, { from: string; to: string; light: string; text: string; ring: string }> = {
  cisco:   { from: 'from-red-500',    to: 'to-rose-600',    light: 'bg-red-50',    text: 'text-red-600',    ring: 'ring-red-200'    },
  dell:    { from: 'from-cyan-500',   to: 'to-blue-600',    light: 'bg-cyan-50',   text: 'text-cyan-700',   ring: 'ring-cyan-200'   },
  hp:      { from: 'from-blue-500',   to: 'to-indigo-600',  light: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-200'   },
  fujitsu: { from: 'from-orange-400', to: 'to-red-500',     light: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-200' },
  lenovo:  { from: 'from-slate-600',  to: 'to-slate-800',   light: 'bg-slate-100', text: 'text-slate-700',  ring: 'ring-slate-300'  },
  ibm:     { from: 'from-indigo-600', to: 'to-indigo-800',  light: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200' },
  brocade: { from: 'from-orange-600', to: 'to-amber-700',   light: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200' },
  huawei:  { from: 'from-rose-500',   to: 'to-red-700',     light: 'bg-rose-50',   text: 'text-rose-700',   ring: 'ring-rose-200'   },
}
const DEFAULT_COLOR = { from: 'from-slate-500', to: 'to-slate-700', light: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200' }

function getBrandColor(name = '') {
  return BRAND_COLORS[name.toLowerCase()] ?? DEFAULT_COLOR
}

/* ─── Brand SVG icons ────────────────────────────────────────────────────────── */
const BrandIcons: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  cisco: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 80 48" fill="none">
      {[0,12,24,36,48].map((x, i) => (
        <rect key={i} x={x} y={i % 2 === 0 ? 0 : 6} width="8" height={i % 2 === 0 ? 48 : 36} rx="3" fill="currentColor" />
      ))}
    </svg>
  ),
  dell: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 60 60" fill="none">
      <path d="M8 30 Q8 8 30 8 L52 8 Q52 30 52 30 Q52 52 30 52 Q8 52 8 30Z" stroke="currentColor" strokeWidth="4" fill="none"/>
      <circle cx="30" cy="30" r="9" fill="currentColor"/>
    </svg>
  ),
  hp: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 80 40" fill="none">
      <circle cx="20" cy="20" r="12" fill="currentColor"/>
      <circle cx="60" cy="20" r="12" fill="currentColor"/>
      <rect x="32" y="17" width="16" height="6" fill="currentColor" rx="3"/>
    </svg>
  ),
  fujitsu: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 60 60" fill="none">
      <path d="M30 6L54 30L30 54L6 30Z" fill="currentColor" opacity="0.85"/>
      <path d="M30 18L42 30L30 42L18 30Z" fill="white" opacity="0.5"/>
    </svg>
  ),
  lenovo: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 80 40" fill="none">
      <path d="M8 32L22 8L36 32L50 8L64 32L72 20" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ibm: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 60 48" fill="none">
      {[0,20,40].map((x, i) => <rect key={i} x={x} y="0" width="12" height="48" rx="2" fill="currentColor"/>)}
    </svg>
  ),
  default: ({ className = '' }) => (
    <svg className={className} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="22" stroke="currentColor" strokeWidth="3" fill="none"/>
      <circle cx="30" cy="30" r="10" fill="currentColor"/>
    </svg>
  ),
}
function getBrandIcon(name = '') {
  return BrandIcons[name.toLowerCase()] ?? BrandIcons.default
}

/* ─── Step indicator ─────────────────────────────────────────────────────────── */
function StepBar({ step, brandName = '' }: { step: 1 | 2 | 3; brandName?: string }) {
  const color = getBrandColor(brandName)
  const steps = [
    { label: 'Marque', n: 1 },
    { label: 'Modèle', n: 2 },
    { label: 'Pièces', n: 3 },
  ]
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((s, i) => {
        const done = s.n < step
        const active = s.n === step
        return (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition-all duration-300',
                  done
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : active
                    ? `bg-gradient-to-br ${color.from} ${color.to} text-white shadow-lg`
                    : 'bg-slate-100 text-slate-400',
                ].join(' ')}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : s.n}
              </div>
              <span
                className={[
                  'hidden text-[11px] font-semibold sm:block',
                  done ? 'text-emerald-600' : active ? color.text : 'text-slate-400',
                ].join(' ')}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  'mx-3 mb-5 h-0.5 w-16 rounded-full transition-all duration-500 sm:w-24',
                  s.n < step ? 'bg-emerald-400' : 'bg-slate-200',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Filter sidebar ─────────────────────────────────────────────────────────── */
function FilterPanel({
  partsStockFilter,
  setPartsStockFilter,
  partsFilterGroups,
  partsSelectedFilters,
  togglePartsFilter,
  onReset,
  activeCount,
}: {
  partsStockFilter: 'all' | 'in' | 'out'
  setPartsStockFilter: (v: 'all' | 'in' | 'out') => void
  partsFilterGroups: Array<{ key: string; options: Array<{ value: string; count: number }> }>
  partsSelectedFilters: Record<string, string[]>
  togglePartsFilter: (name: string, value: string, checked: boolean) => void
  onReset: () => void
  activeCount: number
}) {
  return (
    <aside className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a3a52]">
            <SlidersHorizontal className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-800">Filtres</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-black text-white">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3 w-3" /> Effacer
          </button>
        )}
      </div>

      {/* Stock */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disponibilité</p>
        </div>
        <div className="divide-y divide-slate-100">
          {([
            { value: 'all', label: 'Tous les produits', dot: 'bg-slate-300' },
            { value: 'in',  label: 'En stock',          dot: 'bg-emerald-400' },
            { value: 'out', label: 'En rupture',         dot: 'bg-amber-400'  },
          ] as const).map((item) => (
            <label
              key={item.value}
              className={[
                'flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition',
                partsStockFilter === item.value
                  ? 'bg-emerald-50 font-semibold text-emerald-800'
                  : 'text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              <input
                type="radio"
                name="parts-stock"
                checked={partsStockFilter === item.value}
                onChange={() => setPartsStockFilter(item.value)}
                className="sr-only"
              />
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} />
              {item.label}
              {partsStockFilter === item.value && (
                <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Spec filters */}
      {partsFilterGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">
          Aucun filtre disponible
        </div>
      ) : (
        partsFilterGroups.map((group) => (
          <div key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{group.key}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {group.options.map((opt) => {
                const checked = (partsSelectedFilters[group.key] ?? []).includes(opt.value)
                return (
                  <label
                    key={opt.value}
                    className={[
                      'flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition',
                      checked
                        ? 'bg-emerald-50 font-semibold text-emerald-800'
                        : 'text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => togglePartsFilter(group.key, opt.value, e.target.checked)}
                      className="sr-only"
                    />
                    <span
                      className={[
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                        checked
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-300 bg-white',
                      ].join(' ')}
                    >
                      {checked && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 truncate">{opt.value}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      {opt.count}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))
      )}
    </aside>
  )
}

/* ─── Part card ──────────────────────────────────────────────────────────────── */
function PartCard({
  model,
  brandName,
  onAddToCart,
}: {
  model: {
    id: string; name: string; image?: string | null; basePrice: number
    stockQty?: number; brandName?: string; familyName?: string; reference: string
  }
  brandName: string
  onAddToCart: () => void
}) {
  const inStock = (model.stockQty ?? 0) > 0
  const color = getBrandColor(brandName)
  const [added, setAdded] = useState(false)

  function handleAdd() {
    if (!inStock) return
    onAddToCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300">
      {/* Colored top stripe */}
      <div className={`h-1 w-full bg-gradient-to-r ${color.from} ${color.to}`} />

      {/* Image / placeholder */}
      <div className={`relative flex aspect-[4/3] items-center justify-center ${color.light} overflow-hidden`}>
        {model.image ? (
          <Image
            src={model.image}
            alt={model.name}
            width={320}
            height={240}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-30">
            <Package className={`h-12 w-12 ${color.text}`} />
            <span className={`text-xs font-black uppercase tracking-widest ${color.text}`}>
              {brandName.slice(0, 2)}
            </span>
          </div>
        )}
        {/* Stock badge */}
        <div
          className={[
            'absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm',
            inStock
              ? 'bg-emerald-500 text-white'
              : 'bg-amber-100 text-amber-700 border border-amber-200',
          ].join(' ')}
        >
          {inStock ? '● En stock' : '○ Rupture'}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <p className={`mb-1 text-[10px] font-black uppercase tracking-widest ${color.text}`}>
            {model.familyName ?? brandName}
          </p>
          <h4 className="line-clamp-2 text-sm font-bold leading-snug text-slate-800 transition group-hover:text-slate-950">
            {model.name}
          </h4>
          <p className="mt-1 text-[11px] text-slate-400">Réf. {model.reference}</p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <p className={`bg-gradient-to-br ${color.from} ${color.to} bg-clip-text text-lg font-black text-transparent`}>
            {model.basePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
          <button
            type="button"
            disabled={!inStock}
            onClick={handleAdd}
            className={[
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition-all duration-200',
              added
                ? 'bg-emerald-500 scale-95'
                : inStock
                ? `bg-gradient-to-r ${color.from} ${color.to} hover:opacity-90 active:scale-95 shadow-sm`
                : 'cursor-not-allowed bg-slate-200 text-slate-400',
            ].join(' ')}
            title={inStock ? 'Ajouter au panier' : 'Rupture de stock'}
          >
            {added ? (
              <><CheckCircle2 className="h-3.5 w-3.5" /> Ajouté</>
            ) : (
              <><ShoppingCart className="h-3.5 w-3.5" /> Panier</>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

/* ─── Brand selection card ───────────────────────────────────────────────────── */
function BrandCard({
  name,
  count,
  onClick,
}: {
  name: string
  count: number
  onClick: () => void
}) {
  const color = getBrandColor(name)
  const Icon = getBrandIcon(name)

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-slate-300 hover:shadow-lg active:scale-95"
    >
      {/* Gradient fill on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color.from} ${color.to} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.08]`} />

      <div className="relative flex flex-col items-center gap-4 p-6 sm:p-8 text-center">
        {/* Icon block */}
        <div className={`flex h-24 w-24 items-center justify-center rounded-2xl ${color.light} transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
          <Icon className={`h-12 w-12 ${color.text}`} />
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{name}</h3>
          <p className="mt-1 text-xs font-medium text-slate-400">
            {count} modèle{count > 1 ? 's' : ''}
          </p>
        </div>

        <div
          className={[
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all duration-300',
            `bg-gradient-to-r ${color.from} ${color.to} group-hover:shadow-lg`,
          ].join(' ')}
        >
          Sélectionner <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  )
}

/* ─── Model selection card ───────────────────────────────────────────────────── */
function ModelCard({
  model,
  brandName,
  onClick,
}: {
  model: { id: string; name: string; image?: string | null }
  brandName: string
  onClick: () => void
}) {
  const color = getBrandColor(brandName)

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-slate-300 hover:shadow-lg active:scale-95"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color.from} ${color.to} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.08]`} />

      <div className="relative flex flex-col gap-4 p-5 sm:p-6">
        {/* Visual */}
        <div className={`flex aspect-video items-center justify-center rounded-xl ${color.light} overflow-hidden transition-transform duration-300 group-hover:scale-105`}>
          {model.image ? (
            <Image src={model.image} alt={model.name} width={240} height={135} className="h-full w-full object-cover" />
          ) : (
            <span className={`text-5xl font-black opacity-15 ${color.text}`}>
              {model.name.charAt(0)}
            </span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-800 group-hover:text-slate-950 transition">
            {model.name}
          </h3>
        </div>

        <div
          className={[
            'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all',
            `bg-gradient-to-r ${color.from} ${color.to} group-hover:shadow-md`,
          ].join(' ')}
        >
          Choisir <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  )
}

/* ─── Main PartsFinder export ────────────────────────────────────────────────── */
export interface PartsFinderProps {
  /* state */
  partsBrandId: string | null
  partsModelId: string | null
  partsStockFilter: 'all' | 'in' | 'out'
  partsSelectedFilters: Record<string, string[]>
  /* data */
  partsBrandOptions: Array<{ brandId: string; name: string; count: number }>
  partsModelOptions: Array<{ id: string; name: string; image?: string | null }>
  compatiblePartModels: Array<{
    id: string; name: string; image?: string | null; basePrice: number
    stockQty?: number; brandName?: string; familyName?: string; reference: string
  }>
  selectedPartsBrand: { brandId: string; name: string; count: number } | null
  selectedPartsModel: { id: string; name: string } | null
  partsFilterGroups: Array<{ key: string; options: Array<{ value: string; count: number }> }>
  /* setters & handlers */
  setPartsBrandId: (id: string | null) => void
  setPartsModelId: (id: string | null) => void
  setPartsStockFilter: (v: 'all' | 'in' | 'out') => void
  setPartsSelectedFilters: (v: Record<string, string[]>) => void
  togglePartsFilter: (name: string, value: string, checked: boolean) => void
  addSparePartToCart: (model: any) => void
}

export function PartsFinder({
  partsBrandId, partsModelId, partsStockFilter, partsSelectedFilters,
  partsBrandOptions, partsModelOptions, compatiblePartModels,
  selectedPartsBrand, selectedPartsModel, partsFilterGroups,
  setPartsBrandId, setPartsModelId, setPartsStockFilter, setPartsSelectedFilters,
  togglePartsFilter, addSparePartToCart,
}: PartsFinderProps) {

  const step: 1 | 2 | 3 = partsModelId ? 3 : partsBrandId ? 2 : 1
  const brandName = selectedPartsBrand?.name ?? ''

  const activeFilterCount = useMemo(() => {
    let n = partsStockFilter !== 'all' ? 1 : 0
    n += Object.values(partsSelectedFilters).reduce((s, v) => s + v.length, 0)
    return n
  }, [partsStockFilter, partsSelectedFilters])

  function resetFilters() {
    setPartsSelectedFilters({})
    setPartsStockFilter('all')
  }

  /* ── Hero header shared across all steps ── */
  const hero = (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f2537] via-[#1a3a52] to-[#0f4c75] px-6 py-12 sm:px-8 sm:py-16 lg:px-12">
      {/* Animated decorative circles */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

      <div className="relative mx-auto max-w-4xl">
        {/* Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">Moteur de compatibilité</span>
          </div>
        </div>

        {/* Title - Improved visual hierarchy */}
        <div className="text-center">
          <h1 className="inline-block">
            <span className="block text-4xl font-black tracking-tighter text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              Parts<span className="block bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent sm:inline sm:ml-3">
                Finder
              </span>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            Trouvez instantanément les pièces détachées compatibles avec votre équipement
          </p>
        </div>

        {/* Step indicator */}
        <div className="mt-10 sm:mt-12">
          <StepBar step={step} brandName={brandName} />
        </div>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════
     STEP 1 — Brand selection
  ══════════════════════════════════════════════════════════ */
  if (!partsBrandId) return (
    <div className="space-y-8">
      {hero}

      <div className="space-y-6">
        <div>
          <h2 className="mb-6 text-xs font-black uppercase tracking-widest text-slate-500 lg:mb-8">
            Sélectionnez une marque pour commencer
          </h2>
          {partsBrandOptions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <Package className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-400">Aucune marque disponible</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {partsBrandOptions.map((item) => (
                <BrandCard
                  key={item.brandId}
                  name={item.name}
                  count={item.count}
                  onClick={() => {
                    setPartsBrandId(item.brandId)
                    setPartsModelId(null)
                    setPartsSelectedFilters({})
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════
     STEP 2 — Model selection
  ══════════════════════════════════════════════════════════ */
  if (partsBrandId && !partsModelId) {
    const color = getBrandColor(brandName)
    return (
      <div className="space-y-8">
        {hero}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setPartsBrandId(null); setPartsModelId(null) }}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              title="Retour à la sélection de marque"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Marque sélectionnée</p>
              <h2 className={`text-2xl font-black ${color.text}`}>{brandName}</h2>
            </div>
          </div>
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-bold text-white ${color.light} ${color.text} bg-opacity-20`}>
            {partsModelOptions.length} modèle{partsModelOptions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {partsModelOptions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Package className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">Aucun modèle trouvé pour cette marque.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
              Sélectionnez un modèle
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {partsModelOptions.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  brandName={brandName}
                  onClick={() => {
                    setPartsModelId(model.id)
                    setPartsSelectedFilters({})
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════
     STEP 3 — Results + filters
  ══════════════════════════════════════════════════════════ */
  const color = getBrandColor(brandName)

  return (
    <div className="space-y-6">
      {hero}

      {/* Context bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setPartsModelId(null); setPartsSelectedFilters({}) }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
            title="Changer le modèle"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Breadcrumb chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold',
                `${color.light} ${color.text} border-transparent`,
              ].join(' ')}
            >
              {brandName}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-300" />
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {selectedPartsModel?.name}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <span
            className={[
              'inline-flex items-center rounded-full px-4 py-2 text-xs font-black text-white',
              `bg-gradient-to-r ${color.from} ${color.to}`,
            ].join(' ')}
          >
            {compatiblePartModels.length} pièce{compatiblePartModels.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Grid: filter sidebar + results */}
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Filters */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <FilterPanel
            partsStockFilter={partsStockFilter}
            setPartsStockFilter={setPartsStockFilter}
            partsFilterGroups={partsFilterGroups}
            partsSelectedFilters={partsSelectedFilters}
            togglePartsFilter={togglePartsFilter}
            onReset={resetFilters}
            activeCount={activeFilterCount}
          />
        </div>

        {/* Results */}
        <div className="space-y-6">
          {compatiblePartModels.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Package className="h-8 w-8 text-slate-300" />
              </div>
              <div>
                <p className="font-bold text-slate-700">Aucune pièce compatible trouvée</p>
                <p className="mt-1 text-sm text-slate-400">
                  Essayez de{' '}
                  <button onClick={resetFilters} className="font-semibold text-emerald-600 underline underline-offset-2 transition hover:text-emerald-700">
                    réinitialiser les filtres
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                Pièces compatibles
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {compatiblePartModels.map((model) => (
                  <PartCard
                    key={model.id}
                    model={model}
                    brandName={brandName}
                    onAddToCart={() => addSparePartToCart(model)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
