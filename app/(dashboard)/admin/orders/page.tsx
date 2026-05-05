'use client'

import { useEffect, useState } from 'react'
import {
  Clock, CheckCircle, XCircle, Truck,
  ChevronDown, ChevronUp, Search, Filter,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'

interface OrderUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

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
  company?: string
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
  user: OrderUser
  items: OrderItem[]
  shippingAddress?: ShippingAddress
}

const STATUS_CONFIG: Record<OrderStatus, {
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode
}> = {
  PENDING:    { label: 'En attente',      color: 'text-amber-700',   bgColor: 'bg-amber-50 border-amber-200',   icon: <Clock className="h-4 w-4 text-amber-500" /> },
  PROCESSING: { label: 'En traitement',   color: 'text-blue-700',    bgColor: 'bg-blue-50 border-blue-200',     icon: <Truck className="h-4 w-4 text-blue-500" /> },
  COMPLETED:  { label: 'Livrée',          color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle className="h-4 w-4 text-emerald-500" /> },
  CANCELLED:  { label: 'Annulée',         color: 'text-slate-500',   bgColor: 'bg-slate-50 border-slate-200',   icon: <XCircle className="h-4 w-4 text-slate-400" /> },
}

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED:  [],
  CANCELLED:  [],
}

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function AdminOrderCard({
  order,
  onStatusChange,
}: {
  order: Order
  onStatusChange: (id: string, status: OrderStatus) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const statusConf = STATUS_CONFIG[order.status]
  const shortId = order.id.slice(0, 8).toUpperCase()
  const nextStatuses = STATUS_TRANSITIONS[order.status]

  async function handleStatusChange(newStatus: OrderStatus) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        onStatusChange(order.id, newStatus)
        toast.success(`Commande ${shortId} → ${STATUS_CONFIG[newStatus].label}`)
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900">#{shortId}</CardTitle>
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusConf.bgColor} ${statusConf.color}`}>
                {statusConf.icon}
                {statusConf.label}
              </div>
            </div>
            <CardDescription className="mt-1 text-xs text-slate-500">
              {formatDate(order.createdAt)} · {order.user.firstName} {order.user.lastName} · {order.user.email}
            </CardDescription>
          </div>
          <p className="text-lg font-black text-slate-900">{formatCurrency(order.total)}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Résumé */}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Articles</p>
            <p className="text-sm font-bold text-slate-900">{order.items.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Livraison</p>
            <p className="text-sm font-bold capitalize text-slate-900">{order.shippingMethod}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Paiement</p>
            <p className="text-sm font-bold uppercase text-slate-900">{order.paymentMethod}</p>
          </div>
        </div>

        {/* Actions de statut */}
        {nextStatuses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Changer le statut :</span>
            {nextStatuses.map((s) => {
              const conf = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={updating}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50 ${conf.bgColor} ${conf.color}`}
                >
                  {conf.icon}
                  {conf.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Toggle détail */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          <span className="font-medium">Détails de la commande</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Articles</p>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {item.product?.name ?? item.description ?? 'Produit'}
                  </p>
                  <p className="text-xs text-slate-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                </div>
                <p className="shrink-0 text-sm font-bold">{formatCurrency(item.lineTotal)}</p>
              </div>
            ))}

            {order.shippingAddress && (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Livraison</p>
                {order.shippingAddress.company && (
                  <p className="text-xs font-semibold text-slate-700">{order.shippingAddress.company}</p>
                )}
                <p className="text-sm text-slate-700">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                  {order.shippingAddress.address}<br />
                  {order.shippingAddress.postalCode} {order.shippingAddress.city}, {order.shippingAddress.country}<br />
                  📞 {order.shippingAddress.phone}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="text-[10px] font-semibold uppercase text-slate-400">Sous-total</p>
                <p className="font-semibold">{formatCurrency(order.subtotal)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="text-[10px] font-semibold uppercase text-slate-400">TVA</p>
                <p className="font-semibold">{formatCurrency(order.tax)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/orders', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { if (d.orders) setOrders(d.orders) })
      .catch((e) => { if (e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  function handleStatusChange(id: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
  }

  const filtered = orders
    .filter((o) => filterStatus === 'ALL' || o.status === filterStatus)
    .filter((o) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        o.id.toLowerCase().includes(q) ||
        o.user.firstName.toLowerCase().includes(q) ||
        o.user.lastName.toLowerCase().includes(q) ||
        o.user.email.toLowerCase().includes(q)
      )
    })

  const counts = {
    ALL: orders.length,
    PENDING: orders.filter((o) => o.status === 'PENDING').length,
    PROCESSING: orders.filter((o) => o.status === 'PROCESSING').length,
    COMPLETED: orders.filter((o) => o.status === 'COMPLETED').length,
    CANCELLED: orders.filter((o) => o.status === 'CANCELLED').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Gestion des commandes</h1>
          <p className="mt-1 text-sm text-slate-500">{orders.length} commande{orders.length !== 1 ? 's' : ''} au total</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par ID, nom ou email client..."
          className="h-10 pl-9 border-slate-200 bg-white"
        />
      </div>

      {/* Filtres statut */}
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
            onClick={() => setFilterStatus(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filterStatus === key
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              filterStatus === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Filter className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">Aucune commande trouvée</p>
          <p className="mt-1 text-sm text-slate-500">Modifiez les filtres ou la recherche.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <AdminOrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  )
}