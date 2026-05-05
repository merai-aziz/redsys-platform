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
      shippingAddress, // objet formulaire checkout
      subtotal,
      tax,
      shipping,
      total,
    } = body

    if (!items?.length) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 })
    }

    // Créer la commande + adresse + items en transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          status: 'PENDING',
          subtotal,
          tax,
          shipping,
          total,
          shippingMethod: shippingMethod ?? 'standard',
          paymentMethod: paymentMethod ?? 'bank',
          items: {
            create: items.map((item: {
              productId?: number
              quantity: number
              unitPrice: number
              lineTotal: number
              description?: string
            }) => ({
              productId: item.productId ?? null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              description: item.description ?? null,
            })),
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

      // Trouver tous les admins pour leur envoyer une notification
      const admins = await tx.user.findMany({
        where: { userRole: 'ADMIN', isActive: true },
        select: { id: true },
      })

      // Créer une notification pour chaque admin
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