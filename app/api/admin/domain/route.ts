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

    const domains = await prisma.equipmentDomain.findMany({
      where: search
        ? {
            OR: [
              { label: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { brands: true, series: true, models: true },
        },
      },
    })

    return NextResponse.json({ domains })
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
    const rawLabel = String(body.label ?? body.name ?? '').trim()
    if (!rawLabel) return apiError('Nom requis')

    const generatedSlug = slugify(rawLabel)
    const generatedCode = generatedSlug.replace(/-/g, '_').toUpperCase()

    const domain = await prisma.equipmentDomain.create({
      data: {
        label: rawLabel,
        code: String(body.code ?? generatedCode),
        slug: String(body.slug ?? generatedSlug),
        icon: (body.icon as string) || null,
        sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      },
      include: {
        _count: {
          select: { brands: true, series: true, models: true },
        },
      },
    })

    return NextResponse.json({ domain }, { status: 201 })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}
