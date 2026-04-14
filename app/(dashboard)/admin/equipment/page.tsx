'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

type AdminTab = 'model' | 'domain' | 'brand' | 'series'
type EditorType = AdminTab
type EditorMode = 'create' | 'edit'

interface Domain {
  id: string
  label: string
  code: string
  slug: string
  icon?: string | null
  sortOrder: number
  isActive: boolean
}

interface Brand {
  id: string
  name: string
  slug: string
  description?: string | null
  logo?: string | null
  domainId: string
  domain?: { id: string; label: string }
  isActive?: boolean
}

interface Series {
  id: string
  name: string
  slug: string
  description?: string | null
  domainId: string
  brandId: string
  domain?: { id: string; label: string }
  brand?: { id: string; name: string }
}

interface EquipmentModelItem {
  id: string
  name: string
  slug: string
  image?: string | null
  reference: string
  shortDescription?: string | null
  longDescription?: string | null
  basePrice?: string | number | null
  stockQty: number
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED'
  condition?: string | null
  domainId: string
  brandId: string
  seriesId: string
  domain?: { id: string; label: string }
  brand?: { id: string; name: string }
  series?: { id: string; name: string }
}

interface EditorState {
  type: EditorType
  mode: EditorMode
  id?: string
}

const defaultForm = {
  name: '',
  slug: '',
  code: '',
  sortOrder: '0',
  icon: '',
  description: '',
  logo: '',
  domainId: '',
  brandId: '',
  seriesId: '',
  reference: '',
  basePrice: '',
  stockQty: '0',
  status: 'AVAILABLE' as EquipmentModelItem['status'],
  condition: 'NEW',
  shortDescription: '',
  longDescription: '',
  image: '',
}

export default function AdminEquipmentPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('model')

  const [domains, setDomains] = useState<Domain[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [models, setModels] = useState<EquipmentModelItem[]>([])

  const [search, setSearch] = useState('')
  const [filterDomainId, setFilterDomainId] = useState('')
  const [filterBrandId, setFilterBrandId] = useState('')
  const [filterSeriesId, setFilterSeriesId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modelPage, setModelPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editor, setEditor] = useState<EditorState | null>(null)
  const [form, setForm] = useState(defaultForm)
  const photoInputRef = useRef<HTMLInputElement>(null)

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
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
  }

  async function loadMeta() {
    const [domainRes, brandRes, seriesRes] = await Promise.all([
      requestJson<{ domains: Domain[] }>('/api/admin/domain'),
      requestJson<{ brands: Brand[] }>('/api/admin/brand'),
      requestJson<{ series: Series[] }>('/api/admin/series'),
    ])

    setDomains(domainRes.domains)
    setBrands(brandRes.brands)
    setSeries(seriesRes.series)
  }

  async function loadModels() {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (filterDomainId) params.set('domainId', filterDomainId)
    if (filterBrandId) params.set('brandId', filterBrandId)
    if (filterSeriesId) params.set('seriesId', filterSeriesId)

    const data = await requestJson<{ models: EquipmentModelItem[] }>(`/api/admin/model?${params.toString()}`)

    setModels(
      data.models.filter((item) => {
        if (!filterStatus) return true
        return item.status === filterStatus
      })
    )
  }

  async function bootstrap() {
    setRefreshing(true)
    setLoading(true)
    try {
      await Promise.all([loadMeta(), loadModels()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement impossible')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadModels().catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Chargement impossible')
      })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [search, filterDomainId, filterBrandId, filterSeriesId, filterStatus])

  function openEditor(type: EditorType, mode: EditorMode, item?: Record<string, unknown>) {
    setEditor({ type, mode, id: item?.id as string | undefined })

    if (type === 'domain') {
      setForm({
        ...defaultForm,
        name: (item?.label as string) || '',
        slug: (item?.slug as string) || '',
        code: (item?.code as string) || '',
        icon: (item?.icon as string) || '',
        sortOrder: String((item?.sortOrder as number) ?? 0),
      })
      return
    }

    if (type === 'brand') {
      setForm({
        ...defaultForm,
        name: (item?.name as string) || '',
        slug: (item?.slug as string) || '',
        description: (item?.description as string) || '',
        logo: (item?.logo as string) || '',
        domainId: (item?.domainId as string) || (item?.domain as { id: string } | undefined)?.id || '',
      })
      return
    }

    if (type === 'series') {
      setForm({
        ...defaultForm,
        name: (item?.name as string) || '',
        slug: (item?.slug as string) || '',
        description: (item?.description as string) || '',
        domainId: (item?.domainId as string) || (item?.domain as { id: string } | undefined)?.id || '',
        brandId: (item?.brandId as string) || (item?.brand as { id: string } | undefined)?.id || '',
      })
      return
    }

    setForm({
      ...defaultForm,
      name: (item?.name as string) || '',
      slug: (item?.slug as string) || '',
      image: (item?.image as string) || '',
      reference: (item?.reference as string) || '',
      shortDescription: (item?.shortDescription as string) || '',
      longDescription: (item?.longDescription as string) || '',
      basePrice: String((item?.basePrice as string | number | null) ?? ''),
      stockQty: String((item?.stockQty as number) ?? 0),
      status: (item?.status as EquipmentModelItem['status']) || 'AVAILABLE',
      condition: (item?.condition as string) || 'NEW',
      domainId: (item?.domainId as string) || (item?.domain as { id: string } | undefined)?.id || '',
      brandId: (item?.brandId as string) || (item?.brand as { id: string } | undefined)?.id || '',
      seriesId: (item?.seriesId as string) || (item?.series as { id: string } | undefined)?.id || '',
    })
  }

  function closeEditor() {
    setEditor(null)
    setForm(defaultForm)
  }

  async function handlePhotoUpload(file: File) {
    const body = new FormData()
    body.append('photo', file)

    const res = await fetch('/api/admin/equipment/photo', { method: 'POST', body })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload impossible')

    setForm((prev) => ({ ...prev, image: data.photo }))
  }

  async function handleDelete(type: EditorType, id: string) {
    if (!window.confirm('Confirmer la suppression ?')) return

    try {
      if (type === 'domain') {
        await requestJson(`/api/admin/domain/${id}`, { method: 'DELETE' })
      } else if (type === 'brand') {
        await requestJson(`/api/admin/brand/${id}`, { method: 'DELETE' })
      } else if (type === 'series') {
        await requestJson(`/api/admin/series/${id}`, { method: 'DELETE' })
      } else {
        await requestJson(`/api/admin/model/${id}`, { method: 'DELETE' })
      }

      toast.success('Suppression effectuee')
      await bootstrap()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible')
    }
  }

  async function handleSave() {
    if (!editor) return

    if (!form.name.trim()) {
      toast.error('Le nom est requis')
      return
    }

    if (editor.type === 'brand' && !form.domainId) {
      toast.error('Choisissez un domaine')
      return
    }

    if (editor.type === 'series' && (!form.domainId || !form.brandId)) {
      toast.error('Choisissez domaine et marque')
      return
    }

    if (editor.type === 'model' && (!form.domainId || !form.brandId || !form.seriesId || !form.reference.trim())) {
      toast.error('Model: domaine, marque, serie et reference sont obligatoires')
      return
    }

    setSaving(true)

    try {
      if (editor.type === 'domain') {
        const url = editor.mode === 'create' ? '/api/admin/domain' : `/api/admin/domain/${editor.id}`
        const method = editor.mode === 'create' ? 'POST' : 'PUT'

        await requestJson(url, {
          method,
          body: JSON.stringify({
            label: form.name,
            code: form.code || undefined,
            slug: form.slug || undefined,
            icon: form.icon || null,
            sortOrder: Number(form.sortOrder) || 0,
          }),
        })
      } else if (editor.type === 'brand') {
        const url = editor.mode === 'create' ? '/api/admin/brand' : `/api/admin/brand/${editor.id}`
        const method = editor.mode === 'create' ? 'POST' : 'PUT'

        await requestJson(url, {
          method,
          body: JSON.stringify({
            name: form.name,
            slug: form.slug || undefined,
            description: form.description || null,
            logo: form.logo || null,
            domainId: form.domainId,
          }),
        })
      } else if (editor.type === 'series') {
        const url = editor.mode === 'create' ? '/api/admin/series' : `/api/admin/series/${editor.id}`
        const method = editor.mode === 'create' ? 'POST' : 'PUT'

        await requestJson(url, {
          method,
          body: JSON.stringify({
            name: form.name,
            slug: form.slug || undefined,
            description: form.description || null,
            domainId: form.domainId,
            brandId: form.brandId,
          }),
        })
      } else {
        const url = editor.mode === 'create' ? '/api/admin/model' : `/api/admin/model/${editor.id}`
        const method = editor.mode === 'create' ? 'POST' : 'PUT'

        await requestJson(url, {
          method,
          body: JSON.stringify({
            name: form.name,
            slug: form.slug || undefined,
            reference: form.reference,
            shortDescription: form.shortDescription || null,
            longDescription: form.longDescription || null,
            basePrice: form.basePrice ? Number(form.basePrice) : 0,
            stockQty: Number(form.stockQty) || 0,
            status: form.status,
            condition: form.condition || null,
            image: form.image || null,
            domainId: form.domainId,
            brandId: form.brandId,
            seriesId: form.seriesId,
          }),
        })
      }

      toast.success(editor.mode === 'create' ? 'Element cree' : 'Element mis a jour')
      closeEditor()
      await bootstrap()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation impossible')
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    const available = models.filter((m) => m.status === 'AVAILABLE').length
    const out = models.filter((m) => m.status === 'OUT_OF_STOCK').length
    const totalStock = models.reduce((sum, m) => sum + (m.stockQty || 0), 0)
    return { total: models.length, available, out, totalStock }
  }, [models])

  const filteredBrands = brands.filter((item) => !filterDomainId || item.domainId === filterDomainId)
  const filteredSeries = series.filter((item) => (!filterDomainId || item.domainId === filterDomainId) && (!filterBrandId || item.brandId === filterBrandId))

  const perPage = 12
  const totalModelPages = Math.max(1, Math.ceil(models.length / perPage))
  const pagedModels = useMemo(() => {
    const start = (modelPage - 1) * perPage
    return models.slice(start, start + perPage)
  }, [modelPage, models])

  const editorBrands = brands.filter((item) => !form.domainId || item.domainId === form.domainId)
  const editorSeries = series.filter((item) => (!form.domainId || item.domainId === form.domainId) && (!form.brandId || item.brandId === form.brandId))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion equipement</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Structure cible: Domain, Brand, Series, Model.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-200 bg-white" onClick={() => void bootstrap()}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualiser
          </Button>
          <Button className="bg-sky-600 text-white hover:bg-sky-700" onClick={() => openEditor(activeTab, 'create')}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Models" value={stats.total} tone="text-slate-900" />
        <StatCard title="Disponibles" value={stats.available} tone="text-emerald-600" />
        <StatCard title="Rupture" value={stats.out} tone="text-rose-600" />
        <StatCard title="Stock total" value={stats.totalStock} tone="text-sky-600" />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['model', 'Models'],
          ['domain', 'Domaines'],
          ['brand', 'Marques'],
          ['series', 'Series'],
        ] as const).map(([key, label]) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'outline'}
            onClick={() => setActiveTab(key)}
            className={activeTab === key ? 'bg-sky-600 text-white hover:bg-sky-700' : 'border-slate-200 bg-white'}
          >
            {label}
          </Button>
        ))}
      </div>

      {activeTab === 'model' ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Models</CardTitle>
            <CardDescription>Gestion des produits techniques sur le schema Renewtech.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-6">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setModelPage(1)
                  }}
                  placeholder="Rechercher"
                  className="h-10 border-slate-200 bg-slate-50 pl-9"
                />
              </div>
              <select
                value={filterDomainId}
                onChange={(e) => {
                  setFilterDomainId(e.target.value)
                  setFilterBrandId('')
                  setFilterSeriesId('')
                  setModelPage(1)
                }}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
              >
                <option value="">Tous les domaines</option>
                {domains.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              <select
                value={filterBrandId}
                onChange={(e) => {
                  setFilterBrandId(e.target.value)
                  setFilterSeriesId('')
                  setModelPage(1)
                }}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
              >
                <option value="">Toutes les marques</option>
                {filteredBrands.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <select
                value={filterSeriesId}
                onChange={(e) => {
                  setFilterSeriesId(e.target.value)
                  setModelPage(1)
                }}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
              >
                <option value="">Toutes les series</option>
                {filteredSeries.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setModelPage(1)
                }}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
              >
                <option value="">Tous les statuts</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                <option value="DISCONTINUED">DISCONTINUED</option>
              </select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Prix / Stock</TableHead>
                  <TableHead>Etat</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-600" />
                    </TableCell>
                  </TableRow>
                ) : models.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-slate-500">Aucun model.</TableCell>
                  </TableRow>
                ) : (
                  pagedModels.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-11 w-11 rounded-lg object-cover ring-1 ring-slate-200" />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.shortDescription || 'Aucune description'}</p>
                      </TableCell>
                      <TableCell className="text-slate-600">{item.reference}</TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-900">{item.brand?.name || 'Marque inconnue'}</div>
                        <div className="text-xs text-slate-500">{[item.domain?.label, item.series?.name].filter(Boolean).join(' / ') || 'Classification non definie'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold text-slate-900">{item.basePrice ? `${item.basePrice} DT` : 'N.C.'}</div>
                        <div className="text-xs text-slate-500">Stock: {item.stockQty}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={item.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : item.status === 'OUT_OF_STOCK' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon-sm" onClick={() => openEditor('model', 'edit', item as unknown as Record<string, unknown>)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon-sm" className="text-rose-600" onClick={() => void handleDelete('model', item.id)}>
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
                        setModelPage((prev) => Math.max(1, prev - 1))
                      }}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalModelPages }, (_, index) => index + 1)
                    .slice(Math.max(0, modelPage - 3), Math.min(totalModelPages, modelPage + 2))
                    .map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === modelPage}
                          onClick={(event) => {
                            event.preventDefault()
                            setModelPage(p)
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
                        setModelPage((prev) => Math.min(totalModelPages, prev + 1))
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      ) : activeTab === 'domain' ? (
        <SimpleEntityTable
          title="Domaines"
          description="Niveau principal du catalogue technique."
          rows={domains.map((item) => ({
            id: item.id,
            title: item.label,
            subtitle: `${item.code} | ${item.slug}`,
            meta: item.icon || 'Sans icone',
            status: item.isActive ? 'Actif' : 'Inactif',
            raw: item,
          }))}
          onAdd={() => openEditor('domain', 'create')}
          onEdit={(item) => openEditor('domain', 'edit', item as unknown as Record<string, unknown>)}
          onDelete={(id) => void handleDelete('domain', id)}
        />
      ) : activeTab === 'brand' ? (
        <SimpleEntityTable
          title="Marques"
          description="Chaque marque est rattachee a un domaine."
          rows={brands.map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: item.domain?.label || 'Sans domaine',
            meta: item.logo || item.description || 'Sans media',
            status: item.isActive === false ? 'Inactif' : 'Actif',
            raw: item,
          }))}
          onAdd={() => openEditor('brand', 'create')}
          onEdit={(item) => openEditor('brand', 'edit', item as unknown as Record<string, unknown>)}
          onDelete={(id) => void handleDelete('brand', id)}
        />
      ) : (
        <SimpleEntityTable
          title="Series"
          description="Chaque serie appartient a une marque et a un domaine."
          rows={series.map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: `${item.domain?.label || 'Sans domaine'} / ${item.brand?.name || 'Sans marque'}`,
            meta: item.description || 'Sans description',
            status: 'Actif',
            raw: item,
          }))}
          onAdd={() => openEditor('series', 'create')}
          onEdit={(item) => openEditor('series', 'edit', item as unknown as Record<string, unknown>)}
          onDelete={(id) => void handleDelete('series', id)}
        />
      )}

      <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === 'edit' ? 'Modifier' : 'Creer'}{' '}
              {editor?.type === 'domain' ? 'un domaine' : editor?.type === 'brand' ? 'une marque' : editor?.type === 'series' ? 'une serie' : 'un model'}
            </DialogTitle>
            <DialogDescription>Edition alignee sur les entites du schema Renewtech.</DialogDescription>
          </DialogHeader>

          {editor ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nom *</Label>
                  <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} placeholder="auto genere si vide" />
                </div>
              </div>

              {editor.type === 'domain' ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Code</Label>
                    <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.icon} onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Ordre</Label>
                    <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.sortOrder} onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))} />
                  </div>
                </div>
              ) : null}

              {editor.type === 'brand' ? (
                <>
                  <div>
                    <Label>Domaine *</Label>
                    <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.domainId} onChange={(e) => setForm((prev) => ({ ...prev, domainId: e.target.value }))}>
                      <option value="">Choisir</option>
                      {domains.map((item) => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Logo URL</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.logo} onChange={(e) => setForm((prev) => ({ ...prev, logo: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                    </div>
                  </div>
                </>
              ) : null}

              {editor.type === 'series' ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Domaine *</Label>
                      <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.domainId} onChange={(e) => setForm((prev) => ({ ...prev, domainId: e.target.value, brandId: '' }))}>
                        <option value="">Choisir</option>
                        {domains.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Marque *</Label>
                      <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.brandId} onChange={(e) => setForm((prev) => ({ ...prev, brandId: e.target.value }))}>
                        <option value="">Choisir</option>
                        {editorBrands.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                  </div>
                </>
              ) : null}

              {editor.type === 'model' ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Domaine *</Label>
                      <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.domainId} onChange={(e) => setForm((prev) => ({ ...prev, domainId: e.target.value, brandId: '', seriesId: '' }))}>
                        <option value="">Choisir</option>
                        {domains.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Marque *</Label>
                      <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.brandId} onChange={(e) => setForm((prev) => ({ ...prev, brandId: e.target.value, seriesId: '' }))}>
                        <option value="">Choisir</option>
                        {editorBrands.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Serie *</Label>
                      <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.seriesId} onChange={(e) => setForm((prev) => ({ ...prev, seriesId: e.target.value }))}>
                        <option value="">Choisir</option>
                        {editorSeries.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Reference *</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.reference} onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.condition} onChange={(e) => setForm((prev) => ({ ...prev, condition: e.target.value }))} placeholder="NEW / REFURBISHED" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Prix de base</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.basePrice} onChange={(e) => setForm((prev) => ({ ...prev, basePrice: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Stock</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.stockQty} onChange={(e) => setForm((prev) => ({ ...prev, stockQty: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as EquipmentModelItem['status'] }))}>
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                        <option value="DISCONTINUED">DISCONTINUED</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Description courte</Label>
                    <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.shortDescription} onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Description longue</Label>
                    <textarea className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={form.longDescription} onChange={(e) => setForm((prev) => ({ ...prev, longDescription: e.target.value }))} />
                  </div>

                  <div>
                    <Label>Photo du produit</Label>
                    <div className="mt-2 space-y-3">
                      {form.image ? (
                        <div className="relative h-32 w-32">
                          <img
                            src={form.image}
                            alt="Product"
                            className="h-32 w-32 rounded-lg object-cover ring-1 ring-slate-200"
                          />
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            className="absolute top-1 right-1 h-7 w-7 bg-white p-0"
                            onClick={() => setForm((prev) => ({ ...prev, image: '' }))}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
                          <ImageIcon className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => photoInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choisir une photo
                      </Button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0]
                          if (file) {
                            toast.promise(
                              handlePhotoUpload(file),
                              {
                                loading: 'Upload en cours...',
                                success: 'Photo uploadee',
                                error: 'Erreur lors de l\'upload',
                              }
                            )
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>Annuler</Button>
            <Button className="bg-sky-600 text-white hover:bg-sky-700" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ title, value, tone }: { title: string; value: number; tone: string }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="py-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function SimpleEntityTable({
  title,
  description,
  rows,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string
  description: string
  rows: Array<{
    id: string
    title: string
    subtitle: string
    meta: string
    status: string
    raw: unknown
  }>
  onAdd: () => void
  onEdit: (item: unknown) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button onClick={onAdd} className="bg-sky-600 text-white hover:bg-sky-700">
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Media / note</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-slate-500">Aucun element.</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-slate-900">{row.title}</p>
                      <p className="text-xs text-slate-500">{row.subtitle}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{row.meta}</TableCell>
                  <TableCell>
                    <Badge className={row.status === 'Actif' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100'}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon-sm" onClick={() => onEdit(row.raw)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon-sm" className="text-rose-600" onClick={() => onDelete(row.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
