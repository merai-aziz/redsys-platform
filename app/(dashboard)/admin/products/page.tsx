'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  compatibilities_as_part?: Array<{ target_product_id: number }>
  sparepart_filters_as_part?: Array<{ target_product_id: number; filter_id: number }>
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

// ─── ImageUploadField ────────────────────────────────────────────────────────

interface ImageUploadFieldProps {
  value: string
  onChange: (url: string) => void
}

function ImageUploadField({ value, onChange }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [tab, setTab] = useState<'upload' | 'url'>('upload')

  const previewSrc = value.trim() || null

  async function handleFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG, WEBP, GIF ou SVG.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 5 Mo).')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('context', 'products')

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json() as { fileUrl?: string; error?: string }

      if (!res.ok || !data.fileUrl) {
        toast.error(data.error ?? "Erreur lors de l'upload")
        return
      }

      onChange(data.fileUrl)
      toast.success('Image uploadée avec succès')
    } catch {
      toast.error("Erreur réseau lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${
            tab === 'upload'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📁 Depuis le PC
        </button>
        <button
          type="button"
          onClick={() => setTab('url')}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${
            tab === 'url'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          🔗 URL externe
        </button>
      </div>

      {tab === 'upload' && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
            cursor-pointer p-6 text-center transition
            ${dragOver
              ? 'border-[#2ad1a4] bg-[#f0fdf9]'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
            }
            ${uploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={onFileInput}
          />

          {uploading ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#2ad1a4]" />
              <p className="text-sm text-slate-500">Upload en cours…</p>
            </>
          ) : (
            <>
              <div className="text-3xl">🖼️</div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Glissez une image ici ou <span className="text-[#2ad1a4] underline">cliquez pour parcourir</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">JPG, PNG, WEBP, GIF, SVG — max 5 Mo</p>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'url' && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      )}

      {previewSrc && (
        <div className="relative flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Aperçu"
            className="h-20 w-20 rounded object-cover border border-slate-100"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-600 mb-0.5">Image actuelle</p>
            <p className="text-xs text-slate-400 break-all line-clamp-2">{previewSrc}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            title="Supprimer l'image"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
      try { return JSON.parse(text) as Record<string, unknown> } catch { return null }
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
    async function bootstrap() { if (!ignore) await loadAll() }
    void bootstrap()
    return () => { ignore = true }
  }, [])

  const visibleFamilies = useMemo(() => {
    const categoryId = Number(form.category_id)
    if (!Number.isInteger(categoryId)) return []
    return families.filter((f) => f.category_id === categoryId)
  }, [families, form.category_id])

  const selectedFamilyRecord = useMemo(
    () => families.find((f) => String(f.id) === form.family_id) ?? null,
    [families, form.family_id],
  )

  const isSparePartSelection = useMemo(() => {
    if (!selectedFamilyRecord) return false
    const normalized = selectedFamilyRecord.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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
      .filter((p) => p.type === 'CONFIGURABLE')
      .filter((p) => (editingId ? p.id !== editingId : true))
      .filter((p) => {
        if (!q) return true
        const haystack = `${p.name} ${p.brand.name} ${p.family.name} ${p.category.name}`.toLowerCase()
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
        ? product.specs.map((s) => ({ key: s.spec_key, value: s.spec_value }))
        : [{ key: '', value: '' }],
    )

    const preloadedIds = Array.isArray(product.compatibilities_as_part)
      ? product.compatibilities_as_part.map((e) => e.target_product_id)
      : []
    setCompatibleModelIds(preloadedIds)
    setCompatibleSearch('')

    const assignments = Array.isArray(product.sparepart_filters_as_part)
      ? product.sparepart_filters_as_part.reduce<Record<number, number[]>>((acc, e) => {
          const current = acc[e.target_product_id] ?? []
          acc[e.target_product_id] = Array.from(new Set([...current, e.filter_id]))
          return acc
        }, {})
      : {}
    setSparepartFilterAssignments(assignments)
    setSparepartTargetId(preloadedIds[0] ?? (Object.keys(assignments)[0] ? Number(Object.keys(assignments)[0]) : null))

    const compatRes = await fetch(`/api/admin/products/${product.id}/compatibilities`)
    if (compatRes.ok) {
      const compatJson = await compatRes.json().catch(() => null)
      const ids = Array.isArray(compatJson?.compatibleProductIds)
        ? compatJson.compatibleProductIds.filter((v: unknown): v is number => Number.isInteger(v))
        : []
      setCompatibleModelIds(ids)
      setSparepartTargetId((cur) => (cur && ids.includes(cur) ? cur : ids[0] ?? null))
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
      specs: form.type === 'STANDARD' ? specRows.filter((e) => e.key.trim() && e.value.trim()) : [],
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

    toast.success(editingId ? 'Produit modifié' : 'Produit créé')
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
    toast.success('Produit supprimé')
    await loadAll()
  }

  async function addOption() {
    if (!optionDialogProduct || !optionName.trim()) return
    const cleanedValues = optionValues
      .filter((e) => e.value.trim())
      .map((e) => ({
        value: e.value.trim(),
        price: Number(e.price || 0),
        quantity: Math.max(1, Math.trunc(Number(e.quantity || 1))),
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
      toast.error(data?.error || 'Création option impossible')
      return
    }

    toast.success(editingOptionId ? 'Option modifiée' : 'Option ajoutée')
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
        ? option.values.map((v) => ({ value: v.value, price: String(v.price), quantity: String(v.quantity ?? 1) }))
        : [{ value: '', price: '0', quantity: '1' }],
    )
  }

  async function deleteOption(optionId: number) {
    if (!optionDialogProduct || !confirm('Supprimer cette option ?')) return
    const res = await fetch(`/api/admin/products/${optionDialogProduct.id}/options/${optionId}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Suppression option impossible')
      return
    }
    toast.success('Option supprimée')
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
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {product.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-8 w-8 rounded object-cover border border-slate-100 shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      {product.name}
                    </div>
                  </TableCell>
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
                        variant="outline" size="sm"
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

      {/* ── Dialog création/édition produit ───────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
            <DialogDescription>
              Gérez les informations détaillées du produit, ses spécifications et ses options configurables.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Prix de base</Label>
              <Input
                type="number" step="0.01" value={form.base_price}
                onChange={(e) => setForm((p) => ({ ...p, base_price: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'STANDARD' | 'CONFIGURABLE' }))}
              >
                <option value="STANDARD">STANDARD</option>
                <option value="CONFIGURABLE">CONFIGURABLE</option>
              </select>
            </div>

            {/* ── Image upload ── */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Image du produit</Label>
              <ImageUploadField
                value={form.image_url}
                onChange={(url) => setForm((p) => ({ ...p, image_url: url }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <textarea
                className="min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description détaillée du produit (optionnel)"
              />
            </div>

            <div className="space-y-2">
              <Label>Quantité stock</Label>
              <Input
                type="number" min="0" value={form.stock_qty}
                onChange={(e) => setForm((p) => ({ ...p, stock_qty: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Disponibilité</Label>
              <div className="flex h-10 items-center gap-5 rounded border border-slate-200 bg-white px-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox" checked={form.in_stock}
                    onChange={(e) => setForm((p) => ({ ...p, in_stock: e.target.checked }))}
                  />
                  En stock
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox" checked={form.poe}
                    onChange={(e) => setForm((p) => ({ ...p, poe: e.target.checked }))}
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
                onChange={(e) => setForm((p) => ({ ...p, brand_id: e.target.value }))}
              >
                <option value="">Sélectionner</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"
                value={form.category_id}
                onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value, family_id: '' }))}
              >
                <option value="">Sélectionner</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Family</Label>
              <select
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"
                value={form.family_id}
                onChange={(e) => setForm((p) => ({ ...p, family_id: e.target.value }))}
              >
                <option value="">Sélectionner</option>
                {visibleFamilies.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {/* ── SPECS — seul bloc modifié ── */}
            {form.type === 'STANDARD' && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Spécifications (produit standard)</Label>
                {filters.length === 0 && (
                  <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Aucun filtre disponible. Créez d'abord des filtres dans le catalogue pour pouvoir ajouter des specs.
                  </p>
                )}
                <div className="space-y-2 rounded border p-2">
                  {specRows.map((entry, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      {/*
                        ── CLÉ : select parmi les filtres existants ──
                        La valeur stockée (entry.key) est le nom du filtre (string),
                        identique à ce qu'on envoyait avant — aucun changement de structure.
                      */}
                      <select
                        className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"
                        value={entry.key}
                        onChange={(e) => setSpecRows((prev) => {
                          const next = [...prev]
                          next[index] = { ...next[index], key: e.target.value }
                          return next
                        })}
                      >
                        <option value="">— Choisir un filtre —</option>
                        {filters.map((f) => (
                          <option key={f.id} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                      </select>

                      {/* VALEUR : inchangée, texte libre */}
                      <Input
                        value={entry.value}
                        placeholder="Ex: 24"
                        onChange={(e) => setSpecRows((prev) => {
                          const next = [...prev]
                          next[index] = { ...next[index], value: e.target.value }
                          return next
                        })}
                      />

                      <Button
                        type="button" variant="outline"
                        onClick={() => setSpecRows((prev) =>
                          prev.length > 1
                            ? prev.filter((_, i) => i !== index)
                            : [{ key: '', value: '' }]
                        )}
                      >
                        Suppr.
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSpecRows((prev) => [...prev, { key: '', value: '' }])}
                  >
                    Ajouter une spec
                  </Button>
                </div>
              </div>
            )}
            {/* ── FIN SPECS ── */}

            {form.type === 'STANDARD' && isSparePartSelection && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Modèles compatibles (serveur / storage / réseau)</Label>
                <div className="space-y-2 rounded border p-3">
                  <Input
                    placeholder="Rechercher un modèle..."
                    value={compatibleSearch}
                    onChange={(e) => setCompatibleSearch(e.target.value)}
                  />
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded border bg-slate-50 p-2">
                    {compatibleModelChoices.length === 0
                      ? <p className="text-sm text-slate-500">Aucun modèle configurable trouvé.</p>
                      : compatibleModelChoices.map((p) => {
                          const checked = compatibleModelIds.includes(p.id)
                          return (
                            <label key={p.id} className="flex items-start gap-2 rounded border bg-white px-2 py-2 text-sm">
                              <input
                                type="checkbox" checked={checked}
                                onChange={(e) => setCompatibleModelIds((prev) =>
                                  e.target.checked ? Array.from(new Set([...prev, p.id])) : prev.filter((id) => id !== p.id)
                                )}
                              />
                              <span>
                                {p.name}
                                <span className="block text-xs text-slate-500">{p.brand.name} / {p.family.name} / {p.category.name}</span>
                              </span>
                            </label>
                          )
                        })
                    }
                  </div>
                </div>
              </div>
            )}

            {form.type === 'STANDARD' && isSparePartSelection && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Filtres de pièce détachée</Label>
                <div className="space-y-3 rounded border p-3">
                  {compatibleModelIds.length === 0
                    ? <p className="text-sm text-slate-500">Sélectionne d'abord au moins un modèle compatible.</p>
                    : (
                      <>
                        <select
                          value={sparepartTargetId ?? ''}
                          onChange={(e) => setSparepartTargetId(Number(e.target.value) || null)}
                          className="w-full rounded border px-3 py-2 text-sm"
                        >
                          <option value="">Sélectionner un modèle cible</option>
                          {compatibleModelChoices
                            .filter((p) => compatibleModelIds.includes(p.id))
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.name} - {p.brand.name} / {p.family.name}</option>
                            ))}
                        </select>

                        {sparepartTargetId ? (
                          <div className="space-y-2">
                            {filters.length === 0
                              ? <p className="text-sm text-slate-500">Aucun filtre configuré dans le catalogue.</p>
                              : filters.map((filter) => {
                                  const checked = (sparepartFilterAssignments[sparepartTargetId] ?? []).includes(filter.id)
                                  return (
                                    <label
                                      key={filter.id}
                                      className={`flex cursor-pointer items-center justify-between rounded border px-3 py-2 text-sm ${checked ? 'border-[#2ad1a4] bg-[#f0fdf9]' : 'bg-white'}`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <input
                                          type="checkbox" checked={checked}
                                          onChange={(e) => setSparepartFilterAssignments((prev) => {
                                            const current = prev[sparepartTargetId] ?? []
                                            const next = e.target.checked
                                              ? Array.from(new Set([...current, filter.id]))
                                              : current.filter((v) => v !== filter.id)
                                            return { ...prev, [sparepartTargetId]: next }
                                          })}
                                        />
                                        {filter.name}
                                      </span>
                                    </label>
                                  )
                                })
                            }
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">Choisis un modèle cible pour définir ses filtres.</p>
                        )}
                      </>
                    )
                  }
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

      {/* ── Dialog options configurables ───────────────────────────────────── */}
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
            <DialogTitle>Options configurables {optionDialogProduct ? `- ${optionDialogProduct.name}` : ''}</DialogTitle>
            <DialogDescription>Configurez les options disponibles et les variations de prix pour ce produit.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label>Nom de l'option</Label>
            <Input value={optionName} onChange={(e) => setOptionName(e.target.value)} placeholder="Ex: CPU" />

            {optionValues.map((entry, index) => (
              <div key={index} className="grid grid-cols-[1fr_120px_100px] gap-2">
                <Input
                  value={entry.value} placeholder="Valeur"
                  onChange={(e) => setOptionValues((prev) => { const next = [...prev]; next[index] = { ...next[index], value: e.target.value }; return next })}
                />
                <Input
                  type="number" step="0.01" value={entry.price} placeholder="Prix"
                  onChange={(e) => setOptionValues((prev) => { const next = [...prev]; next[index] = { ...next[index], price: e.target.value }; return next })}
                />
                <Input
                  type="number" min="1" value={entry.quantity} placeholder="Qté"
                  onChange={(e) => setOptionValues((prev) => { const next = [...prev]; next[index] = { ...next[index], quantity: e.target.value }; return next })}
                />
              </div>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOptionValues((prev) => [...prev, { value: '', price: '0', quantity: '1' }])}>
                Ajouter une ligne
              </Button>
              {editingOptionId && (
                <Button variant="outline" onClick={() => { setEditingOptionId(null); setOptionName(''); setOptionValues([{ value: '', price: '0', quantity: '1' }]) }}>
                  Annuler édition
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
                      {option.values.map((v) => `${v.value} x${v.quantity} (+${Number(v.price).toFixed(2)})`).join(', ')}
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