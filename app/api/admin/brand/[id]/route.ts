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

    const brand = await prisma.equipmentBrand.findUnique({
      where: { id },
      include: {
        domain: true,
        series: { orderBy: { name: 'asc' }, take: 20 },
        models: { orderBy: { name: 'asc' }, take: 20 },
        _count: {
          select: { series: true, models: true },
        },
      },
    })

    if (!brand) return apiError('Marque non trouvée', 404)

    return NextResponse.json({ brand })
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

    const brand = await prisma.equipmentBrand.update({
      where: { id },
      data: {
        ...(body.name ? { name: String(body.name) } : {}),
        ...(body.slug ? { slug: String(body.slug) } : {}),
        ...(body.name && body.slug === undefined ? { slug: slugify(String(body.name)) } : {}),
        ...(body.description !== undefined
          ? { description: (body.description as string) || null }
          : {}),
        ...(body.logo !== undefined ? { logo: (body.logo as string) || null } : {}),
        ...(body.domainId ? { domainId: String(body.domainId) } : {}),
      },
      include: {
        domain: true,
        _count: {
          select: { series: true, models: true },
        },
      },
    })

    return NextResponse.json({ brand })
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

    const brand = await prisma.equipmentBrand.findUnique({
      where: { id },
      select: {
        _count: { select: { series: true, models: true } },
      },
    })

    if (!brand) return apiError('Marque non trouvée', 404)

    if (brand._count.series > 0 || brand._count.models > 0) {
      return apiError('Impossible de supprimer une marque avec des données associées', 400)
    }

    await prisma.equipmentBrand.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}
