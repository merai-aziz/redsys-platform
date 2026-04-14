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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorisé', 401)

    const { id } = await context.params
    if (!id) return apiError('ID manquant')

    const sku = await prisma.equipmentSku.findUnique({
      where: { id },
      include: {
        model: {
          include: {
            brand: true,
            domain: true,
            series: true,
          },
        },
        attributeValues: {
          include: {
            attributeDefinition: true,
          },
        },
        _count: {
          select: { cartItems: true, orderItems: true },
        },
      },
    })

    if (!sku) return apiError('SKU non trouvé', 404)

    return NextResponse.json({ sku })
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

    const sku = await prisma.equipmentSku.update({
      where: { id },
      data: {
        ...(body.sku ? { reference: String(body.sku) } : {}),
        ...(body.reference ? { reference: String(body.reference) } : {}),
        ...(body.name ? { name: String(body.name) } : {}),
        ...(typeof body.price === 'number' ? { price: body.price } : {}),
        ...(body.condition ? { condition: String(body.condition) } : {}),
        ...(typeof body.stock === 'number' ? { stockQty: body.stock } : {}),
      },
      include: {
        model: { include: { brand: true } },
        _count: {
          select: { cartItems: true, orderItems: true },
        },
      },
    })

    return NextResponse.json({ sku })
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

    const sku = await prisma.equipmentSku.findUnique({
      where: { id },
      select: {
        _count: {
          select: { cartItems: true, orderItems: true },
        },
      },
    })

    if (!sku) return apiError('SKU non trouvé', 404)

    if (sku._count.cartItems > 0 || sku._count.orderItems > 0) {
      return apiError('Impossible de supprimer un SKU avec des commandes associées', 400)
    }

    await prisma.equipmentSku.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return apiError('Erreur serveur', 500)
  }
}
