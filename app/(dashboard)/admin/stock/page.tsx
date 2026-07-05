'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, ChevronLeft, ChevronRight, Package, RefreshCw, XCircle } from 'lucide-react'

interface StockProduct {
  id: number
  name: string
  type: 'STANDARD' | 'CONFIGURABLE'
  stockQty: number
  inStock: boolean
  basePrice: number
  imageUrl: string | null
  brand: string
  family: string
  category: string
}

interface StockAlertsResponse {
  threshold: number
  summary: { outOfStock: number; lowStock: number; total: number }
  products: StockProduct[]
}

const THRESHOLDS = [3, 5, 10, 20]
const ITEMS_PER_PAGE = 10

export default function AdminStockPage() {
  const [data, setData] = useState<StockAlertsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(5)
  const [filter, setFilter] = useState<'all' | 'out' | 'low'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stock-alerts?threshold=${threshold}`)
      if (res.ok) {
        const json = await res.json() as StockAlertsResponse
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [threshold])

  useEffect(() => {
    void fetchAlerts()
  }, [fetchAlerts])

  const visibleProducts = data?.products.filter((p) => {
    if (filter === 'out') return p.stockQty === 0
    if (filter === 'low') return p.stockQty > 0
    return true
  }) ?? []

  // Revenir à la page 1 dès que le seuil ou le filtre change
  useEffect(() => {
    setCurrentPage(1)
  }, [threshold, filter])

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedProducts = visibleProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contrôle du stock</h1>
          <p className="text-sm text-slate-500">
            Produits dont le stock est inférieur ou égal au seuil configuré.
          </p>
        </div>
        <button
          onClick={() => void fetchAlerts()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Ruptures totales"
          value={data?.summary.outOfStock ?? 0}
          color="red"
          icon={<XCircle className="h-5 w-5" />}
        />
        <SummaryCard
          label={`Stock faible (≤ ${threshold})`}
          value={data?.summary.lowStock ?? 0}
          color="amber"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <SummaryCard
          label="Total alertes"
          value={data?.summary.total ?? 0}
          color="slate"
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Seuil :</span>
          <div className="flex gap-1">
            {THRESHOLDS.map((t) => (
              <button
                key={t}
                onClick={() => setThreshold(t)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  threshold === t
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ≤ {t}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex gap-1">
          {([
            { value: 'all', label: 'Tous' },
            { value: 'out', label: 'Rupture' },
            { value: 'low', label: 'Faible' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                filter === opt.value
                  ? 'bg-[#1a3a52] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#2ad1a4]" />
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
          <Package className="h-12 w-12 text-slate-200" />
          <p className="mt-4 font-semibold text-slate-700">Aucune alerte stock</p>
          <p className="text-sm text-slate-400">
            Tous les produits ont un stock supérieur à {threshold}.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Produit</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3 text-right">Prix</th>
                    <th className="px-4 py-3 text-center">Stock</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedProducts.map((p) => (
                    <tr key={p.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate max-w-[200px]">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.type === 'CONFIGURABLE'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-sky-50 text-sky-700'
                        }`}>
                          {p.type === 'CONFIGURABLE' ? 'Configurable' : 'Standard'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{p.family}</p>
                        <p className="text-xs text-slate-400">{p.category}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {p.basePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-black ${
                          p.stockQty === 0
                            ? 'text-red-600'
                            : p.stockQty <= 3
                            ? 'text-amber-600'
                            : 'text-yellow-600'
                        }`}>
                          {p.stockQty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.stockQty === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                            <XCircle className="h-3 w-3" />
                            Rupture
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            Faible
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <StockPagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={visibleProducts.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  )
}

function StockPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}) {
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = []
    const delta = 1
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis')
      }
    }
    return pages
  }, [currentPage, totalPages])

  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row">
      <p className="text-xs text-slate-500">
        Affichage {(currentPage - 1) * itemsPerPage + 1}
        –{Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-[2rem] rounded-md px-2 text-xs font-semibold transition ${
                  p === currentPage
                    ? 'bg-[#1a3a52] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number
  color: 'red' | 'amber' | 'slate'
  icon: React.ReactNode
}) {
  const colors = {
    red:   'border-red-100 bg-red-50 text-red-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium opacity-80">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}