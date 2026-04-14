'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { Loader2, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type SkuRow = {
  id: string
  modelId: string
  reference: string
  name: string
  price: number | null
  stockQty: number
  condition: string | null
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED'
  model: {
    id: string
    name: string
    domain: { label: string }
    brand: { name: string }
  }
}

type SkuListResponse = {
  skus: SkuRow[]
  total: number
  page: number
  totalPages: number
}

type ModelOption = {
  id: string
  name: string
  reference: string
}

const editSchema = z.object({
  reference: z.string().min(1, 'Reference requise'),
  name: z.string().min(1, 'Nom requis'),
  price: z.coerce.number().min(0, 'Prix invalide'),
  stockQty: z.coerce.number().int().min(0, 'Stock invalide'),
  condition: z.string().min(1, 'Condition requise'),
  status: z.enum(['AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED']),
})

type EditForm = {
  reference: string
  name: string
  price: string
  stockQty: string
  condition: string
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED'
}

const emptyForm: EditForm = {
  reference: '',
  name: '',
  price: '',
  stockQty: '0',
  condition: '',
  status: 'AVAILABLE',
}

function statusTone(status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED') {
  if (status === 'AVAILABLE') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
  if (status === 'OUT_OF_STOCK') return 'bg-amber-100 text-amber-700 hover:bg-amber-100'
  return 'bg-rose-100 text-rose-700 hover:bg-rose-100'
}

export default function AdminSkusPage() {
  const [skus, setSkus] = useState<SkuRow[]>([])
  const [models, setModels] = useState<ModelOption[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState('')
  const [modelId, setModelId] = useState('')
  const [status, setStatus] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm>(emptyForm)

  const requestJson = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      },
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Erreur serveur')
    }

    return data as T
  }, [])

  const loadModels = useCallback(async () => {
    const data = await requestJson<{ models: ModelOption[] }>('/api/admin/model')
    setModels(data.models || [])
  }, [requestJson])

  const loadSkus = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      })

      if (modelId) params.set('modelId', modelId)
      if (search.trim()) params.set('search', search.trim())
      if (status) params.set('status', status)

      const data = await requestJson<SkuListResponse>(`/api/admin/skus?${params.toString()}`)
      setSkus(data.skus || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [modelId, page, requestJson, search, status])

  useEffect(() => {
    void loadModels().catch(() => {
      toast.error('Chargement modeles impossible')
    })
  }, [loadModels])

  useEffect(() => {
    void loadSkus()
  }, [loadSkus])

  const filteredSkus = useMemo(() => skus, [skus])

  function resetFilters() {
    setSearch('')
    setModelId('')
    setStatus('')
    setPage(1)
  }

  function openEditModal(sku: SkuRow) {
    setEditId(sku.id)
    setForm({
      reference: sku.reference,
      name: sku.name,
      price: String(sku.price ?? 0),
      stockQty: String(sku.stockQty),
      condition: sku.condition ?? '',
      status: sku.status,
    })
  }

  async function saveEdit() {
    if (!editId) return

    const parsed = editSchema.safeParse({
      reference: form.reference,
      name: form.name,
      price: form.price,
      stockQty: form.stockQty,
      condition: form.condition,
      status: form.status,
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Validation invalide')
      return
    }

    setSaving(true)
    try {
      await requestJson(`/api/admin/sku/${editId}`, {
        method: 'PUT',
        body: JSON.stringify({
          reference: form.reference,
          name: form.name,
          price: Number(form.price),
          stock: Number(form.stockQty),
          condition: form.condition,
          status: form.status,
        }),
      })
      toast.success('SKU mis a jour')
      setEditId(null)
      await loadSkus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise a jour impossible')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return

    setDeleting(true)
    try {
      await requestJson(`/api/admin/sku/${deleteId}`, { method: 'DELETE' })
      toast.success('SKU supprime')
      setDeleteId(null)
      await loadSkus()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SKUs</h1>
        <p className="mt-1 text-sm text-slate-500">Liste globale des references SKU.</p>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-5">
          <select
            value={modelId}
            onChange={(event) => {
              setModelId(event.target.value)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="">Tous les modeles</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>{model.name} - {model.reference}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="">Tous statuts</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
            <option value="DISCONTINUED">DISCONTINUED</option>
          </select>

          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Rechercher reference ou nom"
              className="h-10 bg-slate-50 pl-9"
            />
          </div>

          <Button variant="outline" onClick={resetFilters}>Reset</Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>SKUs ({total})</CardTitle>
          <CardDescription>Edition et suppression des SKUs existants.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Modele</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-600" />
                  </TableCell>
                </TableRow>
              ) : filteredSkus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-slate-500">Aucun SKU.</TableCell>
                </TableRow>
              ) : (
                filteredSkus.map((sku) => (
                  <TableRow key={sku.id}>
                    <TableCell className="font-medium text-slate-900">{sku.reference}</TableCell>
                    <TableCell>{sku.name}</TableCell>
                    <TableCell>{sku.model.name}</TableCell>
                    <TableCell>
                      {sku.price === null
                        ? 'N/A'
                        : Number(sku.price).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </TableCell>
                    <TableCell>{sku.stockQty}</TableCell>
                    <TableCell>{sku.condition || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={statusTone(sku.status)}>{sku.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon-sm" onClick={() => openEditModal(sku)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon-sm" className="text-rose-600" onClick={() => setDeleteId(sku.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-5">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    text="Precedent"
                    onClick={(event) => {
                      event.preventDefault()
                      setPage((prev) => Math.max(1, prev - 1))
                    }}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                  .map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(event) => {
                          event.preventDefault()
                          setPage(p)
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    text="Suivant"
                    onClick={(event) => {
                      event.preventDefault()
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editId)} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editer SKU</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Reference</Label>
              <Input
                value={form.reference}
                onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
                className="mt-2 h-10"
              />
            </div>
            <div>
              <Label>Nom</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 h-10"
              />
            </div>
            <div>
              <Label>Prix</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                className="mt-2 h-10"
              />
            </div>
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={form.stockQty}
                onChange={(event) => setForm((prev) => ({ ...prev, stockQty: event.target.value }))}
                className="mt-2 h-10"
              />
            </div>
            <div>
              <Label>Condition</Label>
              <Input
                value={form.condition}
                onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value }))}
                className="mt-2 h-10"
              />
            </div>
            <div>
              <Label>Statut</Label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED' }))
                }
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                <option value="DISCONTINUED">DISCONTINUED</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Annuler</Button>
            <Button onClick={() => void saveEdit()} disabled={saving} className="bg-sky-600 text-white hover:bg-sky-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Voulez-vous supprimer ce SKU ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button onClick={() => void confirmDelete()} disabled={deleting} className="bg-rose-600 text-white hover:bg-rose-700">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
