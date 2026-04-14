import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/equipment'

type CatalogType = 'brand' | 'category' | 'subcategory' | 'subsubcategory' | 'equipment'

type EquipmentType = 'SERVER' | 'STORAGE' | 'NETWORK' | 'COMPONENT'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

function normalizeType(value: string | null): CatalogType | null {
  switch (value) {
    case 'brand':
    case 'brands':
      return 'brand'
    case 'category':
    case 'categories':
      return 'category'
    case 'subcategory':
    case 'subcategories':
      return 'subcategory'
    case 'subsubcategory':
    case 'subsubcategories':
    case 'sub-subcategory':
      return 'subsubcategory'
    case 'equipment':
    case 'equipments':
      return 'equipment'
    default:
      return null
  }
}

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, accessSecret)
    if (payload.role !== 'ADMIN') return null
    return payload
  } catch {
    return null
  }
}

function catalogError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function inferEquipmentType(domain: { code: string; label: string } | null): EquipmentType {
  const source = `${domain?.code ?? ''} ${domain?.label ?? ''}`.toUpperCase()
  if (source.includes('STORAGE')) return 'STORAGE'
  if (source.includes('NETWORK')) return 'NETWORK'
  if (source.includes('COMPONENT')) return 'COMPONENT'
  return 'SERVER'
}

async function resolveDefaultDomainId() {
  const domain = await prisma.equipmentDomain.findFirst({ orderBy: { sortOrder: 'asc' }, select: { id: true } })
  return domain?.id || null
}

export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req)
  if (!admin) return catalogError('Non autorisé', 401)

  const type = normalizeType(req.nextUrl.searchParams.get('type'))
  if (!type) return catalogError('Type manquant')

  try {
    if (type === 'brand') {
      const brands = await prisma.equipmentBrand.findMany({
        orderBy: { name: 'asc' },
        include: { domain: true },
      })
      return NextResponse.json({ brands })
    }

    if (type === 'category') return NextResponse.json({ categories: [] })
    if (type === 'subcategory') return NextResponse.json({ subcategories: [] })
    if (type === 'subsubcategory') return NextResponse.json({ subsubcategories: [] })

    const search = req.nextUrl.searchParams.get('search')?.trim() || ''
    const domainId = req.nextUrl.searchParams.get('domainId') || undefined
    const brandId = req.nextUrl.searchParams.get('brandId') || undefined
    const seriesId = req.nextUrl.searchParams.get('seriesId') || undefined

    const models = await prisma.equipmentModel.findMany({
      where: {
        ...(domainId ? { domainId } : {}),
        ...(brandId ? { brandId } : {}),
        ...(seriesId ? { seriesId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { reference: { contains: search, mode: 'insensitive' } },
                { shortDescription: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        brand: true,
        domain: { select: { code: true, label: true } },
        series: { select: { id: true, name: true } },
        skus: { orderBy: { createdAt: 'asc' } },
      },
      take: 200,
    })

    const equipment = models.map((item) => {
      const quantity = item.skus.reduce((sum, sku) => sum + sku.stockQty, 0)
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        reference: item.reference,
        description: item.shortDescription || item.longDescription || null,
        photo: null,
        price: item.basePrice ? item.basePrice.toString() : null,
        quantity,
        status: quantity > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
        equipmentType: inferEquipmentType(item.domain),
        specs: [],
        domainId: item.domainId,
        brandId: item.brandId,
        seriesId: item.seriesId,
        domain: item.domain,
        brand: item.brand,
        series: item.series,
      }
    })

    return NextResponse.json({ equipment })
  } catch (error) {
    console.error(error)
    return catalogError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin(req)
  if (!admin) return catalogError('Non autorisé', 401)

  const type = normalizeType(req.nextUrl.searchParams.get('type'))
  if (!type) return catalogError('Type manquant')

  try {
    const body = (await req.json()) as Record<string, unknown>

    if (type === 'brand') {
      if (!body.name) return catalogError('Nom requis')
      const domainId = body.domainId ? String(body.domainId) : await resolveDefaultDomainId()
      if (!domainId) return catalogError('Aucun domaine disponible pour creer la marque', 400)

      const name = String(body.name).trim()
      const brand = await prisma.equipmentBrand.create({
        data: {
          name,
          slug: String(body.slug ?? slugify(name)),
          logo: (body.logo as string) || null,
          description: (body.description as string) || null,
          domainId,
        },
      })
      return NextResponse.json({ brand }, { status: 201 })
    }

    if (type === 'category' || type === 'subcategory' || type === 'subsubcategory') {
      return catalogError('Les categories legacy ne sont plus supportees avec ce schema', 400)
    }

    if (!body.name || !body.reference || !body.brandId) {
      return catalogError('Champs obligatoires manquants')
    }

    const brand = await prisma.equipmentBrand.findUnique({
      where: { id: String(body.brandId) },
      select: { id: true, domainId: true },
    })
    if (!brand) return catalogError('Marque introuvable', 404)

    const seriesId = body.seriesId
      ? String(body.seriesId)
      : (
          await prisma.equipmentSeries.findFirst({
            where: { brandId: brand.id },
            orderBy: { sortOrder: 'asc' },
            select: { id: true },
          })
        )?.id

    if (!seriesId) return catalogError('Aucune serie disponible pour cette marque', 400)

    const model = await prisma.equipmentModel.create({
      data: {
        name: String(body.name),
        slug: String(body.slug ?? slugify(String(body.name))),
        reference: String(body.reference),
        shortDescription: (body.description as string) || null,
        basePrice: typeof body.price === 'number' ? body.price : null,
        brandId: brand.id,
        domainId: brand.domainId,
        seriesId,
      },
      include: {
        brand: true,
        domain: { select: { code: true, label: true } },
        series: { select: { id: true, name: true } },
        skus: true,
      },
    })

    const initialStock = typeof body.quantity === 'number' ? body.quantity : 0
    if (initialStock > 0 || typeof body.price === 'number') {
      await prisma.equipmentSku.create({
        data: {
          modelId: model.id,
          reference: `${model.reference}-SKU`,
          name: `${model.name} SKU`,
          price: typeof body.price === 'number' ? body.price : null,
          stockQty: initialStock,
          condition: 'NEW',
        },
      })
    }

    const quantity = initialStock
    const equipment = {
      id: model.id,
      name: model.name,
      slug: model.slug,
      reference: model.reference,
      description: model.shortDescription,
      photo: null,
      price: model.basePrice ? model.basePrice.toString() : null,
      quantity,
      status: quantity > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
      equipmentType: inferEquipmentType(model.domain),
      specs: [],
      domainId: model.domainId,
      brandId: model.brandId,
      seriesId: model.seriesId,
      domain: model.domain,
      brand: model.brand,
      series: model.series,
    }

    return NextResponse.json({ equipment }, { status: 201 })
  } catch (error) {
    console.error(error)
    return catalogError('Erreur serveur', 500)
  }
}
