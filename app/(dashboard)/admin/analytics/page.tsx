"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, ShoppingCart, Users, Ticket as TicketIcon,
  AlertTriangle, Clock, Calendar, RefreshCw,
} from 'lucide-react'

function formatCurrency(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

const COLORS = ['#2ad1a4', '#1a3a52', '#5a7a9a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

type PresetKey = '7d' | '30d' | '90d' | '12m' | 'ytd' | 'custom'

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '90 jours' },
  { key: '12m', label: '12 mois' },
  { key: 'ytd', label: 'Cette année' },
  { key: 'custom', label: 'Personnalisé' },
]

function computeRangeFromPreset(preset: PresetKey): { from: Date; to: Date } {
  const now = new Date()
  const to = now

  switch (preset) {
    case '7d':
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to }
    case '30d':
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to }
    case '90d':
      return { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), to }
    case 'ytd':
      return { from: new Date(now.getFullYear(), 0, 1), to }
    case '12m':
    default:
      return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to }
  }
}

interface AnalyticsData {
  period: { from: string; to: string }
  kpis: {
    revenueInPeriod: number
    ordersInPeriod: number
    newCustomersInPeriod: number
    openTickets: number
    avgOrderValue: number
    avgResolutionHours: number | null
  }
  salesByMonth: Array<{ month: string; revenue: number; orders: number; avgOrderValue: number }>
  topProducts: Array<{ productId: number; name: string; type: string; quantitySold: number; revenue: number }>
  topConfigurations: Array<{ configurationValueId: number; optionName: string; valueName: string; quantitySold: number; revenue: number }>
  stockOverview: {
    totalUnitsInStock: number
    totalProducts: number
    lowestStock: Array<{ productId: number; name: string; stockQty: number; type: string }>
  }
  topCustomers: Array<{ userId: string; name: string; companyName: string | null; email: string; totalSpent: number; ordersCount: number }>
  usersBreakdown: {
    byRole: Array<{ role: string; count: number }>
    activeVsInactive: Array<{ status: string; count: number }>
    signupsByMonth: Array<{ month: string; count: number }>
  }
  contractsExpiring: Array<{ id: string; companyName: string; clientName: string; warrantyEnd: string; daysRemaining: number; urgency: 'critical' | 'warning' | 'ok' }>
  ticketsByStatus: Array<{ status: string; count: number }>
  ticketsByPriority: Array<{ priority: string; count: number }>
  topFailingProducts: Array<{ productKey: string; name: string; ticketsCount: number }>
  orderStatusBreakdown: Array<{ status: string; count: number }>
  paymentMethodBreakdown: Array<{ method: string; count: number }>
  revenueByBrand: Array<{ brand: string; revenue: number }>
}

export default function AnalyticsDashboardPage() {
  const [preset, setPreset] = useState<PresetKey>('12m')
  const initialRange = useMemo(() => computeRangeFromPreset('12m'), [])
  const [customFrom, setCustomFrom] = useState(formatDateInput(initialRange.from))
  const [customTo, setCustomTo] = useState(formatDateInput(initialRange.to))

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeRange = useMemo(() => {
    if (preset === 'custom') {
      return { from: new Date(customFrom), to: new Date(customTo) }
    }
    return computeRangeFromPreset(preset)
  }, [preset, customFrom, customTo])

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          from: activeRange.from.toISOString(),
          to: activeRange.to.toISOString(),
        })
        const res = await fetch(`/api/admin/analytics?${params.toString()}`)
        if (!res.ok) throw new Error('Erreur lors du chargement des données')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [activeRange],
  )

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRange.from.getTime(), activeRange.to.getTime()])

  const currencyTooltip = (value: unknown) => formatCurrency(safeNumber(value))

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-4 sm:p-6 lg:p-8">
      {/* ── Header + filtre de période ── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1a3a52] sm:text-3xl">Tableau de bord analytique</h1>
          <p className="mt-1 text-sm text-[#5a7a9a]">Vue d&apos;ensemble des ventes, du stock, des clients et du support.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#d0d9e3] bg-white p-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  preset === p.key
                    ? 'bg-[#1a3a52] text-white'
                    : 'text-[#5a7a9a] hover:bg-[#f5f7fa]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#d0d9e3] bg-white px-3 py-2 text-xs font-semibold text-[#1a3a52] transition hover:bg-[#f5f7fa] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {preset === 'custom' && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#d0d9e3] bg-white p-4">
          <Calendar className="h-4 w-4 text-[#5a7a9a]" />
          <label className="flex items-center gap-2 text-sm text-[#5a7a9a]">
            Du
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-[#d0d9e3] px-2 py-1 text-sm text-[#1a3a52]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#5a7a9a]">
            Au
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={formatDateInput(new Date())}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-[#d0d9e3] px-2 py-1 text-sm text-[#1a3a52]"
            />
          </label>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
        </div>
      ) : error || !data ? (
        <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
          {error ?? 'Aucune donnée disponible'}
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="CA période" value={formatCurrency(data.kpis.revenueInPeriod)} />
            <KpiCard icon={<ShoppingCart className="h-5 w-5" />} label="Commandes" value={String(data.kpis.ordersInPeriod)} />
            <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Panier moyen" value={formatCurrency(data.kpis.avgOrderValue)} />
            <KpiCard icon={<Users className="h-5 w-5" />} label="Nouveaux clients" value={String(data.kpis.newCustomersInPeriod)} />
            <KpiCard icon={<TicketIcon className="h-5 w-5" />} label="Tickets ouverts" value={String(data.kpis.openTickets)} />
            <KpiCard
              icon={<Clock className="h-5 w-5" />}
              label="Résolution moy."
              value={data.kpis.avgResolutionHours != null ? `${Math.round(data.kpis.avgResolutionHours)} h` : '—'}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

            {/* Courbe CA + panier moyen */}
            <ChartCard title="Chiffre d'affaires & panier moyen" fullWidth>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf1" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const num = safeNumber(value)
                      if (name === 'revenue' || name === 'avgOrderValue') return formatCurrency(num)
                      return num
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#2ad1a4" strokeWidth={2.5} name="CA" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="avgOrderValue" stroke="#8b5cf6" strokeWidth={2} name="Panier moyen" dot={{ r: 3 }} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Top produits vendus */}
            <ChartCard title="Produits les plus vendus">
              {data.topProducts.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.topProducts} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf1" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => safeNumber(value)} />
                    <Bar dataKey="quantitySold" fill="#1a3a52" name="Quantité vendue" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Top configurations */}
            <ChartCard title="Configurations les plus choisies">
              {data.topConfigurations.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.topConfigurations} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf1" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="valueName" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => safeNumber(value)} />
                    <Bar dataKey="quantitySold" fill="#5a7a9a" name="Fois choisie" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* CA par marque */}
            <ChartCard title="Chiffre d'affaires par marque">
              {data.revenueByBrand.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.revenueByBrand} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf1" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="brand" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={currencyTooltip} />
                    <Bar dataKey="revenue" fill="#2ad1a4" name="CA" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Stock */}
            <ChartCard title="Produits en stock faible">
              <p className="mb-3 text-sm text-[#5a7a9a]">
                {data.stockOverview.totalUnitsInStock} unités en stock sur {data.stockOverview.totalProducts} produits
              </p>
              {data.stockOverview.lowestStock.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.stockOverview.lowestStock} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf1" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => safeNumber(value)} />
                    <Bar dataKey="stockQty" fill="#f59e0b" name="Stock" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Statuts commande + moyens de paiement */}
            <ChartCard title="Statuts de commande & moyens de paiement">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-center text-xs font-semibold text-[#5a7a9a]">Statuts</p>
                  {data.orderStatusBreakdown.length === 0 ? (
                    <EmptyState small />
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={data.orderStatusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={60}>
                          {data.orderStatusBreakdown.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-center text-xs font-semibold text-[#5a7a9a]">Paiement</p>
                  {data.paymentMethodBreakdown.length === 0 ? (
                    <EmptyState small />
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={data.paymentMethodBreakdown} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={60}>
                          {data.paymentMethodBreakdown.map((_, i) => (
                            <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </ChartCard>

            {/* Clients fidèles */}
            <ChartCard title="Clients les plus fidèles">
              {data.topCustomers.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-[#e5ebf1] text-left text-[#5a7a9a]">
                        <th className="py-2">Client</th>
                        <th className="py-2 text-right">Commandes</th>
                        <th className="py-2 text-right">Total dépensé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCustomers.map((c) => (
                        <tr key={c.userId} className="border-b border-[#f0f3f6]">
                          <td className="py-2">
                            <p className="font-semibold text-[#1a3a52]">{c.name}</p>
                            {c.companyName && <p className="text-xs text-[#5a7a9a]">{c.companyName}</p>}
                          </td>
                          <td className="py-2 text-right">{c.ordersCount}</td>
                          <td className="py-2 text-right font-bold text-[#1a3a52]">{formatCurrency(c.totalSpent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>

            {/* Répartition users */}
            <ChartCard title="Répartition des utilisateurs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-center text-xs font-semibold text-[#5a7a9a]">Par rôle</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={data.usersBreakdown.byRole} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={60}>
                        {data.usersBreakdown.byRole.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="mb-2 text-center text-xs font-semibold text-[#5a7a9a]">Actifs / Inactifs</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={data.usersBreakdown.activeVsInactive} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={60}>
                        {data.usersBreakdown.activeVsInactive.map((_, i) => (
                          <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </ChartCard>

            {/* Inscriptions par mois */}
            <ChartCard title="Nouvelles inscriptions">
              {data.usersBreakdown.signupsByMonth.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.usersBreakdown.signupsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf1" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip formatter={(value) => safeNumber(value)} />
                    <Bar dataKey="count" fill="#06b6d4" name="Inscriptions" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Tickets */}
            <ChartCard title="Tickets par statut et priorité">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.ticketsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf1" />
                    <XAxis dataKey="status" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip formatter={(value) => safeNumber(value)} />
                    <Bar dataKey="count" fill="#2ad1a4" name="Tickets" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.ticketsByPriority}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf1" />
                    <XAxis dataKey="priority" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip formatter={(value) => safeNumber(value)} />
                    <Bar dataKey="count" fill="#ef4444" name="Tickets" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Produits générant le plus de tickets */}
            <ChartCard title="Produits générant le plus de tickets (proxy pannes)">
              {data.topFailingProducts.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.topFailingProducts} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf1" />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => safeNumber(value)} />
                    <Bar dataKey="ticketsCount" fill="#ef4444" name="Tickets" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Contrats — délais */}
            <ChartCard title="Contrats — délais restants" fullWidth>
              {data.contractsExpiring.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5ebf1] text-left text-[#5a7a9a]">
                        <th className="py-2">Société</th>
                        <th className="py-2">Client</th>
                        <th className="py-2">Fin de garantie</th>
                        <th className="py-2 text-right">Jours restants</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.contractsExpiring.map((c) => (
                        <tr key={c.id} className="border-b border-[#f0f3f6]">
                          <td className="py-2 font-semibold text-[#1a3a52]">{c.companyName}</td>
                          <td className="py-2 text-[#5a7a9a]">{c.clientName}</td>
                          <td className="py-2 text-[#5a7a9a]">{new Date(c.warrantyEnd).toLocaleDateString('fr-FR')}</td>
                          <td className="py-2 text-right">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                                c.urgency === 'critical'
                                  ? 'bg-red-100 text-red-600'
                                  : c.urgency === 'warning'
                                    ? 'bg-amber-100 text-amber-600'
                                    : 'bg-emerald-100 text-emerald-600'
                              }`}
                            >
                              {c.urgency === 'critical' && <AlertTriangle className="h-3 w-3" />}
                              {c.daysRemaining} j
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d0d9e3] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#5a7a9a]">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-xl font-black text-[#1a3a52] sm:text-2xl">{value}</p>
    </div>
  )
}

function ChartCard({ title, children, fullWidth }: { title: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={`rounded-2xl border border-[#d0d9e3] bg-white p-5 shadow-sm ${fullWidth ? 'xl:col-span-2' : ''}`}>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1a3a52]">{title}</h2>
      {children}
    </div>
  )
}

function EmptyState({ small }: { small?: boolean }) {
  return (
    <div className={`flex items-center justify-center text-sm text-[#94a3b8] ${small ? 'h-[180px]' : 'h-[220px]'}`}>
      Aucune donnée sur cette période
    </div>
  )
}