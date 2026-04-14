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

    const domain = await prisma.equipmentDomain.findUnique({
      where: { id },
      include: {
        brands: { orderBy: { name: 'asc' } },
        series: { orderBy: { name: 'asc' } },
        models: { orderBy: { name: 'asc' }, take: 10 },
        _count: {
          select: { brands: true, series: true, models: true },
        },
      },
    })

    if (!domain) return apiError('Domaine non trouvé', 404)

    return NextResponse.json({ domain })
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
    const nextLabel = body.label ?? body.name
    const normalizedLabel = typeof nextLabel === 'string' ? nextLabel.trim() : undefined

    const domain = await prisma.equipmentDomain.update({
      where: { id },
      data: {
        ...(normalizedLabel ? { label: normalizedLabel } : {}),
        ...(body.code ? { code: String(body.code) } : {}),
        ...(body.slug ? { slug: String(body.slug) } : {}),
        ...(normalizedLabel && body.slug === undefined ? { slug: slugify(normalizedLabel) } : {}),
        ...(body.icon !== undefined ? { icon: (body.icon as string) || null } : {}),
        ...(typeof body.sortOrder === 'number' ? { sortOrder: body.sortOrder } : {}),
        ...(typeof body.displayOrder === 'number' ? { sortOrder: body.displayOrder } : {}),
        ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
      },
      include: {
        _count: {
          select: { brands: true, series: true, models: true },
        },
      },
    })

    return NextResponse.json({ domain })
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

    const domain = await prisma.equipmentDomain.findUnique({
      where: { id },
      select: {
        _count: { select: { brands: true, series: true, models: true } },
      },
    })

    if (!domain) return apiError('Domaine non trouvé', 404)

    if (
      domain._count.brands > 0 ||
      domain._count.series > 0 ||
      domain._count.models > 0
    ) {
      return apiError('Impossible de supprimer un domaine avec des données associées', 400)
    }

    await prisma.equipmentDomain.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}
