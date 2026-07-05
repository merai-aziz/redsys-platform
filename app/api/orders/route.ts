import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { notifyStockThresholdCrossings } from '@/lib/stock-alerts'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
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
    })

    // ─── Formatage : on transforme selectedOptions en forme exploitable par le front ───
    const formattedOrders = orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: item.product
          ? { name: item.product.name, image_url: item.product.image_url, type: item.product.type }
          : undefined,
        selectedOptions: item.selectedOptions.map((so) => ({
          id: so.id,
          optionName: so.configurationValue.configuration_option.name,
          valueName: so.configurationValue.standard_product.name,
          groupName: so.configurationValue.group_name,
          price: so.configurationValue.price,
        })),
      })),
    }))

    return NextResponse.json({ orders: formattedOrders })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── Types du payload entrant ───────────────────────────────────────────────
type IncomingSelectedOption = {
  configurationValueId?: number
  quantity?: number
}

type IncomingItem = {
  productId?: number
  quantity: number
  unitPrice: number
  description?: string
  selectedOptions?: IncomingSelectedOption[]
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { items, shippingMethod, paymentMethod, shippingAddress, shipping } = body

    if (!items?.length) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 })
    }

    const rawItems = items as IncomingItem[]

    // ─── Recalcul serveur des prix ────────────────────────────────────────────
    const productIds = rawItems
      .map((i) => i.productId)
      .filter((id): id is number => typeof id === 'number')

    const dbProducts = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            base_price: true,
            stock_qty: true,
            name: true,
            type: true,
          },
        })
      : []

    const priceMap = new Map(dbProducts.map((p) => [p.id, Number(p.base_price)]))
    const stockMap = new Map(dbProducts.map((p) => [p.id, p.stock_qty]))
    const nameMap = new Map(dbProducts.map((p) => [p.id, p.name]))
    const typeMap = new Map(dbProducts.map((p) => [p.id, p.type]))

    // ─── FIX PRIX : prix unitaire réel de chaque configurationValue sélectionnée ──
    // priceMap ne contient que base_price ; sans ça, le prix des options était ignoré
    // dans le montant enregistré en base (unitPrice/lineTotal/subtotal/tax/total).
    const allSelectedConfigValueIds = Array.from(
      new Set(
        rawItems.flatMap((item) =>
          (item.selectedOptions ?? [])
            .filter((o): o is Required<Pick<IncomingSelectedOption, 'configurationValueId'>> & IncomingSelectedOption =>
              typeof o.configurationValueId === 'number',
            )
            .map((o) => o.configurationValueId!),
        ),
      ),
    )

    const configValuePriceRows = allSelectedConfigValueIds.length
      ? await prisma.configurationValue.findMany({
          where: { id: { in: allSelectedConfigValueIds } },
          select: { id: true, price: true },
        })
      : []

    const configValuePriceMap = new Map(configValuePriceRows.map((cv) => [cv.id, Number(cv.price)]))

    // ─── Regrouper les quantités demandées par productId ─────────────────────
    const requestedQtyMap = new Map<number, number>()
    for (const item of rawItems) {
      if (item.productId == null) continue
      const qty = Math.max(1, Math.floor(item.quantity))
      requestedQtyMap.set(item.productId, (requestedQtyMap.get(item.productId) ?? 0) + qty)
    }

    // ─── FIX : options réellement sélectionnées, par produit configurable ────
    // Map<productId configurable, Map<configurationValueId, quantité totale demandée>>
    const selectedOptionsByProduct = new Map<number, Map<number, number>>()
    for (const item of rawItems) {
      if (item.productId == null || !item.selectedOptions?.length) continue
      const itemQty = Math.max(1, Math.floor(item.quantity))
      const productMap = selectedOptionsByProduct.get(item.productId) ?? new Map<number, number>()
      for (const opt of item.selectedOptions) {
        if (typeof opt.configurationValueId !== 'number') continue
        const optQty = Math.max(1, Math.floor(opt.quantity ?? 1))
        const totalQty = itemQty * optQty
        productMap.set(opt.configurationValueId, (productMap.get(opt.configurationValueId) ?? 0) + totalQty)
      }
      selectedOptionsByProduct.set(item.productId, productMap)
    }

    console.log('[ORDERS] Quantités demandées:', Object.fromEntries(requestedQtyMap))
    console.log(
      '[ORDERS] Options sélectionnées:',
      JSON.stringify(Object.fromEntries(Array.from(selectedOptionsByProduct.entries()).map(([k, v]) => [k, Object.fromEntries(v)]))),
    )

    // ─── Vérification stock AVANT transaction ────────────────────────────────
    const outOfStockErrors: string[] = []

    for (const [productId, qtyRequested] of requestedQtyMap) {
      const productType = typeMap.get(productId)
      const productName = nameMap.get(productId) ?? `Produit #${productId}`

      if (productType === 'CONFIGURABLE') {
        const chosen = selectedOptionsByProduct.get(productId)

        if (!chosen || chosen.size === 0) {
          outOfStockErrors.push(`"${productName}" : configuration incomplète (aucune option sélectionnée reçue)`)
          continue
        }

        const configValueIds = Array.from(chosen.keys())
        const configValues = await prisma.configurationValue.findMany({
          where: { id: { in: configValueIds }, configuration_option: { product_id: productId } },
          select: {
            id: true,
            standard_product_id: true,
            standard_product: { select: { stock_qty: true, name: true } },
          },
        })
        const byId = new Map(configValues.map((cv) => [cv.id, cv]))

        for (const [configValueId, qtyNeeded] of chosen) {
          const cv = byId.get(configValueId)
          if (!cv || !cv.standard_product) {
            outOfStockErrors.push(`"${productName}" : option invalide (#${configValueId})`)
            continue
          }
          console.log(
            `[ORDERS] CONFIGURABLE "${productName}" option "${cv.standard_product.name}" : stock=${cv.standard_product.stock_qty}, demandé=${qtyNeeded}`,
          )
          if (cv.standard_product.stock_qty < qtyNeeded) {
            outOfStockErrors.push(
              `"${productName}" — option "${cv.standard_product.name}" : stock disponible ${cv.standard_product.stock_qty}, demandé ${qtyNeeded}`,
            )
          }
        }
      } else {
        const available = stockMap.get(productId) ?? 0
        console.log(
          `[ORDERS] STANDARD "${productName}" : stock=${available}, demandé=${qtyRequested}`,
        )

        if (available < qtyRequested) {
          outOfStockErrors.push(
            `"${productName}" : stock disponible ${available}, demandé ${qtyRequested}`,
          )
        }
      }
    }

    if (outOfStockErrors.length > 0) {
      return NextResponse.json(
        { error: 'Stock insuffisant pour certains articles', details: outOfStockErrors },
        { status: 409 },
      )
    }

    // ─── Construire les items vérifiés ────────────────────────────────────────
    // ✅ FIX STOCK : on nest les options réellement choisies pour CHAQUE item (pas la map agrégée)
    // afin qu'elles soient persistées en base via OrderItemOption.
    // ✅ FIX PRIX : serverUnitPrice pour un produit CONFIGURABLE = base_price + Σ(prix option × qté option),
    // recalculé à partir de configValuePriceMap (source de vérité serveur), jamais depuis item.unitPrice envoyé par le client.
    const verifiedItems = rawItems.map((item) => {
      const productType = item.productId != null ? typeMap.get(item.productId) : undefined
      const validOptions = (item.selectedOptions ?? []).filter(
        (o): o is Required<Pick<IncomingSelectedOption, 'configurationValueId'>> & IncomingSelectedOption =>
          typeof o.configurationValueId === 'number',
      )

      const baseServerPrice =
        item.productId != null ? (priceMap.get(item.productId) ?? item.unitPrice) : item.unitPrice

      const optionsPriceTotal =
        productType === 'CONFIGURABLE'
          ? validOptions.reduce((sum, o) => {
              const unitOptionPrice = configValuePriceMap.get(o.configurationValueId!) ?? 0
              const optQty = Math.max(1, Math.floor(o.quantity ?? 1))
              return sum + unitOptionPrice * optQty
            }, 0)
          : 0

      const serverUnitPrice = baseServerPrice + optionsPriceTotal
      const qty = Math.max(1, Math.floor(item.quantity))

      const optionsNested =
        productType === 'CONFIGURABLE' && validOptions.length > 0
          ? {
              selectedOptions: {
                create: validOptions.map((o) => ({
                  configurationValueId: o.configurationValueId!,
                  quantity: Math.max(1, Math.floor(o.quantity ?? 1)),
                })),
              },
            }
          : {}

      return {
        productId: item.productId ?? null,
        quantity: qty,
        unitPrice: serverUnitPrice,
        lineTotal: serverUnitPrice * qty,
        description: item.description ?? null,
        ...optionsNested,
      }
    })

    const subtotal = verifiedItems.reduce((sum, i) => sum + i.lineTotal, 0)
    const tax = Math.round(subtotal * 0.2 * 100) / 100
    const shippingCost = Number(shipping) || 0
    const total = subtotal + tax + shippingCost

    // ─── FIX : IDs des produits STANDARD réellement affectés ──────────────────
    const allAffectedStandardIds = new Set<number>()
    for (const [id] of requestedQtyMap) {
      if (typeMap.get(id) !== 'CONFIGURABLE') {
        allAffectedStandardIds.add(id)
      }
    }
    const allConfigValueIds = Array.from(selectedOptionsByProduct.values()).flatMap((m) => Array.from(m.keys()))
    const resolvedConfigValues = allConfigValueIds.length
      ? await prisma.configurationValue.findMany({
          where: { id: { in: allConfigValueIds } },
          select: { id: true, standard_product_id: true },
        })
      : []
    for (const cv of resolvedConfigValues) {
      allAffectedStandardIds.add(cv.standard_product_id)
    }

    // ─── Snapshots AVANT — uniquement les produits STANDARD réels ─────────────
    const stocksBefore = await prisma.product.findMany({
      where: { id: { in: Array.from(allAffectedStandardIds) } },
      select: { id: true, name: true, stock_qty: true },
    })

    for (const [productId] of requestedQtyMap) {
      if (typeMap.get(productId) === 'CONFIGURABLE') {
        const options = await prisma.configurationValue.findMany({
          where: { configuration_option: { product_id: productId } },
          select: { standard_product: { select: { stock_qty: true } } },
        })
        const totalBefore = options.reduce((sum, opt) => sum + (opt.standard_product?.stock_qty ?? 0), 0)
        stocksBefore.push({
          id: productId,
          name: nameMap.get(productId) ?? `Produit #${productId}`,
          stock_qty: totalBefore,
        })
      }
    }

    console.log('[ORDERS] 📦 Stocks AVANT commande:', JSON.stringify(stocksBefore))

    // ─── TRANSACTION : Décrémentation + création commande ────────────────────
    const { order, stocksAfter } = await prisma.$transaction(async (tx) => {
      for (const [productId, qtyRequested] of requestedQtyMap) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { stock_qty: true, name: true, type: true },
        })

        if (!product) {
          console.log(`[ORDERS] ⚠️ Produit #${productId} non trouvé, ignoré`)
          continue
        }

        console.log(
          `[ORDERS] 🔄 Traitement: "${product.name}" (${product.type}) | à décrémenter=${qtyRequested}`,
        )

        if (product.type === 'CONFIGURABLE') {
          const chosen = selectedOptionsByProduct.get(productId)
          if (!chosen || chosen.size === 0) {
            throw new Error(`STOCK_CONFLICT:${product.name}:0:${qtyRequested}`)
          }

          const configValueIds = Array.from(chosen.keys())
          const configValues = await tx.configurationValue.findMany({
            where: { id: { in: configValueIds }, configuration_option: { product_id: productId } },
            select: {
              id: true,
              standard_product_id: true,
              standard_product: { select: { stock_qty: true, name: true } },
            },
          })
          const byId = new Map(configValues.map((cv) => [cv.id, cv]))

          for (const [configValueId, qtyNeeded] of chosen) {
            const cv = byId.get(configValueId)
            if (!cv || !cv.standard_product) {
              throw new Error(`STOCK_CONFLICT:${product.name}:0:${qtyNeeded}`)
            }
            if (cv.standard_product.stock_qty < qtyNeeded) {
              throw new Error(
                `STOCK_CONFLICT:${product.name} (option ${cv.standard_product.name}):${cv.standard_product.stock_qty}:${qtyNeeded}`,
              )
            }

            const newQty = cv.standard_product.stock_qty - qtyNeeded
            console.log(
              `[ORDERS]   └─ Option "${cv.standard_product.name}" (ID:${cv.standard_product_id}) : ${cv.standard_product.stock_qty} → ${newQty}`,
            )

            await tx.product.update({
              where: { id: cv.standard_product_id },
              data: { stock_qty: newQty, in_stock: newQty > 0 },
            })
          }
        } else {
          if (product.stock_qty < qtyRequested) {
            throw new Error(
              `STOCK_CONFLICT:${product.name}:${product.stock_qty}:${qtyRequested}`,
            )
          }

          const newStockQty = product.stock_qty - qtyRequested
          console.log(
            `[ORDERS]   └─ STANDARD "${product.name}" : ${product.stock_qty} → ${newStockQty}`,
          )

          await tx.product.update({
            where: { id: productId },
            data: { stock_qty: newStockQty, in_stock: newStockQty > 0 },
          })
        }
      }

      // ─── Créer la commande (avec les options imbriquées par item) ─────────
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
          items: { create: verifiedItems },
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
        include: { shippingAddress: true, items: true },
      })

      const updatedProducts = await tx.product.findMany({
        where: { id: { in: Array.from(allAffectedStandardIds) } },
        select: { id: true, name: true, stock_qty: true },
      })

      console.log('[ORDERS] 📦 Stocks APRÈS transaction:', JSON.stringify(updatedProducts))

      return { order: newOrder, stocksAfter: updatedProducts }
    })

    for (const [productId] of requestedQtyMap) {
      if (typeMap.get(productId) === 'CONFIGURABLE') {
        const options = await prisma.configurationValue.findMany({
          where: { configuration_option: { product_id: productId } },
          select: { standard_product: { select: { stock_qty: true } } },
        })
        const totalAfter = options.reduce((sum, opt) => sum + (opt.standard_product?.stock_qty ?? 0), 0)
        stocksAfter.push({
          id: productId,
          name: nameMap.get(productId) ?? `Produit #${productId}`,
          stock_qty: totalAfter,
        })
      }
    }

    console.log('[ORDERS] ✅ Commande créée avec id:', order.id)

    // ─── NOTIFICATIONS (hors transaction) ────────────────────────────────────
    const admins = await prisma.user.findMany({
      where: { userRole: 'ADMIN', isActive: true },
      select: { id: true },
    })

    const orderNotifications = admins.map((admin) => ({
      userId: admin.id,
      title: '🛒 Nouvelle commande reçue',
      message: `Le client ${user.firstName} ${user.lastName} vient de passer une commande de ${total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
      type: 'ORDER_STATUS_UPDATE' as const,
      referenceType: 'ORDER',
      referenceId: order.id,
    }))

    if (orderNotifications.length > 0) {
      await prisma.notification.createMany({ data: orderNotifications })
      console.log(
        `[ORDERS] 📨 ${orderNotifications.length} notification(s) "nouvelle commande" créée(s)`,
      )
    }

    console.log('[ORDERS] 🔔 Vérification des alertes stock...')
    console.log('[ORDERS] before:', JSON.stringify(stocksBefore))
    console.log('[ORDERS] after:', JSON.stringify(stocksAfter))

    await notifyStockThresholdCrossings(stocksBefore, stocksAfter)

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('STOCK_CONFLICT:')) {
      const [, name, available, requested] = error.message.split(':')
      return NextResponse.json(
        {
          error: 'Stock insuffisant (conflit de commande simultanée)',
          details: [`"${name}" : stock disponible ${available}, demandé ${requested}`],
        },
        { status: 409 },
      )
    }
    console.error('❌ POST /api/orders error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande' },
      { status: 500 },
    )
  }
}