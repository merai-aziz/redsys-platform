'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Brand { id: number; name: string }
interface Category { id: number; name: string }
interface Family { id: number; name: string; category_id: number }

interface Filter {
  id: number
  name: string
}

interface SparepartDomainFilterDefinition {
  domainCode: string
  filters: Array<{ id: number; name: string }>
}

interface Product {
  id: number
  name: string
  base_price: string
  type: 'STANDARD' | 'CONFIGURABLE'
  image_url?: string | null
  description?: string | null
  stock_qty: number
  in_stock: boolean
  poe: boolean
  brand: Brand
  category: Category
  family: Family
  specs: Array<{ id: number; spec_key: string; spec_value: string }>
  configuration_options: Array<{
    id: number
    name: string
    values: Array<{ id: number; value: string; price: string; quantity: number }>
  }>
  compatibilities_as_part?: Array<{
    target_product_id: number
  }>
  sparepart_filters_as_part?: Array<{
    target_product_id: number
    filter_id: number
  }>
}

const emptyForm = {
  name: '',
  base_price: '0',
  type: 'STANDARD' as 'STANDARD' | 'CONFIGURABLE',
  image_url: '',
  description: '',
  stock_qty: '0',
  in_stock: false,
  poe: false,
  brand_id: '',
  category_id: '',
  family_id: '',
}

const SPAREPART_DOMAIN_OPTIONS = [
  { code: 'SERVER', label: 'Serveur' },
  { code: 'STORAGE', label: 'Storage' },
  { code: 'NETWORK', label: 'Reseau' },
] as const

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [filters, setFilters] = useState<Filter[]>([])

  const [form, setForm] = useState(emptyForm)
  const [specRows, setSpecRows] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [compatibleModelIds, setCompatibleModelIds] = useState<number[]>([])
  const [compatibleSearch, setCompatibleSearch] = useState('')
  const [sparepartTargetId, setSparepartTargetId] = useState<number | null>(null)
  const [sparepartFilterAssignments, setSparepartFilterAssignments] = useState<Record<number, number[]>>({})

  const [optionDialogProduct, setOptionDialogProduct] = useState<Product | null>(null)
  const [optionName, setOptionName] = useState('')
  const [optionValues, setOptionValues] = useState<Array<{ value: string; price: string; quantity: string }>>([{ value: '', price: '0', quantity: '1' }])
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null)

  async function loadAll() {
    async function safeJson(response: Response) {
      const text = await response.text()
      if (!text) return null
      try {
        return JSON.parse(text) as Record<string, unknown>
      } catch {
        return null
      }
    }

    const [productsRes, brandsRes, categoriesRes, familiesRes, filtersRes] = await Promise.all([
      fetch('/api/admin/products'),
      fetch('/api/admin/brands'),
      fetch('/api/admin/categories'),
      fetch('/api/admin/families'),
      fetch('/api/admin/filters'),
    ])

    const [productsJson, brandsJson, categoriesJson, familiesJson, filtersJson] = await Promise.all([
      safeJson(productsRes),
      safeJson(brandsRes),
      safeJson(categoriesRes),
      safeJson(familiesRes),
      safeJson(filtersRes),
    ])

    if (!productsRes.ok || !brandsRes.ok || !categoriesRes.ok || !familiesRes.ok) {
      const errorMessage = [
        (productsJson as { error?: string } | null)?.error,
        (brandsJson as { error?: string } | null)?.error,
        (categoriesJson as { error?: string } | null)?.error,
        (familiesJson as { error?: string } | null)?.error,
        (filtersJson as { error?: string } | null)?.error,
      ].find(Boolean)

      toast.error(errorMessage || 'Chargement des donnees impossible')
      return
    }

    setProducts((productsJson as { products?: Product[] } | null)?.products || [])
    setBrands((brandsJson as { brands?: Brand[] } | null)?.brands || [])
    setCategories((categoriesJson as { categories?: Category[] } | null)?.categories || [])
    setFamilies((familiesJson as { families?: Family[] } | null)?.families || [])
    setFilters((filtersJson as { filters?: Filter[] } | null)?.filters || [])
  }

  useEffect(() => {
    let ignore = false

    async function bootstrap() {
      if (!ignore) {
        await loadAll()
      }
    }

    void bootstrap()

    return () => {
      ignore = true
    }
  }, [])

  const visibleFamilies = useMemo(() => {
    const categoryId = Number(form.category_id)
    if (!Number.isInteger(categoryId)) return []
    return families.filter((family) => family.category_id === categoryId)
  }, [families, form.category_id])

  const selectedFamilyRecord = useMemo(
    () => families.find((family) => String(family.id) === form.family_id) ?? null,
    [families, form.family_id],
  )

  const isSparePartSelection = useMemo(() => {
    if (!selectedFamilyRecord) return false
    const normalized = selectedFamilyRecord.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return normalized.includes('piece') || normalized.includes('detache')
  }, [selectedFamilyRecord])

  useEffect(() => {
    if (sparepartTargetId && !compatibleModelIds.includes(sparepartTargetId)) {
      setSparepartTargetId(compatibleModelIds[0] ?? null)
    }
  }, [compatibleModelIds, sparepartTargetId])

  const compatibleModelChoices = useMemo(() => {
    const q = compatibleSearch.trim().toLowerCase()
    return products
      .filter((product) => product.type === 'CONFIGURABLE')
      .filter((product) => (editingId ? product.id !== editingId : true))
      .filter((product) => {
        if (!q) return true
        const haystack = `${product.name} ${product.brand.name} ${product.family.name} ${product.category.name}`.toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [compatibleSearch, editingId, products])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setSpecRows([{ key: '', value: '' }])
    setCompatibleModelIds([])
    setCompatibleSearch('')
    setSparepartTargetId(null)
    setSparepartFilterAssignments({})
    setShowDialog(true)
  }

  async function openEdit(product: Product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      base_price: String(product.base_price),
      type: product.type,
      image_url: product.image_url ?? '',
      description: product.description ?? '',
      stock_qty: String(product.stock_qty ?? 0),
      in_stock: Boolean(product.in_stock),
      poe: Boolean(product.poe),
      brand_id: String(product.brand.id),
      category_id: String(product.category.id),
      family_id: String(product.family.id),
    })
    setSpecRows(
      product.specs.length > 0
        ? product.specs.map((spec) => ({ key: spec.spec_key, value: spec.spec_value }))
        : [{ key: '', value: '' }],
    )

    const preloadedIds = Array.isArray(product.compatibilities_as_part)
      ? product.compatibilities_as_part.map((entry) => entry.target_product_id)
      : []
    setCompatibleModelIds(preloadedIds)
    setCompatibleSearch('')

    const assignments = Array.isArray(product.sparepart_filters_as_part)
      ? product.sparepart_filters_as_part.reduce<Record<number, number[]>>((acc, entry) => {
        const current = acc[entry.target_product_id] ?? []
        acc[entry.target_product_id] = Array.from(new Set([...current, entry.filter_id]))
        return acc
      }, {})
      : {}
    setSparepartFilterAssignments(assignments)
    setSparepartTargetId(preloadedIds[0] ?? (Object.keys(assignments)[0] ? Number(Object.keys(assignments)[0]) : null))

    const compatRes = await fetch(`/api/admin/products/${product.id}/compatibilities`)
    if (compatRes.ok) {
      const compatJson = await compatRes.json().catch(() => null)
      const ids = Array.isArray(compatJson?.compatibleProductIds)
        ? compatJson.compatibleProductIds.filter((value: unknown): value is number => Number.isInteger(value))
        : []
      setCompatibleModelIds(ids)
      setSparepartTargetId((current) => (current && ids.includes(current) ? current : ids[0] ?? null))
    }

    setShowDialog(true)
  }

  async function saveProduct() {
    const payload = {
      ...form,
      base_price: Number(form.base_price),
      stock_qty: Number(form.stock_qty),
      brand_id: Number(form.brand_id),
      category_id: Number(form.category_id),
      family_id: Number(form.family_id),
      specs: form.type === 'STANDARD' ? specRows.filter((entry) => entry.key.trim() && entry.value.trim()) : [],
      compatible_product_ids: form.type === 'STANDARD' && isSparePartSelection ? compatibleModelIds : [],
      sparepart_filters: form.type === 'STANDARD' && isSparePartSelection
        ? Object.entries(sparepartFilterAssignments).map(([targetProductId, filterIds]) => ({
            target_product_id: Number(targetProductId),
            filter_ids: filterIds,
          }))
        : [],
    }

    const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products'
    const method = editingId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Enregistrement impossible')
      return
    }

    toast.success(editingId ? 'Produit modifie' : 'Produit cree')
    setShowDialog(false)
    await loadAll()
  }

  async function removeProduct(product: Product) {
    if (!confirm(`Supprimer ${product.name} ?`)) return

    const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Suppression impossible')
      return
    }

    toast.success('Produit supprime')
    await loadAll()
  }

  async function addOption() {
    if (!optionDialogProduct || !optionName.trim()) return

    const cleanedValues = optionValues
      .filter((entry) => entry.value.trim())
      .map((entry) => ({
        value: entry.value.trim(),
        price: Number(entry.price || 0),
        quantity: Math.max(1, Math.trunc(Number(entry.quantity || 1))),
      }))

    const res = await fetch(
      editingOptionId
        ? `/api/admin/products/${optionDialogProduct.id}/options/${editingOptionId}`
        : `/api/admin/products/${optionDialogProduct.id}/options`,
      {
        method: editingOptionId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: optionName.trim(), values: cleanedValues }),
      },
    )

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Creation option impossible')
      return
    }

    toast.success(editingOptionId ? 'Option modifiee' : 'Option ajoutee')
    setEditingOptionId(null)
    setOptionName('')
    setOptionValues([{ value: '', price: '0', quantity: '1' }])
    await loadAll()
  }

  function startEditOption(option: Product['configuration_options'][number]) {
    setEditingOptionId(option.id)
    setOptionName(option.name)
    setOptionValues(
      option.values.length > 0
        ? option.values.map((value) => ({ value: value.value, price: String(value.price), quantity: String(value.quantity ?? 1) }))
        : [{ value: '', price: '0', quantity: '1' }],
    )
  }

  async function deleteOption(optionId: number) {
    if (!optionDialogProduct) return
    if (!confirm('Supprimer cette option ?')) return

    const res = await fetch(`/api/admin/products/${optionDialogProduct.id}/options/${optionId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Suppression option impossible')
      return
    }

    toast.success('Option supprimee')
    if (editingOptionId === optionId) {
      setEditingOptionId(null)
      setOptionName('')
      setOptionValues([{ value: '', price: '0', quantity: '1' }])
    }
    await loadAll()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produits</h1>
          <p className="text-sm text-slate-500">Gestion des Product + ConfigurationOption + ProductFilterValue.</p>
        </div>
        <Button onClick={openCreate}>Nouveau produit</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste</CardTitle>
          <CardDescription>{products.length} produits dans le catalogue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Brand / Family</TableHead>
                <TableHead>Stock / PoE</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.type}</TableCell>
                  <TableCell>
                    <p>{product.brand.name}</p>
                    <p className="text-xs text-slate-500">{product.family.name} / {product.category.name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{product.in_stock ? `En stock (${product.stock_qty})` : 'Rupture'}</p>
                    <p className="text-xs text-slate-500">PoE: {product.poe ? 'Oui' : 'Non'}</p>
                  </TableCell>
                  <TableCell>{Number(product.base_price).toFixed(2)} EUR</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(product)}>Modifier</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={product.type !== 'CONFIGURABLE'}
                        onClick={() => setOptionDialogProduct(product)}
                      >
                        Options
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => removeProduct(product)}>Supprimer</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Prix de base</Label>
              <Input
                type="number"
                step="0.01"
                value={form.base_price}
                onChange={(e) => setForm((prev) => ({ ...prev, base_price: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"
                value={form.type}
                onChange={(e) => {
                  const nextType = e.target.value as 'STANDARD' | 'CONFIGURABLE'
                  setForm((prev) => ({ ...prev, type: nextType }))
                }}
              >
                <option value="STANDARD">STANDARD</option>
                <option value="CONFIGURABLE">CONFIGURABLE</option>
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <textarea
                className="min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description détaillée du produit (optionnel)"
              />
            </div>

            <div className="space-y-2">
              <Label>Quantite stock</Label>
              <Input
                type="number"
                min="0"
                value={form.stock_qty}
                onChange={(e) => setForm((prev) => ({ ...prev, stock_qty: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Disponibilite</Label>
              <div className="flex h-10 items-center gap-5 rounded border border-slate-200 bg-white px-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.in_stock}
                    onChange={(e) => setForm((prev) => ({ ...prev, in_stock: e.target.checked }))}
                  />
                  En stock
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.poe}
                    onChange={(e) => setForm((prev) => ({ ...prev, poe: e.target.checked }))}
                  />
                  PoE
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Brand</Label>
              <select
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"
                value={form.brand_id}
                onChange={(e) => setForm((prev) => ({ ...prev, brand_id: e.target.value }))}
              >
                <option value="">Selectionner</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"
                value={form.category_id}
                onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value, family_id: '' }))}
              >
                <option value="">Selectionner</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Family</Label>
              <select
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"
                value={form.family_id}
                onChange={(e) => setForm((prev) => ({ ...prev, family_id: e.target.value }))}
              >
                <option value="">Selectionner</option>
                {visibleFamilies.map((family) => (
                  <option key={family.id} value={family.id}>{family.name}</option>
                ))}
              </select>
            </div>

            {form.type === 'STANDARD' && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Specifications (produit standard)</Label>
                <div className="space-y-2 rounded border p-2">
                  {specRows.map((entry, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Input
                        value={entry.key}
                        placeholder="Ex: CPU"
                        onChange={(e) => {
                          setSpecRows((prev) => {
                            const next = [...prev]
                            next[index] = { ...next[index], key: e.target.value }
                            return next
                          })
                        }}
                      />
                      <Input
                        value={entry.value}
                        placeholder="Ex: Intel Xeon"
                        onChange={(e) => {
                          setSpecRows((prev) => {
                            const next = [...prev]
                            next[index] = { ...next[index], value: e.target.value }
                            return next
                          })
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSpecRows((prev) => prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : [{ key: '', value: '' }])
                        }}
                      >
                        Suppr.
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => setSpecRows((prev) => [...prev, { key: '', value: '' }])}>
                    Ajouter une spec
                  </Button>
                </div>
              </div>
            )}

            {form.type === 'STANDARD' && isSparePartSelection && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Modeles compatibles (serveur / storage / reseau)</Label>
                <div className="space-y-2 rounded border p-3">
                  <Input
                    placeholder="Rechercher un modele..."
                    value={compatibleSearch}
                    onChange={(e) => setCompatibleSearch(e.target.value)}
                  />
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded border bg-slate-50 p-2">
                    {compatibleModelChoices.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucun modele configurable trouve.</p>
                    ) : compatibleModelChoices.map((product) => {
                      const checked = compatibleModelIds.includes(product.id)
                      return (
                        <label key={product.id} className="flex items-start gap-2 rounded border bg-white px-2 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setCompatibleModelIds((previous) => {
                                if (e.target.checked) return Array.from(new Set([...previous, product.id]))
                                return previous.filter((id) => id !== product.id)
                              })
                            }}
                          />
                          <span>
                            {product.name}
                            <span className="block text-xs text-slate-500">
                              {product.brand.name} / {product.family.name} / {product.category.name}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {form.type === 'STANDARD' && isSparePartSelection && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Filtres de piece detachee</Label>
                <div className="space-y-3 rounded border p-3">
                  {compatibleModelIds.length === 0 ? (
                    <p className="text-sm text-slate-500">Selectionne d'abord au moins un modele compatible.</p>
                  ) : (
                    <>
                      <select
                        value={sparepartTargetId ?? ''}
                        onChange={(e) => setSparepartTargetId(Number(e.target.value) || null)}
                        className="w-full rounded border px-3 py-2 text-sm"
                      >
                        <option value="">Selectionner un modele cible</option>
                        {compatibleModelChoices
                          .filter((product) => compatibleModelIds.includes(product.id))
                          .map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {product.brand.name} / {product.family.name}
                            </option>
                          ))}
                      </select>

                      {sparepartTargetId ? (
                        <div className="space-y-2">
                          {filters.length === 0 ? (
                            <p className="text-sm text-slate-500">Aucun filtre configure dans le catalogue.</p>
                          ) : (
                            filters.map((filter) => {
                              const checked = (sparepartFilterAssignments[sparepartTargetId] ?? []).includes(filter.id)
                              return (
                                <label key={filter.id} className={`flex cursor-pointer items-center justify-between rounded border px-3 py-2 text-sm ${checked ? 'border-[#2ad1a4] bg-[#f0fdf9]' : 'bg-white'}`}>
                                  <span className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) => {
                                        setSparepartFilterAssignments((previous) => {
                                          const current = previous[sparepartTargetId] ?? []
                                          const next = event.target.checked
                                            ? Array.from(new Set([...current, filter.id]))
                                            : current.filter((value) => value !== filter.id)
                                          return { ...previous, [sparepartTargetId]: next }
                                        })
                                      }}
                                    />
                                    {filter.name}
                                  </span>
                                </label>
                              )
                            })
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Choisis un modele cible pour definir ses filtres.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={saveProduct}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(optionDialogProduct)}
        onOpenChange={(open) => {
          if (open) return
          setOptionDialogProduct(null)
          setEditingOptionId(null)
          setOptionName('')
          setOptionValues([{ value: '', price: '0', quantity: '1' }])
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Options configurables {optionDialogProduct ? `- ${optionDialogProduct.name}` : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Label>Nom de l option</Label>
            <Input value={optionName} onChange={(e) => setOptionName(e.target.value)} placeholder="Ex: CPU" />

            {optionValues.map((entry, index) => (
              <div key={index} className="grid grid-cols-[1fr_120px_100px] gap-2">
                <Input
                  value={entry.value}
                  placeholder="Valeur"
                  onChange={(e) => {
                    setOptionValues((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], value: e.target.value }
                      return next
                    })
                  }}
                />
                <Input
                  type="number"
                  step="0.01"
                  value={entry.price}
                  placeholder="Prix"
                  onChange={(e) => {
                    setOptionValues((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], price: e.target.value }
                      return next
                    })
                  }}
                />
                <Input
                  type="number"
                  min="1"
                  value={entry.quantity}
                  placeholder="Qte"
                  onChange={(e) => {
                    setOptionValues((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], quantity: e.target.value }
                      return next
                    })
                  }}
                />
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOptionValues((prev) => [...prev, { value: '', price: '0', quantity: '1' }])}
              >
                Ajouter une ligne
              </Button>
              {editingOptionId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingOptionId(null)
                    setOptionName('')
                    setOptionValues([{ value: '', price: '0', quantity: '1' }])
                  }}
                >
                  Annuler edition
                </Button>
              )}
              <Button onClick={addOption}>{editingOptionId ? 'Enregistrer option' : 'Ajouter option'}</Button>
            </div>

            <div className="rounded border p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">Options existantes</p>
              <div className="space-y-2">
                {optionDialogProduct?.configuration_options.map((option) => (
                  <div key={option.id} className="rounded border p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{option.name}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEditOption(option)}>Modifier</Button>
                        <Button variant="outline" size="sm" onClick={() => deleteOption(option.id)}>Supprimer</Button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {option.values.map((value) => `${value.value} x${value.quantity} (+${Number(value.price).toFixed(2)})`).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionDialogProduct(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
