"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { SiteHeader } from '@/components/SiteHeader'

interface Domain { id: string; code: string; name: string; icon?: string | null; displayOrder: number }
interface Brand { id: string; name: string; logo?: string | null; domainId: string; sortOrder: number }
interface Series { id: string; name: string; image?: string | null; description?: string | null; familyId: string; brandId: string; domainId: string; sortOrder: number }
interface Model {
  id: string
  name: string
  reference: string
  shortDescription?: string | null
  longDescription?: string | null
  basePrice: number
  image?: string | null
  stockQty?: number
  status?: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED'
  condition?: string | null
  poe?: boolean
  specs?: Array<{ key: string; value: string }>
  brandName?: string
  familyName?: string
  categoryName?: string
  seriesId: string
  brandId: string
  domainId: string
  filterValues?: Array<{
    filterId: number
    filterName: string
    valueId: number
    value: string
  }>
}
interface SKU { id: string; sku: string; modelId: string; price: number; stock: number; condition: string }
interface CompatibilityLink { partProductId: string; targetProductId: string }
interface SparepartFilterDefinition {
  targetProductId: string
  filters: Array<{ id: number; name: string; values?: Array<{ id: number; value: string }> }>
}
interface SparepartDomainFilterDefinition {
  domainCode: string
  filters: Array<{ id: number; name: string; values?: Array<{ id: number; value: string }> }>
}
interface FamilyFilterDefinition {
  familyId: string
  filters: Array<{
    name: string
    values: string[]
  }>
}
interface CatalogPayload {
  domains: Domain[]
  brands: Brand[]
  series: Series[]
  models: Model[]
  skus: SKU[]
  familyFilters: FamilyFilterDefinition[]
  compatibilities: CompatibilityLink[]
  sparepartFilters: SparepartFilterDefinition[]
  sparepartDomainFilters: SparepartDomainFilterDefinition[]
}

function safePayload(payload: unknown): CatalogPayload {
  const p = payload as Partial<CatalogPayload> | null | undefined
  return {
    domains: Array.isArray(p?.domains) ? p.domains : [],
    brands: Array.isArray(p?.brands) ? p.brands : [],
    series: Array.isArray(p?.series) ? p.series : [],
    models: Array.isArray(p?.models) ? p.models : [],
    skus: Array.isArray(p?.skus) ? p.skus : [],
    familyFilters: Array.isArray(p?.familyFilters) ? p.familyFilters : [],
    compatibilities: Array.isArray(p?.compatibilities) ? p.compatibilities : [],
    sparepartFilters: Array.isArray(p?.sparepartFilters) ? p.sparepartFilters : [],
    sparepartDomainFilters: Array.isArray(p?.sparepartDomainFilters) ? p.sparepartDomainFilters : [],
  }
}

function getSectionFromDomainId(catalog: CatalogPayload, domainId: string | null) {
  if (!domainId || domainId === 'domain-products') return 'products'

  const domain = catalog.domains.find((entry) => entry.id === domainId)
  const code = domain?.code.toUpperCase() ?? ''

  if (code === 'SERVER') return 'server'
  if (code === 'STORAGE') return 'storage'
  if (code === 'NETWORK') return 'network'

  return 'products'
}

export function ConfiguratorSiteHeader() {
  const router = useRouter()
  const [catalog, setCatalog] = useState<CatalogPayload>({
    domains: [],
    brands: [],
    series: [],
    models: [],
    skus: [],
    familyFilters: [],
    compatibilities: [],
    sparepartFilters: [],
    sparepartDomainFilters: [],
  })
  const [query, setQuery] = useState('')
  const activeSectionRef = useRef<'products' | 'server' | 'storage' | 'network'>('products')

  useEffect(() => {
    fetch('/api/catalog')
      .then((res) => res.json())
      .then((data) => setCatalog(safePayload(data)))
      .catch(() => {})
  }, [])

  function pushCatalogUrl(section: 'products' | 'server' | 'storage' | 'network', params: Record<string, string | null | undefined> = {}) {
    const searchParams = new URLSearchParams()
    searchParams.set('section', section)

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value)
      }
    })

    router.push(`/?${searchParams.toString()}`)
  }

  return (
    <SiteHeader
      catalog={catalog}
      query={query}
      onQueryChange={setQuery}
      onSelectDomain={(domainId) => {
        const section = getSectionFromDomainId(catalog, domainId)
        activeSectionRef.current = section
        pushCatalogUrl(section)
      }}
      onSelectBrand={(brandId) => {
        if (!brandId) {
          pushCatalogUrl(activeSectionRef.current)
          return
        }

        pushCatalogUrl(activeSectionRef.current, { brandId })
      }}
      onSelectSeries={(seriesId) => {
        if (!seriesId) {
          pushCatalogUrl(activeSectionRef.current)
          return
        }

        const seriesRecord = catalog.series.find((entry) => entry.id === seriesId)
        pushCatalogUrl(activeSectionRef.current, {
          brandId: seriesRecord?.brandId,
          seriesId,
        })
      }}
      onSelectModel={(modelId, context) => {
        const section = getSectionFromDomainId(catalog, context?.domainId ?? null)
        activeSectionRef.current = section

        if (!modelId) {
          pushCatalogUrl(section, {
            brandId: context?.brandId,
            seriesId: context?.seriesId,
          })
          return
        }

        pushCatalogUrl(section, {
          brandId: context?.brandId,
          seriesId: context?.seriesId,
          modelId,
        })
      }}
    />
  )
}