import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { parseDecimal, parseInteger, slugify } from '@/lib/equipment'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

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

function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorisé', 401)

    const search = req.nextUrl.searchParams.get('search')?.trim() || ''
    const seriesId = req.nextUrl.searchParams.get('seriesId')
    const brandId = req.nextUrl.searchParams.get('brandId')
    const domainId = req.nextUrl.searchParams.get('domainId')

    const models = await prisma.equipmentModel.findMany({
      where: {
        ...(seriesId ? { seriesId } : {}),
        ...(brandId ? { brandId } : {}),
        ...(domainId ? { domainId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                  { shortDescription: { contains: search, mode: 'insensitive' } },
                  { longDescription: { contains: search, mode: 'insensitive' } },
                  { reference: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: {
        series: true,
        brand: true,
        domain: true,
        images: {
          where: { skuId: null },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
        _count: {
          select: { skus: true, attributeValues: true },
        },
      },
      take: 50,
    })

    return NextResponse.json({
      models: models.map((model) => ({
        ...model,
        image: model.images[0]?.url ?? null,
      })),
    })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorisé', 401)

    const body = (await req.json()) as Record<string, unknown>

    if (!body.name) return apiError('Nom requis')
    if (!body.seriesId) return apiError('Série requise')
    if (!body.brandId) return apiError('Marque requise')
    if (!body.domainId) return apiError('Domaine requis')
    const name = String(body.name).trim()
    const slug = String(body.slug ?? `${slugify(name)}-${Date.now()}`)
    const reference = String(body.reference ?? `REF-${Date.now()}`)

    const model = await prisma.equipmentModel.create({
      data: {
        name,
        slug,
        reference,
        shortDescription: (body.shortDescription as string) || (body.description as string) || null,
        longDescription: (body.longDescription as string) || null,
        basePrice: parseDecimal(body.basePrice),
        stockQty: parseInteger(body.stockQty, 0),
        status: body.status === 'OUT_OF_STOCK' || body.status === 'DISCONTINUED' ? body.status : 'AVAILABLE',
        condition: (body.condition as string) || null,
        seriesId: String(body.seriesId),
        brandId: String(body.brandId),
        domainId: String(body.domainId),
        ...(body.image
          ? {
              images: {
                create: {
                  url: String(body.image),
                  alt: `${name} image`,
                  sortOrder: 0,
                },
              },
            }
          : {}),
      },
      include: {
        series: true,
        brand: true,
        domain: true,
        images: {
          where: { skuId: null },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
        _count: {
          select: { skus: true, attributeValues: true },
        },
      },
    })

    return NextResponse.json({ model }, { status: 201 })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}
