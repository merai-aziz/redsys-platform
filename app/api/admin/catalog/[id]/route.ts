import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { parseDecimal, parseInteger, slugify } from '@/lib/equipment'

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

async function serializeModelAsEquipment(id: string) {
  const model = await prisma.equipmentModel.findUnique({
    where: { id },
    include: {
      brand: true,
      domain: { select: { code: true, label: true } },
      series: { select: { id: true, name: true } },
      skus: true,
    },
  })

  if (!model) return null

  const quantity = model.skus.reduce((sum, sku) => sum + sku.stockQty, 0)
  return {
    id: model.id,
    name: model.name,
    slug: model.slug,
    reference: model.reference,
    description: model.shortDescription || model.longDescription || null,
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
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(req)
  if (!admin) return catalogError('Non autorisé', 401)

  const type = normalizeType(req.nextUrl.searchParams.get('type'))
  if (!type) return catalogError('Type manquant')

  const { id } = await context.params
  if (!id) return catalogError('ID manquant')

  try {
    const body = (await req.json()) as Record<string, unknown>

    if (type === 'brand') {
      const brand = await prisma.equipmentBrand.update({
        where: { id },
        data: {
          ...(body.name ? { name: String(body.name) } : {}),
          ...(body.slug ? { slug: String(body.slug) } : {}),
          ...(body.name && body.slug === undefined ? { slug: slugify(String(body.name)) } : {}),
          ...(body.logo === undefined ? {} : { logo: (body.logo as string) || null }),
          ...(body.description === undefined ? {} : { description: (body.description as string) || null }),
          ...(body.domainId ? { domainId: String(body.domainId) } : {}),
          ...(typeof body.sortOrder === 'number' ? { sortOrder: body.sortOrder } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive === true } : {}),
        },
      })
      return NextResponse.json({ brand })
    }

    if (type === 'category' || type === 'subcategory' || type === 'subsubcategory') {
      return catalogError('Les categories legacy ne sont plus supportees avec ce schema', 400)
    }

    const current = await prisma.equipmentModel.findUnique({
      where: { id },
      select: { brandId: true, domainId: true, seriesId: true },
    })
    if (!current) return catalogError('Equipement introuvable', 404)

    let nextBrandId = current.brandId
    let nextDomainId = current.domainId
    let nextSeriesId = current.seriesId

    if (body.brandId) {
      nextBrandId = String(body.brandId)
      const brand = await prisma.equipmentBrand.findUnique({
        where: { id: nextBrandId },
        select: { domainId: true },
      })
      if (!brand) return catalogError('Marque introuvable', 404)
      nextDomainId = brand.domainId

      const firstSeries = await prisma.equipmentSeries.findFirst({
        where: { brandId: nextBrandId },
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      })
      if (!firstSeries) return catalogError('Aucune serie disponible pour cette marque', 400)
      nextSeriesId = firstSeries.id
    }

    if (body.seriesId) {
      const requestedSeriesId = String(body.seriesId)
      const series = await prisma.equipmentSeries.findUnique({
        where: { id: requestedSeriesId },
        select: { id: true, brandId: true, domainId: true },
      })
      if (!series) return catalogError('Serie introuvable', 404)

      if (body.brandId && series.brandId !== nextBrandId) {
        return catalogError('La serie ne correspond pas a la marque selectionnee', 400)
      }

      nextSeriesId = series.id
      nextBrandId = series.brandId
      nextDomainId = series.domainId
    }

    await prisma.equipmentModel.update({
      where: { id },
      data: {
        ...(body.name ? { name: String(body.name) } : {}),
        ...(body.slug ? { slug: String(body.slug) } : {}),
        ...(body.name && body.slug === undefined ? { slug: slugify(String(body.name)) } : {}),
        ...(body.reference ? { reference: String(body.reference) } : {}),
        ...(body.description === undefined ? {} : { shortDescription: (body.description as string) || null }),
        ...(body.price !== undefined ? { basePrice: parseDecimal(body.price) } : {}),
        brandId: nextBrandId,
        domainId: nextDomainId,
        seriesId: nextSeriesId,
      },
    })

    if (body.quantity !== undefined || body.price !== undefined) {
      const firstSku = await prisma.equipmentSku.findFirst({
        where: { modelId: id },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })

      if (firstSku) {
        await prisma.equipmentSku.update({
          where: { id: firstSku.id },
          data: {
            ...(body.quantity !== undefined ? { stockQty: parseInteger(body.quantity, 0) } : {}),
            ...(body.price !== undefined ? { price: parseDecimal(body.price) } : {}),
          },
        })
      } else {
        const model = await prisma.equipmentModel.findUniqueOrThrow({
          where: { id },
          select: { name: true, reference: true },
        })
        await prisma.equipmentSku.create({
          data: {
            modelId: id,
            reference: `${model.reference}-SKU`,
            name: `${model.name} SKU`,
            stockQty: body.quantity !== undefined ? parseInteger(body.quantity, 0) : 0,
            price: body.price !== undefined ? parseDecimal(body.price) : null,
            condition: 'NEW',
          },
        })
      }
    }

    const equipment = await serializeModelAsEquipment(id)
    if (!equipment) return catalogError('Equipement introuvable', 404)

    return NextResponse.json({ equipment })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return catalogError('Valeur deja utilisee', 409)
    }
    console.error(error)
    return catalogError('Erreur serveur', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(req)
  if (!admin) return catalogError('Non autorisé', 401)

  const type = normalizeType(req.nextUrl.searchParams.get('type'))
  if (!type) return catalogError('Type manquant')

  const { id } = await context.params
  if (!id) return catalogError('ID manquant')

  try {
    if (type === 'brand') {
      await prisma.equipmentBrand.delete({ where: { id } })
      return NextResponse.json({ message: 'Marque supprimee' })
    }

    if (type === 'category' || type === 'subcategory' || type === 'subsubcategory') {
      return catalogError('Les categories legacy ne sont plus supportees avec ce schema', 400)
    }

    await prisma.equipmentModel.delete({ where: { id } })
    return NextResponse.json({ message: 'Equipement supprime' })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return catalogError('Suppression impossible car des elements dependent existent', 409)
    }
    console.error(error)
    return catalogError('Erreur serveur', 500)
  }
}
