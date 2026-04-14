'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ChevronUp, Filter } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'


type Domain = {
  id: string
  label: string
}

type Brand = {
  id: string
  name: string
  domainId: string
}

type ModelSummary = {
  id: string
  name: string
  reference: string
  domainId: string
  brandId: string
  domain?: { id?: string; label: string } | null
  brand?: { id?: string; name: string } | null
}

type ModelFiltersPayload = {
  groups: Array<{
    id: string
    filters: Array<{
      id: string
      options: Array<{ id: string }>
    }>
  }>
  products: Array<{
    id: string
    attributes: Array<{ id: string }>
  }>
}

type ModelCardData = {
  model: ModelSummary
  groupCount: number
  filterCount: number
  optionCount: number
  productCount: number
}

export default function AdminFiltersPage() {
  const [loading, setLoading] = useState(true)
  const [domains, setDomains] = useState<Domain[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<ModelSummary[]>([])
  const [cards, setCards] = useState<ModelCardData[]>([])

  const [selectedDomain, setSelectedDomain] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [search, setSearch] = useState('')

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({})

  const requestJson = useCallback(async <T,>(url: string): Promise<T> => {
    const res = await fetch(url)
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data.error || 'Erreur serveur')
    }

    return data as T
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [domainRes, brandRes, modelRes] = await Promise.all([
        requestJson<{ domains: Domain[] }>('/api/admin/domain'),
        requestJson<{ brands: Brand[] }>('/api/admin/brand'),
        requestJson<{ models: ModelSummary[] }>('/api/admin/model'),
      ])

      setDomains(domainRes.domains || [])
      setBrands(brandRes.brands || [])
      setModels(modelRes.models || [])

      const modelIds = (modelRes.models || []).map((model) => model.id)
      const details = await Promise.all(
        modelIds.map(async (modelId) => {
          const payload = await requestJson<ModelFiltersPayload>(`/api/admin/model/${modelId}/filters`)
          return { modelId, payload }
        }),
      )

      const nextCards: ModelCardData[] = (modelRes.models || []).map((model) => {
        const detail = details.find((entry) => entry.modelId === model.id)?.payload

        const groupCount = detail?.groups.length || 0
        const filterCount = (detail?.groups || []).reduce((sum, group) => sum + group.filters.length, 0)
        const optionCount = (detail?.groups || []).reduce(
          (sum, group) =>
            sum + group.filters.reduce((inner, filter) => inner + filter.options.length, 0),
          0,
        )
        const productCount = detail?.products.length || 0

        return {
          model,
          groupCount,
          filterCount,
          optionCount,
          productCount,
        }
      })

      setCards(nextCards)

      const initialOpen: Record<string, boolean> = {}
      for (const card of nextCards) {
        initialOpen[card.model.id] = false
      }
      setOpenMap(initialOpen)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [requestJson])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const availableBrands = useMemo(() => {
    if (!selectedDomain) return brands
    return brands.filter((brand) => brand.domainId === selectedDomain)
  }, [brands, selectedDomain])

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase()

    return cards.filter((card) => {
      if (selectedDomain && card.model.domainId !== selectedDomain) return false
      if (selectedBrand && card.model.brandId !== selectedBrand) return false

      if (!q) return true
      return `${card.model.name} ${card.model.reference}`.toLowerCase().includes(q)
    })
  }, [cards, search, selectedBrand, selectedDomain])

  function resetFilters() {
    setSelectedDomain('')
    setSelectedBrand('')
    setSearch('')
  }

  function toggleCard(modelId: string) {
    setOpenMap((prev) => ({ ...prev, [modelId]: !prev[modelId] }))
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Filtres & Groupes</h1>
        <p className="mt-1 text-sm text-slate-500">Vue synthétique des filtres par modele.</p>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-4">
          <select
            value={selectedDomain}
            onChange={(event) => {
              setSelectedDomain(event.target.value)
              setSelectedBrand('')
            }}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="">Tous domaines</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>{domain.label}</option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(event) => setSelectedBrand(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="">Toutes marques</option>
            {availableBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher modele..."
            className="h-10 bg-slate-50"
          />

          <Button variant="outline" onClick={resetFilters}>Reset</Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-12 text-center text-slate-500">Chargement...</CardContent>
        </Card>
      ) : filteredCards.length === 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-12 text-center text-slate-500">Aucun modele avec filtres.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCards.map((card) => {
            const isOpen = openMap[card.model.id] ?? false

            return (
              <Card key={card.model.id} className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="text-base">{card.model.name}</CardTitle>
                      <CardDescription>Ref: {card.model.reference}</CardDescription>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{card.model.domain?.label || 'Domaine'}</Badge>
                        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{card.model.brand?.name || 'Marque'}</Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">{card.groupCount} groupes</Badge>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{card.filterCount} filtres</Badge>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{card.optionCount} options</Badge>
                      <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">{card.productCount} produits lies</Badge>

                      <Button variant="outline" onClick={() => toggleCard(card.model.id)}>
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>

                      <Button asChild className="bg-sky-600 text-white hover:bg-sky-700">
                        <Link href={`/admin/catalog?modelId=${card.model.id}`}>
                          Gerer
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isOpen ? (
                  <CardContent>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="inline-flex items-center gap-2 font-medium">
                        <Filter className="h-4 w-4" />
                        Resume rapide
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600">
                        <li>• {card.groupCount} groupe(s) de filtres actifs</li>
                        <li>• {card.filterCount} filtre(s) configuré(s)</li>
                        <li>• {card.optionCount} option(s) de filtrage</li>
                        <li>• {card.productCount} produit(s) relié(s)</li>
                      </ul>
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
