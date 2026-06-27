// /app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        shippingAddress: true,
        items: {
          include: { product: { select: { name: true, image_url: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const {
      items,           // Array<{ productId, quantity, unitPrice, lineTotal, description }>
      shippingMethod,  // 'standard' | 'express'
      paymentMethod,   // string
      shippingAddress,
      shipping,        // frais de livraison (seule valeur acceptée du client — pas un prix produit)
    } = body

    if (!items?.length) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 })
    }

    // ─── Recalcul serveur des montants ───────────────────────────────────────
    // Récupérer les prix réels depuis la base pour tous les productId fournis
    const productIds = items
      .map((i: { productId?: number }) => i.productId)
      .filter((id: unknown): id is number => typeof id === 'number')

    const dbProducts = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, base_price: true },
        })
      : []

    const priceMap = new Map(dbProducts.map((p) => [p.id, Number(p.base_price)]))

    // Reconstruire chaque item avec le vrai prix unitaire
    const verifiedItems = items.map((item: {
      productId?: number
      quantity: number
      unitPrice: number
      lineTotal: number
      description?: string
    }) => {
      const serverUnitPrice = item.productId != null
        ? (priceMap.get(item.productId) ?? item.unitPrice)  // fallback si produit sans prix (item description-only)
        : item.unitPrice                                     // items sans productId (options textuelles configurateur)
      const qty = Math.max(1, Math.floor(item.quantity))
      return {
        productId: item.productId ?? null,
        quantity: qty,
        unitPrice: serverUnitPrice,
        lineTotal: serverUnitPrice * qty,
        description: item.description ?? null,
      }
    })

    // Recalcul des totaux
    const subtotal = verifiedItems.reduce((sum: number, i: { lineTotal: number }) => sum + i.lineTotal, 0)
    const tax = Math.round(subtotal * 0.2 * 100) / 100   // TVA 20% — même logique que le front
    const shippingCost = Number(shipping) || 0
    const total = subtotal + tax + shippingCost
    // ─────────────────────────────────────────────────────────────────────────

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          status: 'PENDING',
          subtotal,
          tax,
          shipping: shippingCost,
          total,
          shippingMethod: shippingMethod ?? 'standard',
          paymentMethod: paymentMethod ?? 'bank',
          items: {
            create: verifiedItems,
          },
          shippingAddress: {
            create: {
              email: shippingAddress.email,
              company: shippingAddress.company ?? null,
              firstName: shippingAddress.firstName,
              lastName: shippingAddress.lastName,
              address: shippingAddress.address,
              postalCode: shippingAddress.postalCode,
              city: shippingAddress.city,
              country: shippingAddress.country ?? 'France',
              phone: shippingAddress.phone,
              invoiceEmail: shippingAddress.invoiceEmail ?? null,
              vatNumber: shippingAddress.vatNumber ?? null,
              orderNumber: shippingAddress.orderNumber ?? null,
              neutralDelivery: shippingAddress.neutralDelivery ?? false,
            },
          },
        },
        include: {
          shippingAddress: true,
          items: true,
        },
      })

      const admins = await tx.user.findMany({
        where: { userRole: 'ADMIN', isActive: true },
        select: { id: true },
      })

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: 'Nouvelle commande reçue',
            message: `Le client ${user.firstName} ${user.lastName} vient de passer une commande de ${total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
            type: 'ORDER_STATUS_UPDATE' as const,
            referenceType: 'ORDER',
            referenceId: newOrder.id,
          })),
        })
      }

      return newOrder
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }
}