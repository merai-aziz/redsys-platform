'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Brand {
  id: number
  name: string
  _count?: { products: number }
}

interface Category {
  id: number
  name: string
  _count?: { families: number; products: number }
}

interface Family {
  id: number
  name: string
  category_id: number
  category?: { id: number; name: string }
  _count?: { products: number }
}

interface Filter {
  id: number
  name: string
  filter_values?: Array<{ id: number; value: string }>
}

export default function AdminCatalogPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [filters, setFilters] = useState<Filter[]>([])

  const [brandName, setBrandName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [familyCategoryId, setFamilyCategoryId] = useState<number | null>(null)
  const [filterName, setFilterName] = useState('')
  const [selectedFamilyForFilters, setSelectedFamilyForFilters] = useState<number | null>(null)
  const [assignedFilterIds, setAssignedFilterIds] = useState<number[]>([])
  const [filterValueDrafts, setFilterValueDrafts] = useState<Record<number, string>>({})

  async function loadAll() {
    const [brandsRes, categoriesRes, familiesRes, filtersRes] = await Promise.all([
      fetch('/api/admin/brands'),
      fetch('/api/admin/categories'),
      fetch('/api/admin/families'),
      fetch('/api/admin/filters'),
    ])

    const [brandsJson, categoriesJson, familiesJson, filtersJson] = await Promise.all([
      brandsRes.json(),
      categoriesRes.json(),
      familiesRes.json(),
      filtersRes.json(),
    ])

    setBrands(brandsJson.brands || [])
    setCategories(categoriesJson.categories || [])
    setFamilies(familiesJson.families || [])
    setFilters(filtersJson.filters || [])
  }

  const selectedFamilyLabel = useMemo(() => {
    if (!selectedFamilyForFilters) return ''
    const family = families.find((entry) => entry.id === selectedFamilyForFilters)
    return family ? `${family.name} (${family.category?.name || 'Sans categorie'})` : ''
  }, [families, selectedFamilyForFilters])

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

  async function createBrand() {
    if (!brandName.trim()) return

    const res = await fetch('/api/admin/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: brandName.trim() }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Creation impossible')
      return
    }

    setBrandName('')
    toast.success('Brand ajoutee')
    await loadAll()
  }

  async function createCategory() {
    if (!categoryName.trim()) return

    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName.trim() }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Creation impossible')
      return
    }

    setCategoryName('')
    toast.success('Categorie ajoutee')
    await loadAll()
  }

  async function createFamily() {
    if (!familyName.trim() || !familyCategoryId) return

    const res = await fetch('/api/admin/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: familyName.trim(),
        category_id: familyCategoryId,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Creation impossible')
      return
    }

    setFamilyName('')
    toast.success('Famille ajoutee')
    await loadAll()
  }

  async function createFilter() {
    if (!filterName.trim()) return

    const res = await fetch('/api/admin/filters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: filterName.trim() }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Creation impossible')
      return
    }

    setFilterName('')
    toast.success('Filtre ajoute')
    await loadAll()
  }

  async function createFilterValue(filterId: number) {
    const value = (filterValueDrafts[filterId] ?? '').trim()
    if (!value) return

    const res = await fetch(`/api/admin/filters/${filterId}/values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Ajout de valeur impossible')
      return
    }

    setFilterValueDrafts((previous) => ({ ...previous, [filterId]: '' }))
    toast.success('Option de filtre ajoutee')
    await loadAll()
  }

  async function removeFilterValue(filterId: number, valueId: number, label: string) {
    if (!confirm(`Supprimer la valeur ${label} ?`)) return

    const res = await fetch(`/api/admin/filters/${filterId}/values/${valueId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Suppression de valeur impossible')
      return
    }

    toast.success('Valeur de filtre supprimee')
    await loadAll()
  }

  async function removeEntity(resource: string, id: number, label: string) {
    if (!confirm(`Supprimer ${label} ?`)) return

    const res = await fetch(`/api/admin/${resource}/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Suppression impossible')
      return
    }

    toast.success('Supprime')
    await loadAll()
  }

  async function renameEntity(resource: string, id: number, currentName: string, extra?: { category_id?: number }) {
    const nextName = prompt('Nouveau nom', currentName)?.trim()
    if (!nextName || nextName === currentName) return

    const payload = resource === 'families'
      ? { name: nextName, category_id: extra?.category_id }
      : { name: nextName }

    const res = await fetch(`/api/admin/${resource}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Modification impossible')
      return
    }

    toast.success('Mis a jour')
    await loadAll()
  }

  useEffect(() => {
    let ignore = false

    async function loadFamilyFilters() {
      if (!selectedFamilyForFilters) {
        setAssignedFilterIds([])
        return
      }

      const res = await fetch(`/api/admin/families/${selectedFamilyForFilters}/filters`)
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        if (!ignore) {
          toast.error(json?.error || 'Chargement des filtres famille impossible')
          setAssignedFilterIds([])
        }
        return
      }

      if (!ignore) {
        const ids = Array.isArray(json?.assignedFilterIds)
          ? json.assignedFilterIds.filter((id: unknown): id is number => Number.isInteger(id))
          : []
        setAssignedFilterIds(ids)
      }
    }

    void loadFamilyFilters()

    return () => {
      ignore = true
    }
  }, [selectedFamilyForFilters])

  async function saveFamilyFilters() {
    if (!selectedFamilyForFilters) return

    const res = await fetch(`/api/admin/families/${selectedFamilyForFilters}/filters`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterIds: assignedFilterIds }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Enregistrement impossible')
      return
    }

    toast.success('Filtres de famille mis a jour')
  }

  function toggleFamilyFilter(filterId: number, checked: boolean) {
    setAssignedFilterIds((previous) => {
      if (checked) return Array.from(new Set([...previous, filterId]))
      return previous.filter((id) => id !== filterId)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Catalogue</h1>
        <p className="text-sm text-slate-500">Gestion de Brand, Category et Family.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Brands</CardTitle>
            <CardDescription>Liste des marques globales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Ex: Dell" />
              <Button onClick={createBrand} className="w-full">Ajouter</Button>
            </div>

            <div className="space-y-2">
              {brands.map((brand) => (
                <div key={brand.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div>
                    <p className="font-medium">{brand.name}</p>
                    <p className="text-xs text-slate-500">{brand._count?.products ?? 0} produits</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => renameEntity('brands', brand.id, brand.name)}>
                      Modifier
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => removeEntity('brands', brand.id, brand.name)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Niveau parent du catalogue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Ex: Serveurs" />
              <Button onClick={createCategory} className="w-full">Ajouter</Button>
            </div>

            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-slate-500">
                      {category._count?.families ?? 0} familles, {category._count?.products ?? 0} produits
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => renameEntity('categories', category.id, category.name)}>
                      Modifier
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => removeEntity('categories', category.id, category.name)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Families</CardTitle>
            <CardDescription>Reliees a une category.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Ex: Rack Servers" />
              <Label>Categorie</Label>
              <select
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"
                value={familyCategoryId ?? ''}
                onChange={(e) => setFamilyCategoryId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Selectionner</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button onClick={createFamily} className="w-full">Ajouter</Button>
            </div>

            <div className="space-y-2">
              {families.map((family) => (
                <div key={family.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div>
                    <p className="font-medium">{family.name}</p>
                    <p className="text-xs text-slate-500">{family.category?.name || 'Sans categorie'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => renameEntity('families', family.id, family.name, { category_id: family.category_id })}
                    >
                      Modifier
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => removeEntity('families', family.id, family.name)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
            <CardDescription>Definitions des filtres reutilisables (Ports, Interface, PoE...)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Nom du filtre</Label>
              <Input value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder="Ex: Ports" />
              <Button onClick={createFilter} className="w-full">Ajouter</Button>
            </div>

            <div className="space-y-2">
              {filters.map((filter) => (
                <div key={filter.id} className="rounded border p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{filter.name}</p>
                      <p className="text-xs text-slate-500">{filter.filter_values?.length ?? 0} valeurs</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => renameEntity('filters', filter.id, filter.name)}>
                        Modifier
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => removeEntity('filters', filter.id, filter.name)}>
                        Supprimer
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(filter.filter_values ?? []).map((entry) => (
                        <span key={entry.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                          {entry.value}
                          <button
                            type="button"
                            className="rounded px-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => removeFilterValue(filter.id, entry.id, entry.value)}
                            aria-label={`Supprimer ${entry.value}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={filterValueDrafts[filter.id] ?? ''}
                        onChange={(e) => setFilterValueDrafts((previous) => ({ ...previous, [filter.id]: e.target.value }))}
                        placeholder="Ajouter une option (ex: 24)"
                      />
                      <Button variant="outline" size="sm" onClick={() => createFilterValue(filter.id)}>
                        Ajouter option
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Affectation Filtres par Famille</CardTitle>
          <CardDescription>Assigner les filtres autorises pour chaque famille de produits standards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,320px)_1fr]">
            <div className="space-y-2">
              <Label>Famille</Label>
              <select
                className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"
                value={selectedFamilyForFilters ?? ''}
                onChange={(e) => setSelectedFamilyForFilters(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Selectionner</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name} ({family.category?.name || 'Sans categorie'})
                  </option>
                ))}
              </select>
              {selectedFamilyLabel && <p className="text-xs text-slate-500">Selection: {selectedFamilyLabel}</p>}
            </div>

            <div className="space-y-2">
              <Label>Filtres assignes</Label>
              {!selectedFamilyForFilters ? (
                <p className="rounded border bg-slate-50 p-3 text-sm text-slate-500">Choisissez d abord une famille.</p>
              ) : filters.length === 0 ? (
                <p className="rounded border bg-slate-50 p-3 text-sm text-slate-500">Aucun filtre disponible. Creez des filtres dans le bloc ci-dessus.</p>
              ) : (
                <div className="grid gap-2 rounded border p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filters.map((filter) => {
                    const checked = assignedFilterIds.includes(filter.id)
                    return (
                      <label key={filter.id} className="flex items-center gap-2 rounded border px-2 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleFamilyFilter(filter.id, e.target.checked)}
                        />
                        <span>{filter.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveFamilyFilters} disabled={!selectedFamilyForFilters}>Enregistrer affectation</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
