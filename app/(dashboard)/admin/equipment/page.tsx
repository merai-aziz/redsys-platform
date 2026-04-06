'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Image as ImageIcon, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type EntityType = 'brand' | 'category' | 'subcategory' | 'subsubcategory' | 'equipment'
type EditorMode = 'create' | 'edit'

type CatalogTab = EntityType

interface Brand {
  id: string
  name: string
  slug: string
  logo?: string | null
  description?: string | null
  isActive: boolean
  sortOrder: number
}

interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  photo?: string | null
  isActive: boolean
  sortOrder: number
}

interface SubCategory {
  id: string
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  photo?: string | null
  categoryId: string
  isActive: boolean
  sortOrder: number
  category?: { id: string; name: string }
}

interface SubSubCategory {
  id: string
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  photo?: string | null
  subCategoryId: string
  isActive: boolean
  sortOrder: number
  subCategory?: { id: string; name: string; category?: { id: string; name: string } }
}

interface EquipmentItem {
  id: string
  name: string
  slug: string
  reference: string
  description?: string | null
  photo?: string | null
  price?: string | null
  quantity: number
  status: 'AVAILABLE' | 'OUT_OF_STOCK'
  equipmentType: 'SERVER' | 'STORAGE' | 'NETWORK' | 'COMPONENT'
  specs: Array<{ id?: string; specKey: string; specValue: string; unit: string }>
  brand?: { id: string; name: string }
  category?: { id: string; name: string }
  subCategory?: { id: string; name: string } | null
  subSubCategory?: { id: string; name: string } | null
}

interface EditorState {
  type: EntityType
  mode: EditorMode
  id?: string
}

const defaultForm = {
  name: '',
  slug: '',
  description: '',
  logo: '',
  icon: '',
  photo: '',
  sortOrder: '0',
  isActive: true,
  categoryId: '',
  subCategoryId: '',
  reference: '',
  price: '',
  quantity: '0',
  status: 'AVAILABLE' as EquipmentItem['status'],
  equipmentType: 'SERVER' as EquipmentItem['equipmentType'],
  brandId: '',
  subSubCategoryId: '',
  specs: [{ specKey: '', specValue: '', unit: '' }],
}

export default function AdminEquipmentPage() {
  const [activeTab, setActiveTab] = useState<CatalogTab>('equipment')
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<SubCategory[]>([])
  const [subsubcategories, setSubsubcategories] = useState<SubSubCategory[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [equipmentLoading, setEquipmentLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [search, setSearch] = useState('')
  const [filterBrandId, setFilterBrandId] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterSubCategoryId, setFilterSubCategoryId] = useState('')
  const [filterSubSubCategoryId, setFilterSubSubCategoryId] = useState('')
  const [filterEquipmentType, setFilterEquipmentType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [refreshing, setRefreshing] = useState(false)
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

  async function loadStaticData() {
    const [brandData, categoryData, subcategoryData, subsubData] = await Promise.all([
      requestJson<{ brands: Brand[] }>('/api/admin/catalog?type=brand'),
      requestJson<{ categories: Category[] }>('/api/admin/catalog?type=category'),
      requestJson<{ subcategories: SubCategory[] }>('/api/admin/catalog?type=subcategory'),
      requestJson<{ subsubcategories: SubSubCategory[] }>('/api/admin/catalog?type=subsubcategory'),
    ])

    setBrands(brandData.brands)
    setCategories(categoryData.categories)
    setSubcategories(subcategoryData.subcategories)
    setSubsubcategories(subsubData.subsubcategories)
  }

  async function loadEquipment() {
    setEquipmentLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('type', 'equipment')
      if (search.trim()) params.set('search', search.trim())
      if (filterBrandId) params.set('brandId', filterBrandId)
      if (filterCategoryId) params.set('categoryId', filterCategoryId)
      if (filterSubCategoryId) params.set('subCategoryId', filterSubCategoryId)
      if (filterSubSubCategoryId) params.set('subSubCategoryId', filterSubSubCategoryId)
      if (filterEquipmentType) params.set('equipmentType', filterEquipmentType)
      if (filterStatus) params.set('status', filterStatus)

      const data = await requestJson<{ equipment: EquipmentItem[] }>(`/api/admin/catalog?${params.toString()}`)
      setEquipment(data.equipment)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur de chargement')
    } finally {
      setEquipmentLoading(false)
    }
  }

  async function bootstrap() {
    setRefreshing(true)
    try {
      await Promise.all([loadStaticData(), loadEquipment()])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEquipment()
    }, 250)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterBrandId, filterCategoryId, filterSubCategoryId, filterSubSubCategoryId, filterEquipmentType, filterStatus])

  function openEditor(type: EntityType, mode: EditorMode, item?: Record<string, unknown>) {
    setEditor({ type, mode, id: item?.id as string | undefined })
    setForm({
      ...defaultForm,
      ...(type === 'brand'
        ? {
            name: (item?.name as string) || '',
            slug: (item?.slug as string) || '',
            description: (item?.description as string) || '',
            logo: (item?.logo as string) || '',
            sortOrder: String((item?.sortOrder as number) ?? 0),
            isActive: Boolean(item?.isActive ?? true),
          }
        : {}),
      ...(type === 'category'
        ? {
            name: (item?.name as string) || '',
            slug: (item?.slug as string) || '',
            description: (item?.description as string) || '',
            icon: (item?.icon as string) || '',
            photo: (item?.photo as string) || '',
            sortOrder: String((item?.sortOrder as number) ?? 0),
            isActive: Boolean(item?.isActive ?? true),
          }
        : {}),
      ...(type === 'subcategory'
        ? {
            name: (item?.name as string) || '',
            slug: (item?.slug as string) || '',
            description: (item?.description as string) || '',
            icon: (item?.icon as string) || '',
            photo: (item?.photo as string) || '',
            categoryId: (item?.categoryId as string) || '',
            sortOrder: String((item?.sortOrder as number) ?? 0),
            isActive: Boolean(item?.isActive ?? true),
          }
        : {}),
      ...(type === 'subsubcategory'
        ? {
            name: (item?.name as string) || '',
            slug: (item?.slug as string) || '',
            description: (item?.description as string) || '',
            icon: (item?.icon as string) || '',
            photo: (item?.photo as string) || '',
            subCategoryId: (item?.subCategoryId as string) || '',
            sortOrder: String((item?.sortOrder as number) ?? 0),
            isActive: Boolean(item?.isActive ?? true),
          }
        : {}),
      ...(type === 'equipment'
        ? {
            name: (item?.name as string) || '',
            slug: (item?.slug as string) || '',
            reference: (item?.reference as string) || '',
            description: (item?.description as string) || '',
            photo: (item?.photo as string) || '',
            price: (item?.price as string) || '',
            quantity: String((item?.quantity as number) ?? 0),
            status: (item?.status as EquipmentItem['status']) || 'AVAILABLE',
            equipmentType: (item?.equipmentType as EquipmentItem['equipmentType']) || 'SERVER',
            brandId: (item?.brandId as string) || (item?.brand as { id: string } | undefined)?.id || '',
            categoryId: (item?.categoryId as string) || (item?.category as { id: string } | undefined)?.id || '',
            subCategoryId: (item?.subCategoryId as string) || (item?.subCategory as { id: string } | undefined)?.id || '',
            subSubCategoryId:
              (item?.subSubCategoryId as string) || (item?.subSubCategory as { id: string } | undefined)?.id || '',
            specs:
              Array.isArray(item?.specs) && item.specs.length > 0
                ? (item.specs as Array<{ id?: string; specKey: string; specValue: string; unit: string }>).map((spec) => ({
                    id: spec.id,
                    specKey: spec.specKey || '',
                    specValue: spec.specValue || '',
                    unit: spec.unit || '',
                  }))
                : [{ specKey: '', specValue: '', unit: '' }],
          }
        : {}),
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
    setForm((prev) => ({ ...prev, photo: data.photo }))
  }

  async function handleSave() {
    if (!editor) return

    if (!form.name.trim()) {
      toast.error('Le nom est requis')
      return
    }

    if (editor.type === 'subcategory' && !form.categoryId) {
      toast.error('Choisissez une categorie')
      return
    }

    if (editor.type === 'subsubcategory' && !form.subCategoryId) {
      toast.error('Choisissez une sous-categorie')
      return
    }

    if (editor.type === 'equipment') {
      if (!form.reference.trim() || !form.brandId || !form.categoryId || !form.subCategoryId) {
        toast.error('Champs equipment obligatoires manquants')
        return
      }

      const cleanedSpecs = form.specs
        .map((spec) => ({
          specKey: spec.specKey.trim(),
          specValue: spec.specValue.trim(),
          unit: spec.unit.trim(),
        }))
        .filter((spec) => spec.specKey && spec.specValue)

      if (form.equipmentType === 'SERVER') {
        const serverKeys = new Set(cleanedSpecs.map((spec) => spec.specKey.toLowerCase()))
        const missing = ['cpu', 'ram', 'storage'].filter((key) => !serverKeys.has(key))
        if (missing.length > 0) {
          toast.error(`Specs SERVER manquantes: ${missing.join(', ')}`)
          return
        }
      }
    }

    setSaving(true)
    try {
      const type = editor.type
      const url = editor.mode === 'create' ? `/api/admin/catalog?type=${type}` : `/api/admin/catalog/${editor.id}?type=${type}`
      const method = editor.mode === 'create' ? 'POST' : 'PUT'

      const payload =
        type === 'brand'
          ? {
              name: form.name,
              slug: form.slug,
              description: form.description || null,
              logo: form.logo || null,
              sortOrder: form.sortOrder,
              isActive: form.isActive,
            }
          : type === 'category'
            ? {
                name: form.name,
                slug: form.slug,
                description: form.description || null,
                icon: form.icon || null,
                photo: form.photo || null,
                sortOrder: form.sortOrder,
                isActive: form.isActive,
              }
            : type === 'subcategory'
              ? {
                  name: form.name,
                  slug: form.slug,
                  description: form.description || null,
                  icon: form.icon || null,
                  photo: form.photo || null,
                  categoryId: form.categoryId,
                  sortOrder: form.sortOrder,
                  isActive: form.isActive,
                }
              : type === 'subsubcategory'
                ? {
                    name: form.name,
                    slug: form.slug,
                    description: form.description || null,
                    icon: form.icon || null,
                    photo: form.photo || null,
                    subCategoryId: form.subCategoryId,
                    sortOrder: form.sortOrder,
                    isActive: form.isActive,
                  }
                : {
                    name: form.name,
                    slug: form.slug,
                    reference: form.reference,
                    description: form.description || null,
                    photo: form.photo || null,
                    price: form.price,
                    quantity: form.quantity,
                    status: form.status,
                    equipmentType: form.equipmentType,
                    brandId: form.brandId,
                    categoryId: form.categoryId,
                    subCategoryId: form.subCategoryId,
                    subSubCategoryId: form.subSubCategoryId || null,
                    specs: form.specs
                      .map((spec) => ({
                        specKey: spec.specKey.trim(),
                        specValue: spec.specValue.trim(),
                        unit: spec.unit.trim(),
                      }))
                      .filter((spec) => spec.specKey && spec.specValue),
                  }

      await requestJson(url, {
        method,
        body: JSON.stringify(payload),
      })

      toast.success(editor.mode === 'create' ? 'Element cree' : 'Element mis a jour')
      closeEditor()
      await bootstrap()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation impossible')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(type: EntityType, id: string) {
    if (!confirm('Confirmer la suppression ?')) return
    try {
      await requestJson(`/api/admin/catalog/${id}?type=${type}`, { method: 'DELETE' })
      toast.success('Suppression effectuee')
      await bootstrap()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible')
    }
  }

  const categoryOptions = useMemo(() => categories, [categories])

  const equipmentStats = {
    total: equipment.length,
    available: equipment.filter((item) => item.status === 'AVAILABLE').length,
    outOfStock: equipment.filter((item) => item.status === 'OUT_OF_STOCK').length,
    server: equipment.filter((item) => item.equipmentType === 'SERVER').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des equipements</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            CRUD complet pour les equipements, marques, categories et sous-categories avec filtrage avance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={bootstrap} className="border-slate-200 bg-white">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualiser
          </Button>
          <Button onClick={() => openEditor(activeTab, 'create')} className="bg-sky-600 text-white hover:bg-sky-700">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Equipements</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{equipmentStats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Disponibles</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{equipmentStats.available}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Type SERVER</p>
            <p className="mt-1 text-3xl font-bold text-sky-600">{equipmentStats.server}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Rupture</p>
            <p className="mt-1 text-3xl font-bold text-rose-600">{equipmentStats.outOfStock}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['equipment', 'Equipements'],
          ['brand', 'Marques'],
          ['category', 'Categories'],
          ['subcategory', 'Sous-categories'],
          ['subsubcategory', 'Sous-sous-categories'],
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

      {activeTab === 'equipment' ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Equipements</CardTitle>
            <CardDescription>Filtrage par marque, categorie, sous-categorie et statut.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-7">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher" className="h-10 border-slate-200 bg-slate-50 pl-9" />
              </div>
              <select value={filterBrandId} onChange={(e) => setFilterBrandId(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                <option value="">Toutes les marques</option>
                {brands.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                <option value="">Toutes les categories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <select value={filterSubCategoryId} onChange={(e) => setFilterSubCategoryId(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                <option value="">Toutes les sous-categories</option>
                {subcategories.filter((item) => !filterCategoryId || item.categoryId === filterCategoryId).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <select value={filterSubSubCategoryId} onChange={(e) => setFilterSubSubCategoryId(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                <option value="">Toutes les sous-sous-categories</option>
                {subsubcategories.filter((item) => !filterSubCategoryId || item.subCategoryId === filterSubCategoryId).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <select value={filterEquipmentType} onChange={(e) => setFilterEquipmentType(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                <option value="">Tous les types</option>
                <option value="SERVER">SERVER</option>
                <option value="STORAGE">STORAGE</option>
                <option value="NETWORK">NETWORK</option>
                <option value="COMPONENT">COMPONENT</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                <option value="">Tous les statuts</option>
                <option value="AVAILABLE">Available</option>
                <option value="OUT_OF_STOCK">Out of stock</option>
              </select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Prix / Stock</TableHead>
                  <TableHead>Etat</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipmentLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-sky-600" />
                    </TableCell>
                  </TableRow>
                ) : equipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                      Aucun equipement trouve.
                    </TableCell>
                  </TableRow>
                ) : (
                  equipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.photo ? (
                          <img src={item.photo} alt={item.name} className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.description || 'Aucune description'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{item.reference}</TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-900">{item.brand?.name || 'Marque inconnue'}</div>
                        <div className="text-xs text-slate-500">
                          {[item.category?.name, item.subCategory?.name, item.subSubCategory?.name]
                            .filter(Boolean)
                            .join(' / ') || 'Classification non definie'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold text-slate-900">{item.price ? `${item.price} DT` : 'N.C.'}</div>
                        <div className="text-xs text-slate-500">Stock: {item.quantity}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            className={
                              item.status === 'AVAILABLE'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : item.status === 'OUT_OF_STOCK'
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                            }
                          >
                            {item.status}
                          </Badge>
                          <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">{item.equipmentType}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon-sm" onClick={() => openEditor('equipment', 'edit', item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon-sm" className="text-rose-600" onClick={() => handleDelete('equipment', item.id)}>
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
      ) : activeTab === 'brand' ? (
        <SimpleEntityTable
          title="Marques"
          description="Gestion des marques de votre catalogue."
          entity="brand"
          rows={brands.map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: item.description || 'Aucune description',
            meta: item.logo || 'Sans logo',
            status: item.isActive ? 'Actif' : 'Inactif',
            raw: item,
          }))}
          onAdd={() => openEditor('brand', 'create')}
          onEdit={(item) => openEditor('brand', 'edit', item as unknown as Record<string, unknown>)}
          onDelete={(id) => handleDelete('brand', id)}
        />
      ) : activeTab === 'category' ? (
        <SimpleEntityTable
          title="Categories"
          description="Gestion des categories racines."
          entity="category"
          rows={categories.map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: item.description || 'Aucune description',
            meta: item.icon || item.photo || 'Sans media',
            status: item.isActive ? 'Actif' : 'Inactif',
            raw: item,
          }))}
          onAdd={() => openEditor('category', 'create')}
          onEdit={(item) => openEditor('category', 'edit', item as unknown as Record<string, unknown>)}
          onDelete={(id) => handleDelete('category', id)}
        />
      ) : activeTab === 'subcategory' ? (
        <SimpleEntityTable
          title="Sous-categories"
          description="Chaque sous-categorie est rattachee a une categorie."
          entity="subcategory"
          rows={subcategories.map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: item.category?.name || 'Sans categorie',
            meta: item.photo || item.icon || 'Sans media',
            status: item.isActive ? 'Actif' : 'Inactif',
            raw: item,
          }))}
          onAdd={() => openEditor('subcategory', 'create')}
          onEdit={(item) => openEditor('subcategory', 'edit', item as unknown as Record<string, unknown>)}
          onDelete={(id) => handleDelete('subcategory', id)}
        />
      ) : (
        <SimpleEntityTable
          title="Sous-sous-categories"
          description="Dernier niveau de classification du catalogue."
          entity="subsubcategory"
          rows={subsubcategories.map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: item.subCategory?.name || 'Sans sous-categorie',
            meta: item.photo || item.icon || 'Sans media',
            status: item.isActive ? 'Actif' : 'Inactif',
            raw: item,
          }))}
          onAdd={() => openEditor('subsubcategory', 'create')}
          onEdit={(item) => openEditor('subsubcategory', 'edit', item as unknown as Record<string, unknown>)}
          onDelete={(id) => handleDelete('subsubcategory', id)}
        />
      )}

      <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === 'edit' ? 'Modifier' : 'Creer'}{' '}
              {editor?.type === 'brand'
                ? 'une marque'
                : editor?.type === 'category'
                  ? 'une categorie'
                  : editor?.type === 'subcategory'
                    ? 'une sous-categorie'
                    : editor?.type === 'subsubcategory'
                      ? 'une sous-sous-categorie'
                      : 'un equipement'}
            </DialogTitle>
            <DialogDescription>
              Respect des relations du catalogue et des filtres de navigation.
            </DialogDescription>
          </DialogHeader>

          {editor ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nom *</Label>
                  <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="mt-2 h-10 border-slate-200 bg-slate-50" />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} className="mt-2 h-10 border-slate-200 bg-slate-50" placeholder="auto genere si vide" />
                </div>
              </div>

              {editor.type !== 'equipment' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Description</Label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>{editor.type === 'brand' ? 'Logo URL' : 'Media URL'}</Label>
                      <Input value={editor.type === 'brand' ? form.logo : form.photo} onChange={(e) => setForm((prev) => (editor.type === 'brand' ? { ...prev, logo: e.target.value } : { ...prev, photo: e.target.value }))} className="mt-2 h-10 border-slate-200 bg-slate-50" />
                    </div>
                    <div>
                      <Label>Ordre</Label>
                      <Input value={form.sortOrder} onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))} className="mt-2 h-10 border-slate-200 bg-slate-50" />
                    </div>
                  </div>
                </div>
              ) : null}

              {editor.type === 'subcategory' ? (
                <div>
                  <Label>Categorie parente *</Label>
                  <select value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                    <option value="">Choisir</option>
                    {categoryOptions.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {editor.type === 'subsubcategory' ? (
                <div>
                  <Label>Sous-categorie parente *</Label>
                  <select value={form.subCategoryId} onChange={(e) => setForm((prev) => ({ ...prev, subCategoryId: e.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                    <option value="">Choisir</option>
                    {subcategories.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {editor.type === 'equipment' ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Reference *</Label>
                      <Input value={form.reference} onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))} className="mt-2 h-10 border-slate-200 bg-slate-50" />
                    </div>
                    <div>
                      <Label>Prix</Label>
                      <Input value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} className="mt-2 h-10 border-slate-200 bg-slate-50" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Quantite</Label>
                      <Input value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} className="mt-2 h-10 border-slate-200 bg-slate-50" />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as EquipmentItem['status'] }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Type d&apos;equipement</Label>
                      <select value={form.equipmentType} onChange={(e) => setForm((prev) => ({ ...prev, equipmentType: e.target.value as EquipmentItem['equipmentType'] }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                        <option value="SERVER">SERVER</option>
                        <option value="STORAGE">STORAGE</option>
                        <option value="NETWORK">NETWORK</option>
                        <option value="COMPONENT">COMPONENT</option>
                      </select>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {form.equipmentType === 'SERVER'
                        ? "Pour SERVER, ajoutez les specs: cpu, ram, storage."
                        : 'Pour les autres types, les specs sont libres selon votre modele.'}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Marque *</Label>
                      <select value={form.brandId} onChange={(e) => setForm((prev) => ({ ...prev, brandId: e.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                        <option value="">Choisir</option>
                        {brands.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Categorie *</Label>
                      <select value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value, subCategoryId: '', subSubCategoryId: '' }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                        <option value="">Choisir</option>
                        {categories.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Sous-categorie *</Label>
                      <select value={form.subCategoryId} onChange={(e) => setForm((prev) => ({ ...prev, subCategoryId: e.target.value, subSubCategoryId: '' }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                        <option value="">Choisir</option>
                        {subcategories.filter((item) => !form.categoryId || item.categoryId === form.categoryId).map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Sous-sous-categorie</Label>
                      <select value={form.subSubCategoryId} onChange={(e) => setForm((prev) => ({ ...prev, subSubCategoryId: e.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                        <option value="">Aucune</option>
                        {subsubcategories.filter((item) => !form.subCategoryId || item.subCategoryId === form.subCategoryId).map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Photo</Label>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Input value={form.photo} onChange={(e) => setForm((prev) => ({ ...prev, photo: e.target.value }))} className="h-10 border-slate-200 bg-slate-50" placeholder="/uploads/equipment/... ou upload" />
                      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        try {
                          await handlePhotoUpload(file)
                          toast.success('Photo envoyee')
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Upload impossible')
                        } finally {
                          e.target.value = ''
                        }
                      }} />
                      <Button type="button" variant="outline" className="border-slate-200 bg-white" onClick={() => photoInputRef.current?.click()}>
                        <Upload className="h-4 w-4" />
                        Importer
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Caracteristiques (equipmentSpec)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            specs: [...prev.specs, { specKey: '', specValue: '', unit: '' }],
                          }))
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter spec
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {form.specs.map((spec, index) => (
                        <div key={`${index}-${spec.specKey}`} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_120px_auto]">
                          <Input
                            value={spec.specKey}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                specs: prev.specs.map((item, i) => (i === index ? { ...item, specKey: e.target.value } : item)),
                              }))
                            }
                            placeholder="specKey (cpu, ram, storage...)"
                            className="h-10 border-slate-200 bg-white"
                          />
                          <Input
                            value={spec.specValue}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                specs: prev.specs.map((item, i) => (i === index ? { ...item, specValue: e.target.value } : item)),
                              }))
                            }
                            placeholder="specValue"
                            className="h-10 border-slate-200 bg-white"
                          />
                          <Input
                            value={spec.unit}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                specs: prev.specs.map((item, i) => (i === index ? { ...item, unit: e.target.value } : item)),
                              }))
                            }
                            placeholder="unit"
                            className="h-10 border-slate-200 bg-white"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 border-slate-200"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                specs:
                                  prev.specs.length === 1
                                    ? [{ specKey: '', specValue: '', unit: '' }]
                                    : prev.specs.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-sky-600 text-white hover:bg-sky-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
  entity: EntityType
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
