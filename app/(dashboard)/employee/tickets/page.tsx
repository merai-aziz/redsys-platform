'use client'

import { useEffect, useState } from 'react'
import { 
  MessageSquare, Clock, CheckCircle, AlertCircle, 
  ChevronDown, ChevronUp, X, Package, Send, Loader2,
  User, Building2, Calendar, Tag
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type TicketStatus = 'OPEN' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

interface TicketComment {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    userRole: string
  }
}

interface TicketContract {
  id: string
  companyName: string
  warrantyEnd: string
}

interface Ticket {
  id: string
  title: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  updatedAt: string
  contract?: TicketContract | null
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    companyName?: string
  }
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
  } | null
  comments?: TicketComment[]
}

const PRIORITY_CONFIG: Record<TicketPriority, {
  label: string
  color: string
  bgColor: string
  order: number
}> = {
  LOW: {
    label: 'Basse',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    order: 1,
  },
  MEDIUM: {
    label: 'Moyenne',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    order: 2,
  },
  HIGH: {
    label: 'Haute',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    order: 3,
  },
  URGENT: {
    label: 'Urgente',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    order: 4,
  },
}

const STATUS_CONFIG: Record<TicketStatus, {
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode
}> = {
  OPEN: {
    label: 'Ouvert',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  ACCEPTED: {
    label: 'Accepté',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: <Tag className="h-3.5 w-3.5" />,
  },
  IN_PROGRESS: {
    label: 'En cours',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  RESOLVED: {
    label: 'Résolu',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  CLOSED: {
    label: 'Fermé',
    color: 'text-slate-500',
    bgColor: 'bg-slate-50 border-slate-200',
    icon: <X className="h-3.5 w-3.5" />,
  },
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

function TicketCard({ ticket, onTicketUpdate }: { ticket: Ticket; onTicketUpdate: (updated: Ticket) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const priorityConf = PRIORITY_CONFIG[ticket.priority]
  const statusConf = STATUS_CONFIG[ticket.status]
  const shortId = ticket.id.slice(0, 8).toUpperCase()
  
  const comments = ticket.comments ?? []

  async function handleUpdateStatus(newStatus: TicketStatus) {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/employee/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Erreur lors de la mise à jour')

      const data = await res.json()
      onTicketUpdate(data.ticket)
      toast.success(`Statut mis à jour : ${STATUS_CONFIG[newStatus].label}`)
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleAddComment() {
    if (!newComment.trim()) {
      toast.error('Veuillez écrire un message')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/employee/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() }),
      })

      if (!res.ok) throw new Error('Erreur lors de l\'ajout du commentaire')

      const data = await res.json()
      onTicketUpdate(data.ticket)
      setNewComment('')
      toast.success('Message envoyé')
    } catch (error) {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSubmitting(false)
    }
  }

  const canUpdateStatus = ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED'

  return (
    <Card className="border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900">
                #{shortId} - {ticket.title}
              </CardTitle>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityConf.bgColor} ${priorityConf.color}`}>
                {priorityConf.label}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusConf.bgColor} ${statusConf.color}`}>
                {statusConf.icon}
                {statusConf.label}
              </span>
            </div>
            <CardDescription className="mt-0.5 text-xs text-slate-500">
              Client: {ticket.user.firstName} {ticket.user.lastName} · {ticket.user.email}
              {ticket.user.companyName && ` · ${ticket.user.companyName}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-sm text-slate-700">{ticket.description}</p>
        </div>

        {/* Informations complémentaires */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">Créé le:</span>
            <span className="text-xs font-medium text-slate-700">{formatDateShort(ticket.createdAt)}</span>
          </div>
          {ticket.contract && (
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">Contrat:</span>
              <span className="text-xs font-medium text-slate-700">{ticket.contract.companyName}</span>
            </div>
          )}
        </div>

        {/* Actions - Changement de statut */}
        {canUpdateStatus && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-semibold text-slate-500 mr-1">Changer statut:</span>
            {ticket.status !== 'IN_PROGRESS' && (
              <Button
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
                disabled={updatingStatus}
                size="sm"
                variant="outline"
                className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Clock className="mr-1 h-3 w-3" />
                Prendre en charge
              </Button>
            )}
            {(ticket.status === 'ACCEPTED' || ticket.status === 'IN_PROGRESS') && (
              <Button
                onClick={() => handleUpdateStatus('RESOLVED')}
                disabled={updatingStatus}
                size="sm"
                variant="outline"
                className="h-7 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                Marquer comme résolu
              </Button>
            )}
          </div>
        )}

        {/* Bouton détail */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          <span className="font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages ({comments.length})
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Messages */}
        {expanded && (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
                  <p className="text-sm text-slate-500">Aucun message pour le moment</p>
                  <p className="text-xs text-slate-400 mt-1">Soyez le premier à répondre</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                          {comment.author.firstName?.[0]}{comment.author.lastName?.[0]}
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                          {comment.author.firstName} {comment.author.lastName}
                        </span>
                        {comment.author.userRole === 'EMPLOYEE' && (
                          <Badge className="bg-sky-100 text-sky-700 text-[9px]">Employé</Badge>
                        )}
                        {comment.author.userRole === 'ADMIN' && (
                          <Badge className="bg-purple-100 text-purple-700 text-[9px]">Admin</Badge>
                        )}
                        {comment.author.userRole === 'CLIENT' && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Client</Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Ajouter un message */}
            {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
              <div className="flex gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un message..."
                  rows={3}
                  className="min-h-[60px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddComment()
                    }
                  }}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={submitting || !newComment.trim()}
                  className="bg-sky-600 text-white hover:bg-sky-700 shrink-0"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {ticket.status === 'RESOLVED' && (
              <div className="rounded-lg bg-emerald-50 p-3 text-center text-xs text-emerald-700">
                Ce ticket a été résolu. Le client pourra le rouvrir si nécessaire.
              </div>
            )}
            {ticket.status === 'CLOSED' && (
              <div className="rounded-lg bg-slate-100 p-3 text-center text-xs text-slate-500">
                Ce ticket est fermé.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function EmployeeTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TicketStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/employee/tickets', { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (d.tickets) setTickets(d.tickets)
      })
      .catch(e => {
        if (e.name !== 'AbortError') console.error(e)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const handleTicketUpdate = (updated: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const filtered = tickets.filter(ticket => {
    if (filter !== 'ALL' && ticket.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        ticket.title.toLowerCase().includes(q) ||
        ticket.user.firstName.toLowerCase().includes(q) ||
        ticket.user.lastName.toLowerCase().includes(q) ||
        ticket.user.email.toLowerCase().includes(q) ||
        (ticket.user.companyName && ticket.user.companyName.toLowerCase().includes(q)) ||
        ticket.id.toLowerCase().includes(q)
      )
    }
    return true
  })

  const counts = {
    ALL: tickets.length,
    OPEN: tickets.filter(t => t.status === 'OPEN').length,
    ACCEPTED: tickets.filter(t => t.status === 'ACCEPTED').length,
    IN_PROGRESS: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    RESOLVED: tickets.filter(t => t.status === 'RESOLVED').length,
    CLOSED: tickets.filter(t => t.status === 'CLOSED').length,
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
        <h1 className="text-2xl font-black text-slate-900">Tickets support</h1>
        <p className="mt-1 text-sm text-slate-500">
          {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} assigné{tickets.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <MessageSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par titre, client, société..."
          className="h-10 pl-9 border-slate-200 bg-white text-sm"
        />
      </div>

      {/* Filtres par statut */}
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
            onClick={() => setFilter(key as TicketStatus | 'ALL')}
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
              {counts[key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Liste des tickets */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">Aucun ticket</p>
          <p className="mt-1 text-sm text-slate-500">
            {filter === 'ALL'
              ? 'Aucun ticket ne vous est assigné pour le moment.'
              : `Aucun ticket avec le statut "${STATUS_CONFIG[filter as TicketStatus]?.label}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onTicketUpdate={handleTicketUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}