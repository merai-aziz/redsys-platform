'use client'

import { useEffect, useState } from 'react'
import {
  Search, Plus, X, ChevronDown, ChevronUp,
  Clock, CheckCircle, AlertCircle, Wrench, XCircle,
  User, Building2, FileText, Calendar, Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// ── Types ──────────────────────────────────────────────────────
type TicketStatus = 'OPEN' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH'

interface TicketUser { id: string; firstName: string; lastName: string; email: string; companyName?: string }
interface Employee { id: string; firstName: string; lastName: string; departement?: string }
interface TicketComment {
  id: string; content: string; createdAt: string
  author: { id: string; firstName: string; lastName: string; userRole: string }
}
interface Ticket {
  id: string; title: string; description: string
  status: TicketStatus; priority: TicketPriority
  createdAt: string; updatedAt: string
  user: TicketUser
  assignedTo?: Employee | null
  contract?: { id: string; companyName: string; warrantyEnd: string } | null
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
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
    <Card className="border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-bold text-slate-900 sm:text-base">{ticket.title}</CardTitle>
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
        <p className="text-sm text-slate-600 line-clamp-2">{ticket.description}</p>

        {ticket.contract && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            Contrat : {ticket.contract.companyName} — Garantie jusqu'au {new Date(ticket.contract.warrantyEnd).toLocaleDateString('fr-FR')}
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
                  className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-sky-400"
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
                  className="bg-sky-600 text-white hover:bg-sky-700"
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
                      <div className="flex items-center justify-between gap-2">
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
                  className="bg-sky-600 text-white hover:bg-sky-700"
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

// ── Page principale ────────────────────────────────────────────
export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'ALL'>('ALL')

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
    <div className="mx-auto w-full max-w-5xl space-y-5">
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
      <div className="flex flex-wrap gap-2">
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
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
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
        <div className="space-y-3">
          {filtered.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} employees={employees} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  )
}