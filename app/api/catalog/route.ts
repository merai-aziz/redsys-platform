import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

type Domain = {
  id: string
  code: string
  name: string
  icon: string | null
  displayOrder: number
}

type Brand = {
  id: string
  name: string
  logo: string | null
  domainId: string
  sortOrder: number
}

type Series = {
  id: string
  name: string
  image: string | null
  description: string | null
  familyId: string
  brandId: string
  domainId: string
  sortOrder: number
}

type FamilyFilter = {
  familyId: string
  filters: Array<{
    name: string
    values: string[]
  }>
}

type FamilyFilterLinkRow = {
  family_id: number
  filter_name: string
  filter_value: string | null
}

type SparepartFilterLinkRow = {
  target_product_id: number
  filter_id: number
  filter_name: string
  filter_value_id: number | null
  filter_value: string | null
}

type SparepartDomainFilterRow = {
  domain_code: string
  filter_id: number
  filter_name: string
  filter_value_id: number | null
  filter_value: string | null
}

type Model = {
  id: string
  name: string
  reference: string
  shortDescription: string | null
  longDescription: string | null
  basePrice: number
  image: string | null
  stockQty: number
  status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED'
  condition: string | null
  poe: boolean
  specs: Array<{ key: string; value: string }>
  brandName: string
  familyName: string
  categoryName: string
  seriesId: string
  brandId: string
  domainId: string
  filterValues: Array<{
    filterId: number
    filterName: string
    valueId: number
    value: string
  }>
}

type CompatibilityLink = {
  partProductId: string
  targetProductId: string
}

type Sku = {
  id: string
  sku: string
  modelId: string
  price: number
  stock: number
  condition: string
}

function detectDomain(categoryName: string, familyName: string, productName: string, productType: string) {
  if (productType === 'STANDARD') {
    return { id: 'domain-products', code: 'COMPONENT', name: 'Produits', icon: null, displayOrder: 4 }
  }

  const haystack = `${categoryName} ${familyName} ${productName}`.toLowerCase()

  if (haystack.includes('server') || haystack.includes('serveur') || haystack.includes('rack') || haystack.includes('tower') || haystack.includes('blade')) {
    return { id: 'domain-server', code: 'SERVER', name: 'Serveur', icon: null, displayOrder: 1 }
  }

  if (haystack.includes('storage') || haystack.includes('stockage') || haystack.includes('san') || haystack.includes('nas') || haystack.includes('disk')) {
    return { id: 'domain-storage', code: 'STORAGE', name: 'Storage', icon: null, displayOrder: 2 }
  }

  if (haystack.includes('network') || haystack.includes('reseau') || haystack.includes('switch') || haystack.includes('router') || haystack.includes('catalyst') || haystack.includes('nexus') || haystack.includes('brocade')) {
    return { id: 'domain-network', code: 'NETWORK', name: 'Reseau', icon: null, displayOrder: 3 }
  }

  return { id: 'domain-products', code: 'COMPONENT', name: 'Produits', icon: null, displayOrder: 4 }
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const search = searchParams.get('search')?.trim().toLowerCase() || ''
  const domainId = searchParams.get('domainId')
  const brandId = searchParams.get('brandId')
  const seriesId = searchParams.get('seriesId')
  const modelId = searchParams.get('modelId')
  const poe = searchParams.get('poe')
  const inStock = searchParams.get('inStock')
  const spec = searchParams.get('spec')?.trim().toLowerCase() || ''

  const familyFilterLinksPromise = prisma.$queryRaw<FamilyFilterLinkRow[]>`
    SELECT
      ff.family_id,
      f.name AS filter_name,
      fv.value AS filter_value
    FROM family_filters ff
    INNER JOIN catalog_filters f ON f.id = ff.filter_id
    LEFT JOIN filter_values fv ON fv.filter_id = f.id
    ORDER BY ff.family_id ASC, ff.sort_order ASC, f.name ASC, fv.value ASC
  `

  const sparepartFilterLinksPromise = prisma.$queryRaw<SparepartFilterLinkRow[]>`
    SELECT
      sf.target_product_id,
      sf.filter_id,
      f.name AS filter_name,
      fv.id AS filter_value_id,
      fv.value AS filter_value
    FROM sparepart_filters sf
    INNER JOIN catalog_filters f ON f.id = sf.filter_id
    LEFT JOIN filter_values fv ON fv.filter_id = f.id
    ORDER BY sf.target_product_id ASC, sf.sort_order ASC, f.name ASC, fv.value ASC
  `

  const sparepartDomainFilterLinksPromise = prisma.$queryRaw<SparepartDomainFilterRow[]>`
    SELECT
      sdf.domain_code,
      sdf.filter_id,
      f.name AS filter_name,
      fv.id AS filter_value_id,
      fv.value AS filter_value
    FROM sparepart_domain_filters sdf
    INNER JOIN catalog_filters f ON f.id = sdf.filter_id
    LEFT JOIN filter_values fv ON fv.filter_id = f.id
    ORDER BY sdf.domain_code ASC, sdf.sort_order ASC, f.name ASC, fv.value ASC
  `.catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return []
    }
    throw error
  })

  const compatibilityRowsPromise = prisma.productCompatibility.findMany({
    select: {
      part_product_id: true,
      target_product_id: true,
    },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return []
    }
    throw error
  })

  const [products, familyFilterLinks, sparepartFilterLinks, sparepartDomainFilterLinks, compatibilityRows] = await Promise.all([
    prisma.product.findMany({
      include: {
        brand: true,
        family: {
          include: { category: true },
        },
        specs: true,
        product_filter_values: {
          include: {
            filter_value: {
              include: { filter: true },
            },
          },
        },
      },
      orderBy: [{ category_id: 'asc' }, { family_id: 'asc' }, { name: 'asc' }],
    }),
    familyFilterLinksPromise,
    sparepartFilterLinksPromise,
    sparepartDomainFilterLinksPromise,
    compatibilityRowsPromise,
  ])

  const rows = products.map((product: typeof products[0]) => {
    const domain = detectDomain(product.family.category.name, product.family.name, product.name, product.type)
    return {
      product,
      domain,
      // Keep family buckets unique per brand to avoid cross-brand overwrite.
      seriesIdValue: `series-${product.brand.id}-${product.family.id}`,
    }
  })

  const filteredRows = rows.filter(({ product, domain, seriesIdValue }: typeof rows[0]) => {
    if (domainId && domainId !== domain.id) return false
    if (brandId && brandId !== String(product.brand.id)) return false
    if (seriesId && seriesId !== seriesIdValue) return false
    if (modelId && modelId !== String(product.id)) return false
    if (poe === 'true' && !product.poe) return false
    if (poe === 'false' && product.poe) return false
    if (inStock === 'true' && (!product.in_stock || product.stock_qty <= 0)) return false
    if (inStock === 'false' && product.in_stock && product.stock_qty > 0) return false

    const specsHaystack = product.specs.map((entry: typeof product.specs[0]) => `${entry.spec_key} ${entry.spec_value}`).join(' ').toLowerCase()
    if (spec && !specsHaystack.includes(spec)) return false

    if (!search) return true
    const haystack = `${product.name} ${product.brand.name} ${product.family.name} ${product.family.category.name} ${specsHaystack}`.toLowerCase()
    return haystack.includes(search)
  })

  const domains: Domain[] = Array.from(
    new Map(filteredRows.map((row: typeof filteredRows[0]) => [row.domain.id, row.domain])).values(),
  ).sort((a: Domain, b: Domain) => a.displayOrder - b.displayOrder)

  const brands: Brand[] = Array.from(
    new Map(
      filteredRows.map((row: typeof filteredRows[0]) => [
        row.product.brand.id,
        {
          id: String(row.product.brand.id),
          name: row.product.brand.name,
          logo: null,
          domainId: row.domain.id,
          sortOrder: row.product.brand.id,
        },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name))

  const series: Series[] = Array.from(
    new Map(
      filteredRows.map((row) => [
        row.seriesIdValue,
        {
          id: row.seriesIdValue,
          name: row.product.family.name,
          image: null,
          description: row.product.family.category.name,
          familyId: String(row.product.family.id),
          brandId: String(row.product.brand.id),
          domainId: row.domain.id,
          sortOrder: row.product.family.id,
        },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name))

  const models: Model[] = filteredRows.map((row) => ({
    id: String(row.product.id),
    name: row.product.name,
    reference: `PRD-${row.product.id}`,
    shortDescription: row.product.family.category.name,
    longDescription: row.product.type === 'STANDARD'
      ? row.product.specs.map((entry) => `${entry.spec_key}: ${entry.spec_value}`).join(' | ')
      : row.product.family.name,
    basePrice: Number(row.product.base_price),
    image: row.product.image_url,
    stockQty: row.product.stock_qty,
    status: row.product.in_stock && row.product.stock_qty > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
    condition: row.product.type,
    poe: row.product.poe,
    specs: row.product.specs.map((entry) => ({ key: entry.spec_key, value: entry.spec_value })),
    brandName: row.product.brand.name,
    familyName: row.product.family.name,
    categoryName: row.product.family.category.name,
    seriesId: row.seriesIdValue,
    brandId: String(row.product.brand.id),
    domainId: row.domain.id,
    filterValues: row.product.product_filter_values.map((entry) => ({
      filterId: entry.filter_value.filter_id,
      filterName: entry.filter_value.filter.name,
      valueId: entry.filter_value.id,
      value: entry.filter_value.value,
    })),
  }))

  const skus: Sku[] = filteredRows.map((row) => ({
    id: `sku-${row.product.id}`,
    sku: `SKU-${row.product.id}`,
    modelId: String(row.product.id),
    price: Number(row.product.base_price),
    stock: row.product.stock_qty,
    condition: row.product.type,
  }))

  const familyFilterMap = new Map<number, Map<string, Set<string>>>()
  familyFilterLinks.forEach((link) => {
    const filtersForFamily = familyFilterMap.get(link.family_id) ?? new Map<string, Set<string>>()
    const valuesForFilter = filtersForFamily.get(link.filter_name) ?? new Set<string>()

    if (link.filter_value) {
      valuesForFilter.add(link.filter_value)
    }

    filtersForFamily.set(link.filter_name, valuesForFilter)
    familyFilterMap.set(link.family_id, filtersForFamily)
  })

  const familyFilters: FamilyFilter[] = Array.from(familyFilterMap.entries()).map(([familyId, filtersMap]) => ({
    familyId: String(familyId),
    filters: Array.from(filtersMap.entries()).map(([name, values]) => ({
      name,
      values: Array.from(values.values()),
    })),
  }))

  const sparepartFilterMap = new Map<number, Map<number, { name: string; values: Array<{ id: number; value: string }> }>>()
  sparepartFilterLinks.forEach((link) => {
    const filtersForTarget = sparepartFilterMap.get(link.target_product_id) ?? new Map<number, { name: string; values: Array<{ id: number; value: string }> }>()
    const existing = filtersForTarget.get(link.filter_id) ?? { name: link.filter_name, values: [] }
    if (link.filter_value_id && link.filter_value) {
      existing.values.push({ id: link.filter_value_id, value: link.filter_value })
    }
    filtersForTarget.set(link.filter_id, existing)
    sparepartFilterMap.set(link.target_product_id, filtersForTarget)
  })

  const sparepartFilters = Array.from(sparepartFilterMap.entries()).map(([targetProductId, filtersMap]) => ({
    targetProductId: String(targetProductId),
    filters: Array.from(filtersMap.entries()).map(([id, filter]) => ({
      id,
      name: filter.name,
      values: filter.values,
    })),
  }))

  const sparepartDomainFilterMap = new Map<string, Map<number, { name: string; values: Array<{ id: number; value: string }> }>>()
  sparepartDomainFilterLinks.forEach((link) => {
    const filtersForDomain = sparepartDomainFilterMap.get(link.domain_code) ?? new Map<number, { name: string; values: Array<{ id: number; value: string }> }>()
    const existing = filtersForDomain.get(link.filter_id) ?? { name: link.filter_name, values: [] }
    if (link.filter_value_id && link.filter_value) {
      existing.values.push({ id: link.filter_value_id, value: link.filter_value })
    }
    filtersForDomain.set(link.filter_id, existing)
    sparepartDomainFilterMap.set(link.domain_code, filtersForDomain)
  })

  const sparepartDomainFilters = Array.from(sparepartDomainFilterMap.entries()).map(([domainCode, filtersMap]) => ({
    domainCode,
    filters: Array.from(filtersMap.entries()).map(([id, filter]) => ({
      id,
      name: filter.name,
      values: filter.values,
    })),
  }))

  const visibleProductIds = new Set(filteredRows.map((row) => row.product.id))
  const compatibilities: CompatibilityLink[] = compatibilityRows
    .filter((row) => visibleProductIds.has(row.part_product_id) && visibleProductIds.has(row.target_product_id))
    .map((row) => ({
      partProductId: String(row.part_product_id),
      targetProductId: String(row.target_product_id),
    }))

  return NextResponse.json({
    domains,
    brands,
    series,
    models,
    skus,
    familyFilters,
    compatibilities,
    sparepartFilters,
    sparepartDomainFilters,
  })
}
