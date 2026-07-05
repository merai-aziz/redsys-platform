'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, X, ChevronDown, ChevronUp,
  Clock, CheckCircle, AlertCircle, Wrench, XCircle,
  User, Building2, FileText, Calendar, Send,
  Sparkles, ChevronLeft, ChevronRight, Package, SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// ── Types ──────────────────────────────────────────────────────
type TicketStatus = 'OPEN' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface TicketUser { id: string; firstName: string; lastName: string; email: string; companyName?: string }
interface Employee { id: string; firstName: string; lastName: string; departement?: string }
interface TicketComment {
  id: string; content: string; createdAt: string
  author: { id: string; firstName: string; lastName: string; userRole: string }
}

// ─── Options de configuration d'un produit configurable (même forme que
// sur les pages commandes/contrats) ───────────────────────────────────────
interface SelectedOption {
  id?: string | number
  optionName: string
  valueName: string
  groupName?: string | null
  price?: number | string
}

// ─── Produit couvert par le contrat lié au ticket ────────────────────────
interface ContractItem {
  id: string; name: string; quantity: number
  product?: { name: string; type?: 'STANDARD' | 'CONFIGURABLE' }
  // Présent uniquement si le produit est CONFIGURABLE et que l'API /api/admin/tickets le fournit
  selectedOptions?: SelectedOption[]
}

interface Ticket {
  id: string; title: string; description: string
  status: TicketStatus; priority: TicketPriority
  createdAt: string; updatedAt: string
  user: TicketUser
  assignedTo?: Employee | null
  contract?: {
    id: string; companyName: string; warrantyEnd: string
    // Présent uniquement si l'API renvoie le détail des produits du contrat
    contractItems?: ContractItem[]
  } | null
  comments: TicketComment[]
}

// ── Config statuts ─────────────────────────────────────────────
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  OPEN:        { label: 'Ouvert',       color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   icon: <Clock className="h-3.5 w-3.5" /> },
  ACCEPTED:    { label: 'Accepté',      color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',     icon: <CheckCircle className="h-3.5 w-3.5" /> },
  IN_PROGRESS: { label: 'En cours',     color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200', icon: <Wrench className="h-3.5 w-3.5" /> },
  RESOLVED:    { label: 'Résolu',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  CLOSED:      { label: 'Fermé',        color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200',   icon: <XCircle className="h-3.5 w-3.5" /> },
}

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  LOW:    { label: 'Faible',  color: 'text-slate-500' },
  MEDIUM: { label: 'Moyen',   color: 'text-amber-600' },
  HIGH:   { label: 'Élevée',  color: 'text-red-600' },
  URGENT: { label: 'Urgente', color: 'text-red-700 font-bold' },
}

const TICKETS_PER_PAGE = 6
// Un ticket est considéré "nouveau" s'il a été créé il y a moins de 24h.
// (Il n'existe pas encore de champ "vu / non vu" côté backend — à défaut,
// on se base sur la fraîcheur de création.)
const NEW_TICKET_WINDOW_MS = 24 * 60 * 60 * 1000

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatCurrency(v: number | string) {
  return Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}
function isRecentTicket(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < NEW_TICKET_WINDOW_MS
}

// ─── Regroupe les options par groupName pour un affichage plus clair ─────────
function groupSelectedOptions(options: SelectedOption[]) {
  const map = new Map<string, SelectedOption[]>()
  const order: string[] = []
  for (const opt of options) {
    const key = opt.groupName?.trim() || opt.optionName
    if (!map.has(key)) {
      order.push(key)
      map.set(key, [])
    }
    map.get(key)!.push(opt)
  }
  return order.map((key) => ({ groupLabel: key, items: map.get(key)! }))
}

// ─── Aperçu des produits couverts par le contrat lié au ticket ───────────────
// Standard → affichage simple. Configurable → options groupées, comme sur
// les pages commandes/contrats.
function TicketContractProducts({ items }: { items: ContractItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isConfigurable = item.product?.type === 'CONFIGURABLE'
        const options = item.selectedOptions ?? []
        const grouped = groupSelectedOptions(options)

        return (
          <div key={item.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-2 p-2">
              <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-900">
                {item.product?.name ?? item.name}
              </p>
              {isConfigurable ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-purple-50 px-1.5 py-0.5 text-[9px] font-semibold text-purple-700">
                  <SlidersHorizontal className="h-2.5 w-2.5" /> Configuré
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                  Standard
                </span>
              )}
              <span className="shrink-0 text-[10px] text-slate-400">×{item.quantity}</span>
            </div>

            {isConfigurable && options.length > 0 && (
              <div className="space-y-1.5 border-t border-slate-100 bg-slate-50/70 px-2 py-1.5">
                {grouped.map(({ groupLabel, items: groupItems }) => (
                  <div key={groupLabel} className="rounded-md border border-slate-200 bg-white px-2 py-1">
                    <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">{groupLabel}</p>
                    <div className="flex flex-wrap gap-1">
                      {groupItems.map((opt, idx) => (
                        <span
                          key={opt.id ?? `${opt.optionName}-${idx}`}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          <span className="h-1 w-1 rounded-full bg-[#2ad1a4]" />
                          {opt.valueName}
                          {Number(opt.price) > 0 && (
                            <span className="text-[#0f6e56]">+{formatCurrency(opt.price!)}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Composant carte ticket ─────────────────────────────────────
function TicketCard({
  ticket,
  employees,
  onUpdated,
}: {
  ticket: Ticket
  employees: Employee[]
  onUpdated: (t: Ticket) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [comment, setComment] = useState('')
  const [assignedToId, setAssignedToId] = useState(ticket.assignedTo?.id ?? '')
  const sc = STATUS_CONFIG[ticket.status]
  const pc = PRIORITY_CONFIG[ticket.priority]
  const isNew = isRecentTicket(ticket.createdAt)

  const NEXT_STATUSES: Record<TicketStatus, TicketStatus[]> = {
    OPEN:        ['ACCEPTED', 'CLOSED'],
    ACCEPTED:    ['IN_PROGRESS', 'CLOSED'],
    IN_PROGRESS: ['RESOLVED', 'CLOSED'],
    RESOLVED:    ['CLOSED'],
    CLOSED:      [],
  }

  async function handleUpdate(status?: TicketStatus) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(status ? { status } : {}),
          assignedToId: assignedToId || null,
          comment: comment.trim() || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdated(data.ticket)
        setComment('')
        toast.success('Ticket mis à jour')
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
    <Card className={`bg-white shadow-sm transition hover:shadow-md ${isNew ? 'border-emerald-300 ring-2 ring-emerald-200' : 'border-slate-200'}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <CardTitle className="text-sm font-bold text-slate-900 sm:text-base">{ticket.title}</CardTitle>
              {isNew && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <Sparkles className="h-3 w-3" /> Nouveau
                </span>
              )}
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sc.bg} ${sc.color}`}>
                {sc.icon}{sc.label}
              </span>
              <span className={`text-xs font-semibold ${pc.color}`}>● {pc.label}</span>
            </div>
            <CardDescription className="mt-0.5 text-xs text-slate-500">
              {ticket.user.companyName && <span className="font-medium text-slate-700">{ticket.user.companyName} · </span>}
              {ticket.user.firstName} {ticket.user.lastName} · {formatDate(ticket.createdAt)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600 line-clamp-2 sm:line-clamp-3">{ticket.description}</p>

        {ticket.contract && (
          <div className="space-y-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <div className="flex flex-wrap items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">
                Contrat : {ticket.contract.companyName} — Garantie jusqu'au {new Date(ticket.contract.warrantyEnd).toLocaleDateString('fr-FR')}
              </span>
            </div>
            {ticket.contract.contractItems && ticket.contract.contractItems.length > 0 && (
              <TicketContractProducts items={ticket.contract.contractItems} />
            )}
          </div>
        )}

        {/* Actions statut */}
        {NEXT_STATUSES[ticket.status].length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Changer :</span>
            {NEXT_STATUSES[ticket.status].map((s) => {
              const conf = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => handleUpdate(s)}
                  disabled={updating}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50 ${conf.bg} ${conf.color}`}
                >
                  {conf.icon}{conf.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Toggle détail */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-50 sm:text-sm"
        >
          <span className="font-medium">Détails & assignation</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
            {/* Assigner un employé */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assigner à un employé</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="h-9 w-full flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-sky-400 sm:w-auto"
                >
                  <option value="">— Non assigné —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}{emp.departement ? ` (${emp.departement})` : ''}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={() => handleUpdate()}
                  disabled={updating}
                  className="w-full bg-sky-600 text-white hover:bg-sky-700 sm:w-auto"
                >
                  Assigner
                </Button>
              </div>
              {ticket.assignedTo && (
                <p className="text-xs text-slate-500">
                  Actuellement assigné à : <span className="font-semibold text-slate-700">{ticket.assignedTo.firstName} {ticket.assignedTo.lastName}</span>
                  {ticket.assignedTo.departement && ` — ${ticket.assignedTo.departement}`}
                </p>
              )}
            </div>

            {/* Commentaires */}
            {ticket.comments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Historique</p>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {ticket.comments.map((c) => (
                    <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold text-slate-700">
                          {c.author.firstName} {c.author.lastName}
                          <Badge className="ml-1.5 text-[10px]">{c.author.userRole}</Badge>
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ajouter commentaire */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ajouter une note</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Note interne..."
                  className="h-9 flex-1 border-slate-200 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) handleUpdate() }}
                />
                <Button
                  size="sm"
                  onClick={() => handleUpdate()}
                  disabled={!comment.trim() || updating}
                  className="w-full bg-sky-600 text-white hover:bg-sky-700 sm:w-auto"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Pagination ───────────────────────────────────────────────
function TicketsPagination({
  currentPage, totalPages, totalItems, itemsPerPage, onPageChange,
}: {
  currentPage: number; totalPages: number; totalItems: number; itemsPerPage: number
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
              <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-[2rem] rounded-md px-2 text-xs font-semibold transition ${
                  p === currentPage ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
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

// ── Page principale ────────────────────────────────────────────
export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'ALL'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      fetch('/api/admin/tickets', { signal: controller.signal }).then(r => r.json()),
      fetch('/api/admin/users', { signal: controller.signal }).then(r => r.json()),
    ])
      .then(([ticketsData, usersData]) => {
        if (ticketsData.tickets) setTickets(ticketsData.tickets)
        if (usersData.users) setEmployees(usersData.users)
      })
      .catch((e) => { if (e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [])

  function handleUpdated(updated: Ticket) {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const filtered = tickets
    .filter(t => filterStatus === 'ALL' || t.status === filterStatus)
    .filter(t => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        t.title.toLowerCase().includes(q) ||
        t.user.firstName.toLowerCase().includes(q) ||
        t.user.lastName.toLowerCase().includes(q) ||
        (t.user.companyName ?? '').toLowerCase().includes(q)
      )
    })

  // Revenir à la page 1 dès que le filtre ou la recherche change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / TICKETS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice(
    (safePage - 1) * TICKETS_PER_PAGE,
    safePage * TICKETS_PER_PAGE
  )

  const counts = {
    ALL: tickets.length,
    OPEN: tickets.filter(t => t.status === 'OPEN').length,
    ACCEPTED: tickets.filter(t => t.status === 'ACCEPTED').length,
    IN_PROGRESS: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    RESOLVED: tickets.filter(t => t.status === 'RESOLVED').length,
    CLOSED: tickets.filter(t => t.status === 'CLOSED').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-3 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Gestion des tickets</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} au total</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par titre, client ou société..."
          className="h-10 pl-9 border-slate-200 bg-white text-sm"
        />
      </div>

      {/* Filtres */}
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {([
          ['ALL', 'Tous'],
          ['OPEN', 'Ouverts'],
          ['ACCEPTED', 'Acceptés'],
          ['IN_PROGRESS', 'En cours'],
          ['RESOLVED', 'Résolus'],
          ['CLOSED', 'Fermés'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filterStatus === key ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filterStatus === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">Aucun ticket trouvé</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} employees={employees} onUpdated={handleUpdated} />
            ))}
          </div>

          <TicketsPagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={TICKETS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  )
}