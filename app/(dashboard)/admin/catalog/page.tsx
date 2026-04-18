'use client'

import { useEffect, useState } from 'react'
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

export default function AdminCatalogPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [families, setFamilies] = useState<Family[]>([])

  const [brandName, setBrandName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [familyCategoryId, setFamilyCategoryId] = useState<number | null>(null)

  async function loadAll() {
    const [brandsRes, categoriesRes, familiesRes] = await Promise.all([
      fetch('/api/admin/brands'),
      fetch('/api/admin/categories'),
      fetch('/api/admin/families'),
    ])

    const [brandsJson, categoriesJson, familiesJson] = await Promise.all([
      brandsRes.json(),
      categoriesRes.json(),
      familiesRes.json(),
    ])

    setBrands(brandsJson.brands || [])
    setCategories(categoriesJson.categories || [])
    setFamilies(familiesJson.families || [])
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Catalogue - structure du diagramme</h1>
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
      </div>
    </div>
  )
}
