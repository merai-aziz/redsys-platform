import { prisma } from '@/lib/prisma'

/**
 * Seuil unique de stock faible — doit correspondre à la valeur par défaut
 * de la page admin (AdminStockPage utilise 5 par défaut).
 */
export const LOW_STOCK_THRESHOLD = 5

export type StockSnapshot = {
  id: number
  name: string
  stock_qty: number
}

/**
 * ✅ FIX : déduplique une liste de snapshots par id.
 * En cas de doublon (ex: un appelant qui insère deux fois le même produit),
 * on garde la DERNIÈRE occurrence — c'est un filet de sécurité, la vraie
 * correction est de ne plus produire de doublons côté appelant (orders/route.ts).
 */
function dedupeById(list: StockSnapshot[]): StockSnapshot[] {
  const map = new Map<number, StockSnapshot>()
  for (const item of list) {
    map.set(item.id, item)
  }
  return Array.from(map.values())
}

/**
 * Notifie les administrateurs lors du franchissement du seuil de stock.
 *
 * Fonctionne pour STANDARD et CONFIGURABLE :
 * - STANDARD  : snapshot direct du produit
 * - CONFIGURABLE : snapshot calculé (somme des options) — injecté par l'appelant
 *
 * Règle de déclenchement : le stock AVANT était > seuil et le stock APRÈS est <= seuil.
 * Un franchissement dans l'autre sens (réapprovisionnement) ne génère pas d'alerte.
 */
export async function notifyStockThresholdCrossings(
  beforeRaw: StockSnapshot[],
  afterRaw: StockSnapshot[],
): Promise<void> {
  const before = dedupeById(beforeRaw)
  const after = dedupeById(afterRaw)

  console.log('[STOCK-ALERT] 🚀 Début de la vérification')
  console.log('[STOCK-ALERT] before (dédupliqué):', JSON.stringify(before))
  console.log('[STOCK-ALERT] after (dédupliqué):', JSON.stringify(after))

  if (before.length === 0 && after.length === 0) {
    console.log('[STOCK-ALERT] ⚠️ Aucun produit à vérifier')
    return
  }

  const beforeMap = new Map(before.map((p) => [p.id, p.stock_qty]))

  const crossed = after.filter((p) => {
    const previousQty = beforeMap.get(p.id)

    // Produit absent du snapshot "before" : alerte si stock déjà bas
    if (previousQty === undefined) {
      const isLow = p.stock_qty <= LOW_STOCK_THRESHOLD
      if (isLow) {
        console.log(
          `[STOCK-ALERT] 📦 Nouveau produit "${p.name}" (ID:${p.id}) : stock=${p.stock_qty} (<= seuil ${LOW_STOCK_THRESHOLD}) → ALERTE`,
        )
      }
      return isLow
    }

    // Franchissement de seuil descendant uniquement
    const wasAboveThreshold = previousQty > LOW_STOCK_THRESHOLD
    const isAtOrBelowThreshold = p.stock_qty <= LOW_STOCK_THRESHOLD
    const isCrossing = wasAboveThreshold && isAtOrBelowThreshold

    console.log(
      `[STOCK-ALERT] 📦 "${p.name}" (ID:${p.id}) : ${previousQty} → ${p.stock_qty} | seuil=${LOW_STOCK_THRESHOLD} | franchissement=${isCrossing ? '✅ OUI' : '❌ NON'}`,
    )

    return isCrossing
  })

  if (crossed.length === 0) {
    console.log('[STOCK-ALERT] ✅ Aucun franchissement de seuil détecté')
    return
  }

  console.log(
    `[STOCK-ALERT] 🔔 ${crossed.length} produit(s) ont franchi le seuil:`,
    crossed.map((p) => p.name),
  )

  const admins = await prisma.user.findMany({
    where: { userRole: 'ADMIN', isActive: true },
    select: { id: true },
  })

  console.log(`[STOCK-ALERT] 👤 ${admins.length} admin(s) trouvé(s)`)

  if (admins.length === 0) {
    console.log('[STOCK-ALERT] ⚠️ Aucun admin actif trouvé')
    return
  }

  const notificationsToCreate = crossed.flatMap((p) =>
    admins.map((admin) => ({
      userId: admin.id,
      title: p.stock_qty === 0 ? '🔴 Rupture de stock' : '🟡 Stock faible',
      message:
        p.stock_qty === 0
          ? `"${p.name}" est désormais en rupture de stock.`
          : `"${p.name}" — il reste ${p.stock_qty} unité(s) en stock (seuil: ${LOW_STOCK_THRESHOLD}).`,
      type: 'STOCK_ALERT' as const,
      referenceType: 'STOCK',
      referenceId: String(p.id),
      priority: p.stock_qty === 0 ? 'HIGH' : 'NORMAL',
    })),
  )

  const result = await prisma.notification.createMany({
    data: notificationsToCreate,
    skipDuplicates: true,
  })

  console.log(`[STOCK-ALERT] ✅ ${result.count} notification(s) d'alerte stock créée(s)`)
}