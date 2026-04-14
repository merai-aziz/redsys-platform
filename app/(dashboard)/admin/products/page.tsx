'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ProductRow = {
  id: string
  equipmentModelId: string
  sku: string
  name: string
  price: number
  condition: 'A' | 'B' | 'C'
  stock: number
  isActive: boolean
  equipmentModel: {
    id: string
    name: string
    domain: { label: string }
    brand: { name: string }
  }
}

type ProductListResponse = {
  products: ProductRow[]
  total: number
  page: number
  totalPages: number
}

type ModelSummary = {
  id: string
  name: string
  reference: string
  brandId: string
  domainId: string
  brand?: { id?: string; name: string } | null
  domain?: { id?: string; label: string } | null
}

type ModelFilter = {
  id: string
  label: string
  fieldKey: string
  fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN'
  options: Array<{ id: string; value: string; label: string }>
}

type ModelFiltersResponse = {
  groups: Array<{
    id: string
    name: string
    filters: ModelFilter[]
  }>
}

type FormState = {
  modelId: string
  sku: string
  name: string
  price: string
  condition: 'A' | 'B' | 'C'
  stock: string
  isActive: boolean
  attributes: Record<string, string>
}

const formSchema = z.object({
  modelId: z.string().min(1, 'Modele requis'),
  sku: z.string().min(1, 'SKU requis'),
  name: z.string().min(1, 'Nom requis'),
  price: z.coerce.number().min(0, 'Prix invalide'),
  condition: z.enum(['A', 'B', 'C']),
  stock: z.coerce.number().int().min(0, 'Stock invalide'),
})

const emptyForm: FormState = {
  modelId: '',
  sku: '',
  name: '',
  price: '',
  condition: 'A',
  stock: '0',
  isActive: true,
  attributes: {},
}

function conditionLabel(value: 'A' | 'B' | 'C') {
  if (value === 'A') return 'RECONDITIONED'
  if (value === 'B') return 'USED'
  return 'NEW'
}

function conditionBadgeClass(value: 'A' | 'B' | 'C') {
  if (value === 'A') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
  if (value === 'B') return 'bg-amber-100 text-amber-700 hover:bg-amber-100'
  return 'bg-sky-100 text-sky-700 hover:bg-sky-100'
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [models, setModels] = useState<ModelSummary[]>([])
  const [modelSearch, setModelSearch] = useState('')
  const [modelFilters, setModelFilters] = useState<ModelFilter[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [step, setStep] = useState(1)
  const [editProductId, setEditProductId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const domains = useMemo(() => {
    const map = new Map<string, string>()
    for (const model of models) {
      if (!model.domainId) continue
      map.set(model.domainId, model.domain?.label || 'Domaine')
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [models])

  const brands = useMemo(() => {
    const filtered = selectedDomain ? models.filter((model) => model.domainId === selectedDomain) : models
    const map = new Map<string, string>()
    for (const model of filtered) {
      if (!model.brandId) continue
      map.set(model.brandId, model.brand?.name || 'Marque')
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [models, selectedDomain])

  const visibleProducts = useMemo(() => {
    if (!inStockOnly) return products
    return products.filter((product) => product.stock > 0)
  }, [inStockOnly, products])

  const filteredModelOptions = useMemo(() => {
    const q = modelSearch.trim().toLowerCase()
    return models
      .filter((model) => {
        if (!q) return true
        return `${model.name} ${model.reference}`.toLowerCase().includes(q)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [modelSearch, models])

  const selectedModel = useMemo(() => models.find((model) => model.id === form.modelId) ?? null, [form.modelId, models])

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
    const data = await requestJson<{ models: ModelSummary[] }>('/api/admin/model')
    setModels(data.models || [])
  }, [requestJson])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      })

      if (selectedDomain) params.set('domain', selectedDomain)
      if (selectedBrand) params.set('brand', selectedBrand)
      if (selectedCondition) params.set('condition', selectedCondition)
      if (search.trim()) params.set('search', search.trim())

      const data = await requestJson<ProductListResponse>(`/api/admin/products?${params.toString()}`)
      setProducts(data.products || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [page, requestJson, search, selectedBrand, selectedCondition, selectedDomain])

  useEffect(() => {
    void loadModels().catch(() => {
      toast.error('Chargement des modeles impossible')
    })
  }, [loadModels])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  useEffect(() => {
    if (!form.modelId) {
      setModelFilters([])
      return
    }

    void requestJson<ModelFiltersResponse>(`/api/admin/model/${form.modelId}/filters`)
      .then((data) => {
        const all = data.groups.flatMap((group) => group.filters)
        setModelFilters(all)

        setForm((prev) => {
          const nextAttributes: Record<string, string> = {}
          for (const filter of all) {
            nextAttributes[filter.fieldKey] = prev.attributes[filter.fieldKey] ?? ''
          }
          return { ...prev, attributes: nextAttributes }
        })
      })
      .catch(() => {
        toast.error('Chargement des filtres du modele impossible')
      })
  }, [form.modelId, requestJson])

  function resetFilters() {
    setSelectedDomain('')
    setSelectedBrand('')
    setSelectedCondition('')
    setInStockOnly(false)
    setSearch('')
    setPage(1)
  }

  function openCreateModal() {
    setMode('create')
    setEditProductId(null)
    setForm(emptyForm)
    setModelSearch('')
    setStep(1)
    setModalOpen(true)
  }

  function openEditModal(product: ProductRow) {
    setMode('edit')
    setEditProductId(product.id)
    setForm({
      modelId: product.equipmentModelId,
      sku: product.sku,
      name: product.name,
      price: String(product.price),
      condition: product.condition,
      stock: String(product.stock),
      isActive: product.isActive,
      attributes: {},
    })
    setModelSearch('')
    setStep(1)
    setModalOpen(true)
  }

  async function toggleActive(product: ProductRow) {
    try {
      await requestJson(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      setProducts((prev) => prev.map((item) => (item.id === product.id ? { ...item, isActive: !item.isActive } : item)))
      toast.success('Statut mis a jour')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise a jour impossible')
    }
  }

  async function submitForm() {
    const parsed = formSchema.safeParse({
      modelId: form.modelId,
      sku: form.sku,
      name: form.name,
      price: form.price,
      condition: form.condition,
      stock: form.stock,
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Validation invalide')
      return
    }

    setSaving(true)
    try {
      if (mode === 'create') {
        await requestJson(`/api/admin/model/${form.modelId}/filters`, {
          method: 'POST',
          body: JSON.stringify({
            kind: 'product',
            sku: form.sku,
            name: form.name,
            price: Number(form.price),
            condition: form.condition,
            stock: Number(form.stock),
            isActive: form.isActive,
            attributes: Object.entries(form.attributes)
              .filter(([, value]) => value.trim().length > 0)
              .map(([fieldKey, value]) => ({ fieldKey, value })),
          }),
        })
      } else if (editProductId) {
        await requestJson(`/api/admin/products/${editProductId}`, {
          method: 'PUT',
          body: JSON.stringify({
            price: Number(form.price),
            stock: Number(form.stock),
            condition: form.condition,
            isActive: form.isActive,
          }),
        })
      }

      toast.success(mode === 'create' ? 'Produit cree' : 'Produit mis a jour')
      setModalOpen(false)
      await loadProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation impossible')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTargetId) return

    setDeleting(true)
    try {
      await requestJson(`/api/admin/products/${deleteTargetId}`, { method: 'DELETE' })
      toast.success('Produit supprime')
      setDeleteTargetId(null)
      await loadProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produits</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion des produits catalogues par modele et attributs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{total} total</Badge>
          <Button onClick={openCreateModal} className="bg-sky-600 text-white hover:bg-sky-700">
            <Plus className="h-4 w-4" />
            Ajouter un produit
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-6">
          <select
            value={selectedDomain}
            onChange={(event) => {
              setSelectedDomain(event.target.value)
              setSelectedBrand('')
              setPage(1)
            }}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="">Tous les domaines</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>{domain.label}</option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(event) => {
              setSelectedBrand(event.target.value)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="">Toutes les marques</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>

          <select
            value={selectedCondition}
            onChange={(event) => {
              setSelectedCondition(event.target.value)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="">Toutes conditions</option>
            <option value="A">RECONDITIONED</option>
            <option value="B">USED</option>
            <option value="C">NEW</option>
          </select>

          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
            />
            En stock uniquement
          </label>

          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Rechercher SKU ou nom"
              className="h-10 bg-slate-50 pl-9"
            />
          </div>

          <Button variant="outline" onClick={resetFilters} className="lg:col-span-1">
            Reset filtres
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Liste produits</CardTitle>
          <CardDescription>Actions rapides sur l activite, edition et suppression.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Modele</TableHead>
                <TableHead>Domaine</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-600" />
                  </TableCell>
                </TableRow>
              ) : visibleProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-slate-500">Aucun produit.</TableCell>
                </TableRow>
              ) : (
                visibleProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium text-slate-900">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.equipmentModel.name}</TableCell>
                    <TableCell>{product.equipmentModel.domain.label}</TableCell>
                    <TableCell>{Number(product.price).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell>
                      <Badge className={conditionBadgeClass(product.condition)}>{conditionLabel(product.condition)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={product.stock > 0 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100'}>
                        {product.stock > 0 ? `${product.stock}` : '0'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={product.isActive}
                          onChange={() => void toggleActive(product)}
                        />
                        {product.isActive ? 'Oui' : 'Non'}
                      </label>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon-sm" onClick={() => openEditModal(product)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon-sm" className="text-rose-600" onClick={() => setDeleteTargetId(product.id)}>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Ajouter un produit' : 'Editer un produit'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-slate-500">
              <span className={step === 1 ? 'font-bold text-sky-700' : ''}>Etape 1</span>
              <span>→</span>
              <span className={step === 2 ? 'font-bold text-sky-700' : ''}>Etape 2</span>
              <span>→</span>
              <span className={step === 3 ? 'font-bold text-sky-700' : ''}>Etape 3</span>
            </div>

            {step === 1 ? (
              <div className="space-y-3">
                <Label>Selectionner le modele</Label>
                <Input
                  value={modelSearch}
                  onChange={(event) => setModelSearch(event.target.value)}
                  placeholder="Rechercher un modele..."
                  className="h-10"
                />
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {filteredModelOptions.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, modelId: model.id }))}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                        form.modelId === model.id ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-semibold">{model.name}</p>
                      <p className="text-xs text-slate-500">{model.reference}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={form.sku}
                    onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                    className="mt-2 h-10"
                    disabled={mode === 'edit'}
                  />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-2 h-10"
                    disabled={mode === 'edit'}
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
                  <Label>Condition</Label>
                  <select
                    value={form.condition}
                    onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value as 'A' | 'B' | 'C' }))}
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="A">RECONDITIONED</option>
                    <option value="B">USED</option>
                    <option value="C">NEW</option>
                  </select>
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
                    className="mt-2 h-10"
                  />
                </div>
                <div>
                  <Label>Actif</Label>
                  <label className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    />
                    {form.isActive ? 'Oui' : 'Non'}
                  </label>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  {mode === 'edit'
                    ? 'Edition des attributs disponible dans Admin Catalog. Ici, les attributs sont en lecture.'
                    : 'Renseigner les attributs du produit selon les filtres du modele selectionne.'}
                </p>

                <Separator />

                {modelFilters.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucun filtre disponible pour ce modele.</p>
                ) : (
                  <div className="grid gap-3">
                    {modelFilters.map((filter) => (
                      <div key={filter.id} className="grid gap-2 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                        <Label>{filter.label}</Label>
                        {filter.fieldType === 'SELECT' && filter.options.length > 0 ? (
                          <select
                            value={form.attributes[filter.fieldKey] ?? ''}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                attributes: { ...prev.attributes, [filter.fieldKey]: event.target.value },
                              }))
                            }
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                            disabled={mode === 'edit'}
                          >
                            <option value="">Choisir</option>
                            {filter.options.map((option) => (
                              <option key={option.id} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={form.attributes[filter.fieldKey] ?? ''}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                attributes: { ...prev.attributes, [filter.fieldKey]: event.target.value },
                              }))
                            }
                            className="h-10"
                            disabled={mode === 'edit'}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" disabled={step === 1} onClick={() => setStep((prev) => Math.max(1, prev - 1))}>
                Retour
              </Button>
              {step < 3 ? (
                <Button
                  onClick={() => {
                    if (step === 1 && !form.modelId) {
                      toast.error('Selectionnez un modele')
                      return
                    }
                    setStep((prev) => Math.min(3, prev + 1))
                  }}
                  className="bg-sky-600 text-white hover:bg-sky-700"
                >
                  Suivant
                </Button>
              ) : (
                <Button onClick={() => void submitForm()} disabled={saving} className="bg-sky-600 text-white hover:bg-sky-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {mode === 'create' ? 'Creer' : 'Sauvegarder'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Cette action supprimera le produit et ses attributs associes.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>Annuler</Button>
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
