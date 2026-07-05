// /app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = 20

    const where = {
      ...(status ? { status: status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' } : {}),
      ...(userId ? { userId } : {}),
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          shippingAddress: true,
          items: {
            include: {
              product: { select: { name: true, image_url: true, type: true } },
              selectedOptions: {
                include: {
                  configurationValue: {
                    include: {
                      configuration_option: { select: { name: true } },
                      standard_product: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    // ─── Formatage : même transformation que /api/orders pour que le front reçoive
    // optionName / valueName / groupName / price exploitables ───────────────────
    const formattedOrders = orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: item.product
          ? { name: item.product.name, image_url: item.product.image_url, type: item.product.type }
          : undefined,
        selectedOptions: item.selectedOptions.map((so) => ({
          id: so.id,
          // FIX : configurationValueId + quantity conservés pour permettre de relier
          // ces options ailleurs (ex: création de contrat de garantie à partir d'une commande)
          configurationValueId: so.configurationValueId,
          quantity: so.quantity,
          optionName: so.configurationValue.configuration_option.name,
          valueName: so.configurationValue.standard_product.name,
          groupName: so.configurationValue.group_name,
          price: so.configurationValue.price,
        })),
      })),
    }))

    return NextResponse.json({ orders: formattedOrders, total, page, limit })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}