'use client'

import { useEffect, useState } from 'react'
import { Package, Clock, CheckCircle, XCircle, Truck, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
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

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
    <Card className="border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Commande #{shortId}
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs text-slate-500">
              Passée le {formatDate(order.createdAt)}
            </CardDescription>
          </div>

          <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusConf.bgColor} ${statusConf.color}`}>
            {statusConf.icon}
            {statusConf.label}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Résumé rapide */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-4">
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
            <p className="mt-0.5 text-sm font-black text-slate-900">{formatCurrency(order.total)}</p>
          </div>
        </div>

        {/* Bouton détail */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          <span className="font-medium">Voir le détail</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Détail dépliable */}
        {expanded && (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
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
                <p className="text-sm text-slate-700">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                  {order.shippingAddress.address}<br />
                  {order.shippingAddress.postalCode} {order.shippingAddress.city}, {order.shippingAddress.country}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border-t border-slate-200 pt-2 text-sm">
              <span className="text-slate-500">Mode de livraison</span>
              <span className="font-semibold capitalize text-slate-900">{order.shippingMethod}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Mode de paiement</span>
              <span className="font-semibold uppercase text-slate-900">{order.paymentMethod}</span>
            </div>
          </div>
        )}

        {/* Action annuler */}
        {order.status === 'PENDING' && (
          <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
            {confirmCancel ? (
              <>
                <div className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
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

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL')

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

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter)

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
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Mes commandes</h1>
        <p className="mt-1 text-sm text-slate-500">
          {orders.length} commande{orders.length !== 1 ? 's' : ''} au total
        </p>
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
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">Aucune commande</p>
          <p className="mt-1 text-sm text-slate-500">
            {filter === 'ALL'
              ? 'Vous n\'avez pas encore passé de commande.'
              : `Aucune commande avec le statut "${STATUS_CONFIG[filter as OrderStatus]?.label}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} onCancel={handleCancelled} />
          ))}
        </div>
      )}
    </div>
  )
}