import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

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
    const modelId = req.nextUrl.searchParams.get('modelId')

    const skus = await prisma.equipmentSku.findMany({
      where: {
        ...(modelId ? { modelId } : {}),
        ...(search
          ? {
              OR: [
                { reference: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { condition: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        model: { include: { brand: true } },
        attributeValues: true,
        _count: {
          select: { cartItems: true, orderItems: true },
        },
      },
      take: 100,
    })

    return NextResponse.json({ skus })
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

    if (!body.sku && !body.reference) return apiError('SKU requis')
    if (!body.modelId) return apiError('Modèle requis')
    const reference = String(body.reference ?? body.sku)

    const sku = await prisma.equipmentSku.create({
      data: {
        reference,
        name: String(body.name ?? reference),
        modelId: String(body.modelId),
        price: typeof body.price === 'number' ? body.price : 0,
        condition: (body.condition as string) || 'NEW',
        stockQty: typeof body.stock === 'number' ? body.stock : 0,
      },
      include: {
        model: { include: { brand: true } },
        _count: {
          select: { cartItems: true, orderItems: true },
        },
      },
    })

    return NextResponse.json({ sku }, { status: 201 })
  } catch (error) {
    const knownError = error as { code?: unknown; meta?: { target?: unknown } }
    const isUnique = knownError.code === 'P2002'
    const target = knownError.meta?.target
    if (isUnique && Array.isArray(target) && target.includes('reference')) {
      return apiError('Ce SKU existe déjà', 409)
    }
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}
