'use client'

import { useEffect, useState } from 'react'
import {
  Search, Plus, X, Building2, User, Calendar,
  FileText, Shield, ShieldCheck, ShieldOff, Package,
  Upload, Link as LinkIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'


// ── Types ──────────────────────────────────────────────────────
interface ContractItem {
  id: string; name: string; description?: string; quantity: number
  product?: { name: string; image_url?: string }
}
interface ContractOrder {
  id: string; total: number; createdAt: string
  items: Array<{ id: string; description?: string; quantity: number; unitPrice: number; product?: { name: string } }>
}
interface Contract {
  id: string; companyName: string; clientFirstName: string; clientLastName: string
  clientEmail: string; clientPhone?: string; description?: string; fileUrl?: string
  warrantyMonths: number; warrantyStart: string; warrantyEnd: string
  createdAt: string
  user: { id: string; firstName: string; lastName: string; email: string; companyName?: string }
  order?: ContractOrder | null
  contractItems: ContractItem[]
  tickets: Array<{ id: string; status: string }> | undefined
}
interface ClientSearchResult {
  id: string; firstName: string; lastName: string; email: string; companyName?: string; userRole?: string
}
interface OrderResult {
  id: string; total: number; createdAt: string; status: string
  items: Array<{ id: string; quantity: number; unitPrice: number; description?: string; product?: { name: string } }>
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatCurrency(v: number | string) {
  return Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}
function warrantyStatus(warrantyEnd: string) {
  const now = new Date()
  const end = new Date(warrantyEnd)
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: 'Expirée', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: <ShieldOff className="h-3.5 w-3.5" /> }
  if (daysLeft <= 30) return { label: `${daysLeft}j restants`, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <Shield className="h-3.5 w-3.5" /> }
  return { label: `${daysLeft}j restants`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: <ShieldCheck className="h-3.5 w-3.5" /> }
}

// ── Formulaire création contrat ────────────────────────────────
function CreateContractModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Contract) => void }) {
  const [step, setStep] = useState<'search' | 'form'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [clients, setClients] = useState<ClientSearchResult[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null)
  const [clientOrders, setClientOrders] = useState<OrderResult[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  const [form, setForm] = useState({
    companyName: '', clientPhone: '', description: '',
    fileUrl: '', warrantyMonths: 12, warrantyStart: new Date().toISOString().split('T')[0],
  })
  const [manualItems, setManualItems] = useState<Array<{ name: string; quantity: number }>>([])

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/users?role=CLIENT&search=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Erreur de recherche')
      
      const clients = (data.users ?? []).filter((u: any) => u.userRole === 'CLIENT')
      setClients(clients)
      
      if (clients.length === 0 && searchQuery.trim()) {
        toast.info('Aucun client trouvé. Les clients doivent d\'abord créer leur compte.')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Erreur lors de la recherche')
      setClients([])
    } finally {
      setSearching(false)
    }
  }

  async function handleSelectClient(client: ClientSearchResult) {
    setSelectedClient(client)
    setForm(f => ({ ...f, companyName: client.companyName ?? '' }))
    try {
      const res = await fetch(`/api/admin/orders?userId=${client.id}&status=COMPLETED`)
      const data = await res.json()
      setClientOrders(data.orders ?? [])
    } catch { /* silencieux */ }
    setStep('form')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 10 Mo')
      return
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez PDF, JPG, PNG ou DOC')
      return
    }

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')
      
      const data = await res.json()
      setForm(f => ({ ...f, fileUrl: data.fileUrl }))
      toast.success('Fichier uploadé avec succès')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Erreur lors de l\'upload du fichier')
    } finally {
      setUploadingFile(false)
    }
  }

  async function handleSubmit() {
    if (!selectedClient || !form.companyName || !form.warrantyStart) {
      toast.error('Champs obligatoires manquants')
      return
    }
    setSubmitting(true)
    try {
      const items = selectedOrder
        ? selectedOrder.items.map(i => ({ productId: undefined, name: i.product?.name ?? i.description ?? 'Produit', quantity: i.quantity }))
        : manualItems.filter(i => i.name.trim())

      const res = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedClient.id,
          orderId: selectedOrder?.id ?? null,
          companyName: form.companyName,
          clientFirstName: selectedClient.firstName,
          clientLastName: selectedClient.lastName,
          clientEmail: selectedClient.email,
          clientPhone: form.clientPhone || null,
          description: form.description || null,
          fileUrl: form.fileUrl || null,
          warrantyMonths: form.warrantyMonths,
          warrantyStart: form.warrantyStart,
          items,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated(data.contract)
        toast.success('Contrat créé avec succès')
        onClose()
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Erreur')
      }
    } catch { toast.error('Erreur réseau') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Nouveau contrat de garantie</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {step === 'search' && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Rechercher un client par nom ou société</p>
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nom, prénom, société..."
                    className="flex-1 border-slate-200"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                  />
                  <Button onClick={handleSearch} disabled={searching} className="bg-sky-600 text-white hover:bg-sky-700">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {clients.length > 0 && (
                <div className="space-y-2">
                  {clients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => handleSelectClient(client)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-sm">
                        {client.firstName?.[0]}{client.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{client.firstName} {client.lastName}</p>
                        <p className="text-xs text-slate-500">{client.email}{client.companyName ? ` · ${client.companyName}` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {clients.length === 0 && searchQuery && !searching && (
                <p className="text-sm text-slate-500">Aucun client trouvé pour "{searchQuery}"</p>
              )}
            </div>
          )}

          {step === 'form' && selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-sky-50 px-4 py-3">
                <User className="h-5 w-5 shrink-0 text-sky-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{selectedClient.firstName} {selectedClient.lastName}</p>
                  <p className="text-xs text-slate-500">{selectedClient.email}</p>
                </div>
                <button onClick={() => { setStep('search'); setSelectedClient(null); setSelectedOrder(null) }} className="text-xs text-sky-600 hover:underline">Changer</button>
              </div>

              {clientOrders.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Lier à une commande livrée</p>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {clientOrders.map(order => (
                      <label key={order.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selectedOrder?.id === order.id ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" name="order" checked={selectedOrder?.id === order.id} onChange={() => setSelectedOrder(order)} className="accent-sky-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700">#{order.id.slice(0, 8).toUpperCase()} — {formatCurrency(order.total)}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(order.createdAt)} · {order.items.length} article(s)</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Société *</label>
                  <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="border-slate-200" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Téléphone</label>
                  <Input value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} className="border-slate-200" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Durée garantie (mois) *</label>
                  <Input type="number" min={1} max={60} value={form.warrantyMonths} onChange={e => setForm(f => ({ ...f, warrantyMonths: Number(e.target.value) }))} className="border-slate-200" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Date début garantie *</label>
                  <Input type="date" value={form.warrantyStart} onChange={e => setForm(f => ({ ...f, warrantyStart: e.target.value }))} className="border-slate-200" />
                </div>
                
                {/* Upload de fichier */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Document du contrat (PDF, image, etc.)</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input 
                        value={form.fileUrl} 
                        onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} 
                        placeholder="https://... ou /uploads/contrat.pdf" 
                        className="border-slate-200" 
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Button type="button" disabled={uploadingFile} variant="outline" className="border-slate-200">
                        {uploadingFile ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Formats acceptés: PDF, JPG, PNG, DOC (max 10 Mo)</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Description / Notes</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400 resize-none"
                    placeholder="Notes sur le contrat..."
                  />
                </div>
              </div>

              {!selectedOrder && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Produits couverts</p>
                    <button onClick={() => setManualItems(p => [...p, { name: '', quantity: 1 }])} className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline">
                      <Plus className="h-3.5 w-3.5" /> Ajouter
                    </button>
                  </div>
                  {manualItems.map((item, idx) => (
                    <div key={idx} className="mb-2 flex gap-2">
                      <Input
                        value={item.name}
                        onChange={e => setManualItems(p => p.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                        placeholder="Nom du produit"
                        className="flex-1 border-slate-200 text-sm"
                      />
                      <Input
                        type="number" min={1} value={item.quantity}
                        onChange={e => setManualItems(p => p.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))}
                        className="w-16 border-slate-200 text-sm"
                      />
                      <button onClick={() => setManualItems(p => p.filter((_, i) => i !== idx))} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button variant="ghost" onClick={onClose} className="text-slate-600">Annuler</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="bg-sky-600 text-white hover:bg-sky-700">
                  {submitting ? 'Création...' : 'Créer le contrat'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Carte contrat ──────────────────────────────────────────────
function ContractCard({ contract }: { contract: Contract }) {
  const [expanded, setExpanded] = useState(false)
  const ws = warrantyStatus(contract.warrantyEnd)
  const openTickets = (contract.tickets ?? []).filter(t => !['CLOSED', 'RESOLVED'].includes(t.status)).length

  return (
    <Card className="border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-bold text-slate-900 sm:text-base">{contract.companyName}</CardTitle>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ws.bg} ${ws.color}`}>
                {ws.icon}{ws.label}
              </span>
              {openTickets > 0 && (
                <Badge className="bg-amber-100 text-amber-700 text-[10px]">{openTickets} ticket{openTickets > 1 ? 's' : ''} ouvert{openTickets > 1 ? 's' : ''}</Badge>
              )}
            </div>
            <CardDescription className="mt-0.5 text-xs text-slate-500">
              {contract.clientFirstName} {contract.clientLastName} · {contract.clientEmail}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-400">Début</p>
            <p className="text-xs font-bold text-slate-900">{formatDate(contract.warrantyStart)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-400">Fin</p>
            <p className="text-xs font-bold text-slate-900">{formatDate(contract.warrantyEnd)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-400">Durée</p>
            <p className="text-xs font-bold text-slate-900">{contract.warrantyMonths} mois</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-400">Produits</p>
            <p className="text-xs font-bold text-slate-900">{contract.contractItems?.length ?? 0}</p>
          </div>
        </div>

        {contract.fileUrl && (
          <a href={contract.fileUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:underline">
            <FileText className="h-3.5 w-3.5" /> Voir le contrat
          </a>
        )}

        <button
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-50"
        >
          <span className="font-medium">Voir les produits</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (contract.contractItems?.length ?? 0) > 0 && (
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
            {contract.contractItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
                <Package className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900">{item.name}</p>
                  {item.description && <p className="text-[10px] text-slate-400">{item.description}</p>}
                </div>
                <span className="text-xs text-slate-500">×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page principale ────────────────────────────────────────────
export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/contracts', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (d.contracts) setContracts(d.contracts) })
      .catch(e => { if (e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const filtered = contracts.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.companyName.toLowerCase().includes(q) ||
      c.clientFirstName.toLowerCase().includes(q) ||
      c.clientLastName.toLowerCase().includes(q) ||
      c.clientEmail.toLowerCase().includes(q)
    )
  })

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {showModal && (
        <CreateContractModal
          onClose={() => setShowModal(false)}
          onCreated={(c) => setContracts(prev => [c as unknown as Contract, ...prev])}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Contrats & Garanties</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{contracts.length} contrat{contracts.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-sky-600 text-white hover:bg-sky-700">
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau contrat
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par société, client..." className="h-10 pl-9 border-slate-200 bg-white text-sm" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Shield className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">Aucun contrat</p>
          <p className="mt-1 text-sm text-slate-500">Créez un contrat de garantie pour un client.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(contract => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      )}
    </div>
  )
}