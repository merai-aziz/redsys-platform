import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/equipment'

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

    const series = await prisma.equipmentSeries.findUnique({
      where: { id },
      include: {
        brand: true,
        domain: true,
        models: { orderBy: { name: 'asc' }, take: 30 },
        _count: {
          select: { models: true },
        },
      },
    })

    if (!series) return apiError('Série non trouvée', 404)

    return NextResponse.json({ series })
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

    const series = await prisma.equipmentSeries.update({
      where: { id },
      data: {
        ...(body.name ? { name: String(body.name) } : {}),
        ...(body.slug ? { slug: String(body.slug) } : {}),
        ...(body.name && body.slug === undefined ? { slug: slugify(String(body.name)) } : {}),
        ...(body.description !== undefined
          ? { description: (body.description as string) || null }
          : {}),
        ...(body.brandId ? { brandId: String(body.brandId) } : {}),
        ...(body.domainId ? { domainId: String(body.domainId) } : {}),
      },
      include: {
        brand: true,
        domain: true,
        _count: {
          select: { models: true },
        },
      },
    })

    return NextResponse.json({ series })
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

    const series = await prisma.equipmentSeries.findUnique({
      where: { id },
      select: {
        _count: { select: { models: true } },
      },
    })

    if (!series) return apiError('Série non trouvée', 404)

    if (series._count.models > 0) {
      return apiError('Impossible de supprimer une série avec des modèles associés', 400)
    }

    await prisma.equipmentSeries.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}
