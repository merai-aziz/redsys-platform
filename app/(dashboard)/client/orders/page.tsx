'use client'

import { useEffect, useMemo, useState } from 'react'
import { Package, Clock, CheckCircle, XCircle, Truck, ChevronDown, ChevronUp, AlertTriangle, Search, ChevronLeft, ChevronRight, Calendar, CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  lineTotal: number
  description?: string
  product?: { name: string; image_url?: string }
}

interface ShippingAddress {
  firstName: string
  lastName: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  email: string
}

interface Order {
  id: string
  status: OrderStatus
  subtotal: number
  tax: number
  shipping: number
  total: number
  shippingMethod: string
  paymentMethod: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  shippingAddress?: ShippingAddress
}

const STATUS_CONFIG: Record<OrderStatus, {
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode
}> = {
  PENDING: {
    label: 'En attente',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: <Clock className="h-4 w-4 text-amber-500" />,
  },
  PROCESSING: {
    label: 'En traitement',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <Truck className="h-4 w-4 text-blue-500" />,
  },
  COMPLETED: {
    label: 'Livrée',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
    icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  },
  CANCELLED: {
    label: 'Annulée',
    color: 'text-slate-500',
    bgColor: 'bg-slate-50 border-slate-200',
    icon: <XCircle className="h-4 w-4 text-slate-400" />,
  },
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function OrderCard({ order, onCancel }: { order: Order; onCancel: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const statusConf = STATUS_CONFIG[order.status]
  const shortId = order.id.slice(0, 8).toUpperCase()

  async function handleCancel() {
    if (!confirmCancel) { setConfirmCancel(true); return }
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (res.ok) onCancel(order.id)
    } catch {
      // erreur silencieuse
    } finally {
      setCancelling(false)
      setConfirmCancel(false)
    }
  }

  return (
    <Card className="group border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 sm:h-9 sm:w-9">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-sm font-bold text-slate-900 sm:text-base">
                  Commande #{shortId}
                </CardTitle>
                <CardDescription className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 sm:text-xs">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span className="hidden sm:inline">Passée le {formatDate(order.createdAt)}</span>
                  <span className="sm:hidden">{formatDateShort(order.createdAt)}</span>
                </CardDescription>
              </div>
            </div>
          </div>

          <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs ${statusConf.bgColor} ${statusConf.color}`}>
            {statusConf.icon}
            {statusConf.label}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Résumé rapide */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-4 sm:gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Articles</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{order.items.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sous-total</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{formatCurrency(order.subtotal)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Livraison</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{formatCurrency(order.shipping)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total TTC</p>
            <p className="mt-0.5 text-sm font-black text-sky-700">{formatCurrency(order.total)}</p>
          </div>
        </div>

        {/* Bouton détail */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="font-medium">Voir le détail</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Détail dépliable */}
        {expanded && (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Articles commandés</p>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.product?.name ?? item.description ?? 'Produit'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-900">{formatCurrency(item.lineTotal)}</p>
              </div>
            ))}

            {order.shippingAddress && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Adresse de livraison</p>
                <p className="text-sm leading-relaxed text-slate-700">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                  {order.shippingAddress.address}<br />
                  {order.shippingAddress.postalCode} {order.shippingAddress.city}, {order.shippingAddress.country}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-t border-slate-200 pt-2 text-sm">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Truck className="h-3.5 w-3.5" />
                Mode de livraison
              </span>
              <span className="font-semibold capitalize text-slate-900">{order.shippingMethod}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-slate-500">
                <CreditCard className="h-3.5 w-3.5" />
                Mode de paiement
              </span>
              <span className="font-semibold uppercase text-slate-900">{order.paymentMethod}</span>
            </div>
          </div>
        )}

        {/* Action annuler */}
        {order.status === 'PENDING' && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 sm:gap-3">
            {confirmCancel ? (
              <>
                <div className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Confirmer l&apos;annulation ?
                </div>
                <Button
                  onClick={handleCancel}
                  disabled={cancelling}
                  size="sm"
                  className="bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
                >
                  {cancelling ? 'Annulation...' : 'Confirmer'}
                </Button>
                <Button
                  onClick={() => setConfirmCancel(false)}
                  size="sm"
                  variant="ghost"
                  className="text-slate-500"
                >
                  Retour
                </Button>
              </>
            ) : (
              <Button
                onClick={handleCancel}
                size="sm"
                variant="ghost"
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Annuler la commande
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OrderCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-slate-100" />
          <div className="space-y-2">
            <div className="h-3.5 w-32 rounded bg-slate-100" />
            <div className="h-2.5 w-24 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3 rounded-xl bg-slate-50 p-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2 w-12 rounded bg-slate-200" />
            <div className="h-3.5 w-14 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="mt-4 h-9 rounded-lg bg-slate-100" />
    </div>
  )
}

// ── Pagination ──────────────────────────────────────────────────────────────
function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)

  const result: (number | 'ellipsis')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis')
    result.push(p)
    prev = p
  }
  return result
}

function PaginationBar({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
  pageSize: number
  onPageSizeChange: (s: number) => void
  totalItems: number
}) {
  if (totalItems === 0) return null

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-3 sm:justify-start">
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{startItem}–{endItem}</span> sur{' '}
          <span className="font-semibold text-slate-700">{totalItems}</span>
        </p>

        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="hidden sm:inline">Par page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-medium text-slate-700 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Page précédente"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1">
            {buildPageList(page, totalPages).map((p, idx) =>
              p === 'ellipsis' ? (
                <span key={`e-${idx}`} className="px-1.5 text-xs text-slate-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
                    p === page
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Page suivante"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  // ✅ Pagination — état local, ne touche pas à la logique de fetch existante
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/orders', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { if (d.orders) setOrders(d.orders) })
      .catch((e) => { if (e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  function handleCancelled(id: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'CANCELLED' as OrderStatus } : o))
    )
  }

  // ✅ Recherche par numéro de commande, produit, ou nom destinataire — purement additif
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) => {
      const idMatch = o.id.toLowerCase().includes(q)
      const itemMatch = o.items.some((i) =>
        (i.product?.name ?? i.description ?? '').toLowerCase().includes(q)
      )
      const nameMatch = o.shippingAddress
        ? `${o.shippingAddress.firstName} ${o.shippingAddress.lastName}`.toLowerCase().includes(q)
        : false
      return idMatch || itemMatch || nameMatch
    })
  }, [orders, search])

  const filtered = useMemo(
    () => (filter === 'ALL' ? searched : searched.filter((o) => o.status === filter)),
    [searched, filter]
  )

  // ✅ Réinitialiser la page courante si le filtre/recherche réduit le nombre de pages
  useEffect(() => {
    setPage(1)
  }, [filter, search, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  const counts = {
    ALL: orders.length,
    PENDING: orders.filter((o) => o.status === 'PENDING').length,
    PROCESSING: orders.filter((o) => o.status === 'PROCESSING').length,
    COMPLETED: orders.filter((o) => o.status === 'COMPLETED').length,
    CANCELLED: orders.filter((o) => o.status === 'CANCELLED').length,
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Mes commandes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {orders.length} commande{orders.length !== 1 ? 's' : ''} au total
          </p>
        </div>

        {/* ✅ Recherche */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une commande…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />
        </div>
      </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-2">
        {([
          ['ALL', 'Toutes'],
          ['PENDING', 'En attente'],
          ['PROCESSING', 'En traitement'],
          ['COMPLETED', 'Livrées'],
          ['CANCELLED', 'Annulées'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === key
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              filter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Liste des commandes */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <OrderCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center sm:p-12">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">Aucune commande</p>
          <p className="mt-1 text-sm text-slate-500">
            {search
              ? `Aucun résultat pour "${search}".`
              : filter === 'ALL'
                ? 'Vous n\'avez pas encore passé de commande.'
                : `Aucune commande avec le statut "${STATUS_CONFIG[filter as OrderStatus]?.label}".`}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginated.map((order) => (
              <OrderCard key={order.id} order={order} onCancel={handleCancelled} />
            ))}
          </div>

          <PaginationBar
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filtered.length}
          />
        </>
      )}
    </div>
  )
}