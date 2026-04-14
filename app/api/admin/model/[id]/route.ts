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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorisé', 401)

    const { id } = await context.params
    if (!id) return apiError('ID manquant')

    const model = await prisma.equipmentModel.findUnique({
      where: { id },
      include: {
        series: true,
        brand: true,
        domain: true,
        images: {
          where: { skuId: null },
          orderBy: { sortOrder: 'asc' },
        },
        skus: { take: 50 },
        attributeValues: { include: { attributeDefinition: true } },
        _count: {
          select: { skus: true, attributeValues: true },
        },
      },
    })

    if (!model) return apiError('Modèle non trouvé', 404)

    return NextResponse.json({ model })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorisé', 401)

    const { id } = await context.params
    if (!id) return apiError('ID manquant')

    const body = (await req.json()) as Record<string, unknown>

    const model = await prisma.equipmentModel.update({
      where: { id },
      data: {
        ...(body.name ? { name: String(body.name) } : {}),
        ...(body.slug ? { slug: String(body.slug) } : {}),
        ...(body.name && body.slug === undefined ? { slug: slugify(String(body.name)) } : {}),
        ...(body.reference ? { reference: String(body.reference) } : {}),
        ...(body.description !== undefined
          ? { shortDescription: (body.description as string) || null }
          : {}),
        ...(body.shortDescription !== undefined
          ? { shortDescription: (body.shortDescription as string) || null }
          : {}),
        ...(body.longDescription !== undefined
          ? { longDescription: (body.longDescription as string) || null }
          : {}),
        ...(body.basePrice !== undefined ? { basePrice: parseDecimal(body.basePrice) } : {}),
        ...(body.stockQty !== undefined ? { stockQty: parseInteger(body.stockQty, 0) } : {}),
        ...(body.status === 'AVAILABLE' || body.status === 'OUT_OF_STOCK' || body.status === 'DISCONTINUED'
          ? { status: body.status }
          : {}),
        ...(body.condition !== undefined ? { condition: (body.condition as string) || null } : {}),
        ...(body.seriesId ? { seriesId: String(body.seriesId) } : {}),
        ...(body.brandId ? { brandId: String(body.brandId) } : {}),
        ...(body.domainId ? { domainId: String(body.domainId) } : {}),
      },
      include: {
        series: true,
        brand: true,
        domain: true,
        images: {
          where: { skuId: null },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { skus: true, attributeValues: true },
        },
      },
    })

    if (body.image !== undefined) {
      const imageUrl = String(body.image ?? '').trim()
      const existing = await prisma.equipmentImage.findFirst({
        where: { modelId: id, skuId: null },
        orderBy: { sortOrder: 'asc' },
      })

      if (!imageUrl) {
        await prisma.equipmentImage.deleteMany({
          where: { modelId: id, skuId: null },
        })
      } else if (existing) {
        await prisma.equipmentImage.update({
          where: { id: existing.id },
          data: { url: imageUrl },
        })
      } else {
        await prisma.equipmentImage.create({
          data: {
            modelId: id,
            url: imageUrl,
            alt: `${model.name} image`,
            sortOrder: 0,
          },
        })
      }
    }

    const updatedModel = await prisma.equipmentModel.findUnique({
      where: { id },
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

    return NextResponse.json({ model: updatedModel ?? model })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorisé', 401)

    const { id } = await context.params
    if (!id) return apiError('ID manquant')

    const model = await prisma.equipmentModel.findUnique({
      where: { id },
      select: {
        _count: {
          select: { skus: true, attributeValues: true },
        },
      },
    })

    if (!model) return apiError('Modèle non trouvé', 404)

    if (model._count.skus > 0) {
      return apiError('Impossible de supprimer un modèle avec des SKU associés', 400)
    }

    await prisma.equipmentModel.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}
