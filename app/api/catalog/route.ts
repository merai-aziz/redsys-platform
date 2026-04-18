import { NextResponse } from 'next/server'

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
  brandId: string
  domainId: string
  sortOrder: number
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
  seriesId: string
  brandId: string
  domainId: string
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

  const products = await prisma.product.findMany({
    include: {
      brand: true,
      family: {
        include: { category: true },
      },
      specs: true,
    },
    orderBy: [{ category_id: 'asc' }, { family_id: 'asc' }, { name: 'asc' }],
  })

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
    seriesId: row.seriesIdValue,
    brandId: String(row.product.brand.id),
    domainId: row.domain.id,
  }))

  const skus: Sku[] = filteredRows.map((row) => ({
    id: `sku-${row.product.id}`,
    sku: `SKU-${row.product.id}`,
    modelId: String(row.product.id),
    price: Number(row.product.base_price),
    stock: row.product.stock_qty,
    condition: row.product.type,
  }))

  return NextResponse.json({ domains, brands, series, models, skus })
}
