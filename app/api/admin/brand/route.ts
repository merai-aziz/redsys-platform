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
    const domainId = req.nextUrl.searchParams.get('domainId')

    const brands = await prisma.equipmentBrand.findMany({
      where: {
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
        domain: true,
        _count: {
          select: { series: true, models: true },
        },
      },
    })

    return NextResponse.json({ brands })
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
    if (!body.domainId) return apiError('Domaine requis')
    const name = String(body.name).trim()
    const slug = String(body.slug ?? slugify(name))

    const brand = await prisma.equipmentBrand.create({
      data: {
        name,
        slug,
        description: (body.description as string) || null,
        logo: (body.logo as string) || null,
        domainId: String(body.domainId),
      },
      include: {
        domain: true,
        _count: {
          select: { series: true, models: true },
        },
      },
    })

    return NextResponse.json({ brand }, { status: 201 })
  } catch (error) {
    const knownError = error as { code?: unknown; meta?: { target?: unknown } }
    const isUnique = knownError.code === 'P2002'
    const target = knownError.meta?.target
    if (isUnique && Array.isArray(target) && target.includes('slug')) {
      return apiError('Cette marque existe déjà', 409)
    }
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}
