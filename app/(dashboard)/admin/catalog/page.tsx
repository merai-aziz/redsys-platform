'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ModelSummary = {
  id: string
  name: string
  reference: string
  slug: string
  brand?: { name: string } | null
  domain?: { label: string } | null
}

type FilterGroup = {
  id: string
  name: string
  slug: string
  displayOrder: number
  filters: FilterItem[]
}

type FilterItem = {
  id: string
  label: string
  fieldKey: string
  fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN'
  unit?: string | null
  displayOrder: number
  options: FilterOption[]
}

type FilterOption = {
  id: string
  value: string
  label: string
  displayOrder: number
}

type ProductAttribute = {
  id: string
  filterId: string
  fieldKey: string
  label: string
  fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN'
  unit?: string | null
  value: string
}

type ProductItem = {
  id: string
  sku: string
  name: string
  price: number
  condition: 'A' | 'B' | 'C'
  stock: number
  isActive: boolean
  attributes: ProductAttribute[]
}

type EditorKind = 'group' | 'filter' | 'option' | 'product'
type EditorMode = 'create' | 'edit'

type EditorState = {
  kind: EditorKind
  mode: EditorMode
  id?: string
  parentId?: string
}

type EditorForm = {
  name: string
  slug: string
  displayOrder: string
  filterGroupId: string
  filterId: string
  label: string
  fieldKey: string
  fieldType: FilterItem['fieldType']
  unit: string
  value: string
  sku: string
  price: string
  condition: ProductItem['condition']
  stock: string
  isActive: boolean
  attributes: Record<string, string>
}

type EditorItem = {
  id?: string
  name?: string
  slug?: string
  displayOrder?: number
  filterGroupId?: string
  label?: string
  fieldKey?: string
  fieldType?: FilterItem['fieldType']
  unit?: string | null
  filterId?: string
  value?: string
  sku?: string
  price?: number
  condition?: ProductItem['condition']
  stock?: number
  isActive?: boolean
  attributes?: ProductAttribute[]
}

const emptyForm: EditorForm = {
  name: '',
  slug: '',
  displayOrder: '0',
  filterGroupId: '',
  filterId: '',
  label: '',
  fieldKey: '',
  fieldType: 'TEXT',
  unit: '',
  value: '',
  sku: '',
  price: '',
  condition: 'A',
  stock: '0',
  isActive: true,
  attributes: {},
}

export default function AdminCatalogPage() {
  const [models, setModels] = useState<ModelSummary[]>([])
  const [search, setSearch] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [groups, setGroups] = useState<FilterGroup[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [form, setForm] = useState<EditorForm>(emptyForm)

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

  const loadModels = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', '50')

      const data = await requestJson<{ models: ModelSummary[] }>(`/api/admin/model?${params.toString()}`)
      setModels(data.models)
      setSelectedModelId((current) => current || data.models[0]?.id || '')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement des modeles impossible')
    }
  }, [search])

  const loadCatalog = useCallback(async (modelId: string) => {
    if (!modelId) {
      setGroups([])
      setProducts([])
      return
    }

    setLoadingCatalog(true)
    try {
      const data = await requestJson<{ groups: FilterGroup[]; products: ProductItem[] }>(`/api/admin/model/${modelId}/filters`)
      setGroups(data.groups)
      setProducts(data.products)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement du catalogue impossible')
    } finally {
      setLoadingCatalog(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadModels()
      if (selectedModelId) {
        await loadCatalog(selectedModelId)
      }
    } finally {
      setRefreshing(false)
    }
  }, [loadModels, loadCatalog, selectedModelId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadModels()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [loadModels])

  useEffect(() => {
    if (!selectedModelId) return
    void loadCatalog(selectedModelId)
  }, [selectedModelId, loadCatalog])

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) || null,
    [models, selectedModelId],
  )

  const allFilters = useMemo(() => groups.flatMap((group) => group.filters), [groups])

  const stats = useMemo(() => {
    const totalFilters = allFilters.length
    const totalOptions = allFilters.reduce((sum, filter) => sum + filter.options.length, 0)
    const activeProducts = products.filter((product) => product.isActive).length
    return { groups: groups.length, filters: totalFilters, options: totalOptions, products: products.length, activeProducts }
  }, [allFilters, groups.length, products])

  function openEditor(kind: EditorKind, mode: EditorMode, item?: EditorItem, parentId?: string) {
    setEditor({ kind, mode, id: item?.id, parentId })

    if (kind === 'group') {
      setForm({
        ...emptyForm,
        name: item?.name || '',
        slug: item?.slug || '',
        displayOrder: String(item?.displayOrder ?? 0),
      })
      return
    }

    if (kind === 'filter') {
      setForm({
        ...emptyForm,
        filterGroupId: String(item?.filterGroupId ?? parentId ?? groups[0]?.id ?? ''),
        label: item?.label || '',
        fieldKey: item?.fieldKey || '',
        fieldType: (item?.fieldType as FilterItem['fieldType']) || 'TEXT',
        unit: item?.unit || '',
        displayOrder: String(item?.displayOrder ?? 0),
      })
      return
    }

    if (kind === 'option') {
      setForm({
        ...emptyForm,
        filterId: String(item?.filterId ?? parentId ?? allFilters[0]?.id ?? ''),
        label: item?.label || '',
        value: item?.value || '',
        displayOrder: String(item?.displayOrder ?? 0),
      })
      return
    }

    const attributes: Record<string, string> = {}
    for (const filter of allFilters) {
      const itemAttributes = (item?.attributes as ProductAttribute[] | undefined) || []
      attributes[filter.fieldKey] = itemAttributes.find((attribute) => attribute.fieldKey === filter.fieldKey)?.value || ''
    }

    setForm({
      ...emptyForm,
        sku: item?.sku || '',
        name: item?.name || '',
      price: item?.price ? String(item.price) : '',
        condition: item?.condition || 'A',
      stock: String(item?.stock ?? 0),
        isActive: item?.isActive ?? true,
      attributes,
    })
  }

  function closeEditor() {
    setEditor(null)
    setForm(emptyForm)
  }

  async function handleDelete(kind: EditorKind, id: string) {
    if (!window.confirm('Confirmer la suppression ?')) return
    if (!selectedModelId) return

    try {
      await requestJson(`/api/admin/model/${selectedModelId}/filters`, {
        method: 'DELETE',
        body: JSON.stringify({ kind, id }),
      })
      toast.success('Suppression effectuee')
      await loadCatalog(selectedModelId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible')
    }
  }

  async function handleSave() {
    if (!editor || !selectedModelId) return

    if (editor.kind === 'group' && !form.name.trim()) {
      toast.error('Le nom du groupe est requis')
      return
    }

    if (editor.kind === 'filter' && (!form.filterGroupId || !form.label.trim() || !form.fieldKey.trim())) {
      toast.error('Groupe, libelle et cle filtre sont requis')
      return
    }

    if (editor.kind === 'option' && (!form.filterId || !form.label.trim() || !form.value.trim())) {
      toast.error('Filtre, libelle et valeur sont requis')
      return
    }

    if (editor.kind === 'product' && (!form.sku.trim() || !form.name.trim())) {
      toast.error('SKU et nom produit sont requis')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = { kind: editor.kind }

      if (editor.kind === 'group') {
        payload.name = form.name.trim()
        payload.slug = form.slug.trim() || undefined
        payload.displayOrder = Number(form.displayOrder) || 0
      }

      if (editor.kind === 'filter') {
        payload.filterGroupId = form.filterGroupId
        payload.label = form.label.trim()
        payload.fieldKey = form.fieldKey.trim()
        payload.fieldType = form.fieldType
        payload.unit = form.unit.trim() || null
        payload.displayOrder = Number(form.displayOrder) || 0
      }

      if (editor.kind === 'option') {
        payload.filterId = form.filterId
        payload.label = form.label.trim()
        payload.value = form.value.trim()
        payload.displayOrder = Number(form.displayOrder) || 0
      }

      if (editor.kind === 'product') {
        payload.sku = form.sku.trim()
        payload.name = form.name.trim()
        payload.price = form.price ? Number(form.price) : 0
        payload.condition = form.condition
        payload.stock = Number(form.stock) || 0
        payload.isActive = form.isActive
        payload.attributes = Object.entries(form.attributes)
          .filter(([, value]) => value.trim())
          .map(([fieldKey, value]) => ({ fieldKey, value: value.trim() }))
      }

      await requestJson(`/api/admin/model/${selectedModelId}/filters`, {
        method: editor.mode === 'create' ? 'POST' : 'PUT',
        body: JSON.stringify(editor.mode === 'create' ? payload : { ...payload, id: editor.id }),
      })

      toast.success(editor.mode === 'create' ? 'Element cree' : 'Element mis a jour')
      closeEditor()
      await loadCatalog(selectedModelId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation impossible')
    } finally {
      setSaving(false)
    }
  }

  const groupOptions = groups.map((group) => ({ id: group.id, label: group.name }))
  const filterOptions = allFilters.map((filter) => ({ id: filter.id, label: `${filter.label} (${filter.fieldKey})` }))

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Catalogue & filtres</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Adapter les filtres par modele et gerer les produits</h1>
            <p className="mt-2 text-sm text-slate-500">
              Choisissez un modele, creez les groupes de filtres, ajoutez les valeurs disponibles, puis rattachez des produits avec leurs attributs.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-slate-200 bg-white" onClick={() => void refreshAll()}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualiser
            </Button>
            <Button className="bg-sky-600 text-white hover:bg-sky-700" onClick={() => openEditor('group', 'create')} disabled={!selectedModelId}>
              <Plus className="h-4 w-4" />
              Ajouter un groupe
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Groupes" value={stats.groups} />
        <MetricCard label="Filtres" value={stats.filters} />
        <MetricCard label="Options" value={stats.options} />
        <MetricCard label="Produits actifs" value={stats.activeProducts} />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un modele"
                className="h-11 border-slate-200 bg-slate-50 pl-9"
              />
            </div>
            <select
              value={selectedModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value="">Choisir un modele</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.reference}
                </option>
              ))}
            </select>
          </div>

          {selectedModel ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Modele selectionne</p>
                <p className="text-base font-semibold text-slate-900">{selectedModel.name}</p>
              </div>
              <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">{selectedModel.reference}</Badge>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{selectedModel.brand?.name || 'Marque'}</Badge>
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{selectedModel.domain?.label || 'Domaine'}</Badge>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" className="border-slate-200 bg-white" onClick={() => openEditor('filter', 'create')}>
                  <Plus className="h-4 w-4" />
                  Ajouter un filtre
                </Button>
                <Button variant="outline" className="border-slate-200 bg-white" onClick={() => openEditor('product', 'create')}>
                  <Plus className="h-4 w-4" />
                  Ajouter un produit
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!selectedModelId ? (
        <EmptyState />
      ) : loadingCatalog ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-12 text-center text-slate-500">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-600" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Groupes de filtres</CardTitle>
                <CardDescription>Organisez les filtres du modele et leurs options.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {groups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                  Aucun groupe pour ce modele.
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{group.name}</p>
                        <p className="text-xs text-slate-500">{group.slug} · ordre {group.displayOrder}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon-sm" onClick={() => openEditor('filter', 'create', undefined, group.id)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon-sm" onClick={() => openEditor('group', 'edit', group)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon-sm" className="text-rose-600" onClick={() => void handleDelete('group', group.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {group.filters.map((filter) => (
                        <div key={filter.id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">{filter.label}</p>
                                <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">{filter.fieldType}</Badge>
                                <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">{filter.fieldKey}</Badge>
                              </div>
                              <p className="text-xs text-slate-500">{filter.unit || 'Sans unite'} · ordre {filter.displayOrder}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="icon-sm" onClick={() => openEditor('option', 'create', undefined, filter.id)}>
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="outline" size="icon-sm" onClick={() => openEditor('filter', 'edit', filter)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="outline" size="icon-sm" className="text-rose-600" onClick={() => void handleDelete('filter', filter.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {filter.options.length === 0 ? (
                              <span className="text-xs text-slate-500">Aucune option.</span>
                            ) : (
                              filter.options.map((option) => (
                                <div key={option.id} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                                  <span>{option.label}</span>
                                  <span className="text-slate-400">({option.value})</span>
                                  <button type="button" onClick={() => void handleDelete('option', option.id)} className="text-rose-500">
                                    ×
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Produits du modele</CardTitle>
                <CardDescription>Chaque produit peut recevoir des attributs reliés aux filtres du modele.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Prix / Stock</TableHead>
                    <TableHead>Attributes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-slate-500">
                        Aucun produit pour ce modele.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.sku}</p>
                            <Badge className={product.isActive ? 'mt-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'mt-2 bg-rose-100 text-rose-700 hover:bg-rose-100'}>
                              {product.condition}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold text-slate-900">{product.price} DT</div>
                          <div className="text-xs text-slate-500">Stock: {product.stock}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {product.attributes.length === 0 ? (
                              <span className="text-xs text-slate-500">Aucun attribut.</span>
                            ) : (
                              product.attributes.map((attribute) => (
                                <Badge key={attribute.id} className="bg-slate-100 text-slate-600 hover:bg-slate-100">
                                  {attribute.fieldKey}: {attribute.value}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon-sm" onClick={() => openEditor('product', 'edit', product)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="icon-sm" className="text-rose-600" onClick={() => void handleDelete('product', product.id)}>
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
        </div>
      )}

      <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === 'edit' ? 'Modifier' : 'Creer'}{' '}
              {editor?.kind === 'group' ? 'un groupe' : editor?.kind === 'filter' ? 'un filtre' : editor?.kind === 'option' ? 'une option' : 'un produit'}
            </DialogTitle>
            <DialogDescription>Gestion du catalogue technique du modele selectionne.</DialogDescription>
          </DialogHeader>

          {editor ? (
            <div className="space-y-4">
              {(editor.kind === 'group' || editor.kind === 'filter' || editor.kind === 'option' || editor.kind === 'product') && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nom / Label *</Label>
                    <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={editor.kind === 'group' ? form.name : form.label || form.name} onChange={(event) => editor.kind === 'group'
                      ? setForm((prev) => ({ ...prev, name: event.target.value }))
                      : setForm((prev) => ({ ...prev, label: event.target.value }))} />
                  </div>
                  <div>
                    <Label>Slug / Cle / Valeur</Label>
                    <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={editor.kind === 'group' ? form.slug : editor.kind === 'filter' ? form.fieldKey : form.value} onChange={(event) => {
                      if (editor.kind === 'group') setForm((prev) => ({ ...prev, slug: event.target.value }))
                      else if (editor.kind === 'filter') setForm((prev) => ({ ...prev, fieldKey: event.target.value }))
                      else setForm((prev) => ({ ...prev, value: event.target.value }))
                    }} />
                  </div>
                </div>
              )}

              {editor.kind === 'group' ? (
                <div>
                  <Label>Ordre d&apos;affichage</Label>
                  <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.displayOrder} onChange={(event) => setForm((prev) => ({ ...prev, displayOrder: event.target.value }))} />
                </div>
              ) : null}

              {editor.kind === 'filter' ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Groupe *</Label>
                      <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.filterGroupId} onChange={(event) => setForm((prev) => ({ ...prev, filterGroupId: event.target.value }))}>
                        <option value="">Choisir</option>
                        {groupOptions.map((group) => (
                          <option key={group.id} value={group.id}>{group.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.fieldType} onChange={(event) => setForm((prev) => ({ ...prev, fieldType: event.target.value as FilterItem['fieldType'] }))}>
                        <option value="TEXT">TEXT</option>
                        <option value="NUMBER">NUMBER</option>
                        <option value="SELECT">SELECT</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Unite</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} />
                    </div>
                    <div>
                      <Label>Ordre d&apos;affichage</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.displayOrder} onChange={(event) => setForm((prev) => ({ ...prev, displayOrder: event.target.value }))} />
                    </div>
                  </div>
                </>
              ) : null}

              {editor.kind === 'option' ? (
                <>
                  <div>
                    <Label>Filtre *</Label>
                    <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.filterId} onChange={(event) => setForm((prev) => ({ ...prev, filterId: event.target.value }))}>
                      <option value="">Choisir</option>
                      {filterOptions.map((filter) => (
                        <option key={filter.id} value={filter.id}>{filter.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Valeur *</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.value} onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))} />
                    </div>
                    <div>
                      <Label>Ordre</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.displayOrder} onChange={(event) => setForm((prev) => ({ ...prev, displayOrder: event.target.value }))} />
                    </div>
                  </div>
                </>
              ) : null}

              {editor.kind === 'product' ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>SKU *</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.sku} onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))} />
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={form.condition} onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value as ProductItem['condition'] }))}>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Prix</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
                    </div>
                    <div>
                      <Label>Stock</Label>
                      <Input className="mt-2 h-10 border-slate-200 bg-slate-50" value={form.stock} onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))} />
                    </div>
                    <div>
                      <Label>Actif</Label>
                      <select className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" value={String(form.isActive)} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))}>
                        <option value="true">Oui</option>
                        <option value="false">Non</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Attributs du produit</Label>
                    <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      {allFilters.length === 0 ? (
                        <p className="text-sm text-slate-500">Ajoutez d&apos;abord des filtres au modele.</p>
                      ) : (
                        allFilters.map((filter) => (
                          <div key={filter.id} className="grid gap-2 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                            <label className="text-sm font-medium text-slate-700">{filter.label} <span className="text-slate-400">({filter.fieldKey})</span></label>
                            <Input
                              className="h-10 border-slate-200 bg-white"
                              value={form.attributes[filter.fieldKey] || ''}
                              onChange={(event) => setForm((prev) => ({ ...prev, attributes: { ...prev.attributes, [filter.fieldKey]: event.target.value } }))}
                              placeholder={filter.unit ? `${filter.unit}` : 'Valeur'}
                            />
                          </div>
                        ))
                      )}
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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed border-slate-300 bg-white/70 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-500">
        <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">
          <ArrowRight className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">Selectionnez un modele</p>
          <p className="text-sm">Vous pourrez ensuite creer les filtres et les produits associes.</p>
        </div>
      </CardContent>
    </Card>
  )
}
