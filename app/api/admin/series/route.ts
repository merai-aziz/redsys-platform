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

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorisé', 401)

    const search = req.nextUrl.searchParams.get('search')?.trim() || ''
    const brandId = req.nextUrl.searchParams.get('brandId')
    const domainId = req.nextUrl.searchParams.get('domainId')

    const series = await prisma.equipmentSeries.findMany({
      where: {
        ...(brandId ? { brandId } : {}),
        ...(domainId ? { domainId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
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

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorisé', 401)

    const body = (await req.json()) as Record<string, unknown>

    if (!body.name) return apiError('Nom requis')
    if (!body.brandId) return apiError('Marque requise')
    if (!body.domainId) return apiError('Domaine requis')
    const name = String(body.name).trim()
    const slug = String(body.slug ?? slugify(name))

    const series = await prisma.equipmentSeries.create({
      data: {
        name,
        slug,
        description: (body.description as string) || null,
        brandId: String(body.brandId),
        domainId: String(body.domainId),
      },
      include: {
        brand: true,
        domain: true,
        _count: {
          select: { models: true },
        },
      },
    })

    return NextResponse.json({ series }, { status: 201 })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}
