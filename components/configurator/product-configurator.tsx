'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ShoppingCart, ChevronDown, Check, X, Star } from 'lucide-react'

interface ConfigValue {
  id: number
  value: string
  price: string
  quantity: number
}

interface ConfigOption {
  id: number
  name: string
  values: ConfigValue[]
}

interface ProductConfiguratorProps {
  productName: string
  productDescription: string
  fullDescription: string
  basePrice: string
  imageUrl?: string | null
  stockQty: number
  inStock: boolean
  poe?: boolean
  options: ConfigOption[]
}

export function ProductConfigurator({
  productName,
  productDescription,
  fullDescription,
  basePrice,
  imageUrl,
  stockQty,
  inStock,
  poe,
  options,
}: ProductConfiguratorProps) {
  const [showDescription, setShowDescription] = useState(false)
  const [openSections, setOpenSections] = useState<Record<number, boolean>>(
    Object.fromEntries(options.map((opt) => [opt.id, true]))
  )
  const [selectedValues, setSelectedValues] = useState<Record<number, ConfigValue | null>>(
    Object.fromEntries(options.map((opt) => [opt.id, null]))
  )
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({})
  const [quantity, setQuantity] = useState(1)

  const toggleSection = (id: number) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))

  const selectValue = (optId: number, val: ConfigValue) => {
    setSelectedValues((prev) => {
      const isSame = prev[optId]?.id === val.id
      return {
        ...prev,
        [optId]: isSame ? null : val,
      }
    })

    if (parseFloat(val.price) > 0) {
      setSelectedQuantities((prev) => ({
        ...prev,
        [optId]: prev[optId] ?? 1,
      }))
    }
  }

  const getOptionQuantity = (optId: number, val: ConfigValue) => {
    if (parseFloat(val.price) <= 0) return 1
    return Math.max(1, selectedQuantities[optId] ?? 1)
  }

  const totalUnitPrice = options.reduce((sum, opt) => {
    const sel = selectedValues[opt.id]
    if (!sel) return sum
    const selectedQty = getOptionQuantity(opt.id, sel)
    return sum + (parseFloat(sel.price) * selectedQty)
  }, parseFloat(basePrice) || 0)

  const totalPrice = totalUnitPrice * quantity

  const summaryItems = options
    .map((opt) => ({ opt, val: selectedValues[opt.id] }))
    .filter((x) => x.val !== null)

  return (
    <>
      {/* ───── Description Modal ───── */}
      {showDescription && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowDescription(false)}
        >
          <div
            className="relative max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDescription(false)}
              className="absolute right-5 top-5 rounded-full p-1 text-gray-400 hover:text-gray-700"
            >
              <X size={22} />
            </button>
            <h2 className="mb-4 text-2xl font-bold text-[#1a3a52]">{productName}</h2>
            <div
              className="prose prose-sm text-gray-600"
              dangerouslySetInnerHTML={{ __html: fullDescription }}
            />
          </div>
        </div>
      )}

      {/* ───── Hero Section ───── */}
      <div className="mb-8 grid grid-cols-1 items-start gap-8 md:grid-cols-2">
        {/* Product image */}
        <div className="flex items-center justify-center rounded-2xl bg-white p-8 shadow-sm">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={productName}
              width={480}
              height={280}
              className="max-h-64 w-full object-contain"
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center rounded-xl bg-gray-100 text-gray-400">
              No image
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex flex-col justify-center gap-5 py-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wide text-[#1a3a52]">
              {productName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{productDescription}</p>
          </div>

          <button
            onClick={() => setShowDescription(true)}
            className="flex w-fit items-center gap-2 rounded-full bg-[#2ad1a4] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#20b890] active:scale-95"
          >
            read full description
          </button>

          {/* Rating */}
          <div className="flex items-center gap-3 border-t border-gray-100 pt-5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={20}
                  className={s <= 4 ? 'fill-[#1a3a52] text-[#1a3a52]' : 'fill-[#1a3a52] text-[#1a3a52]'}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-[#1a3a52]">
              Score&nbsp;:&nbsp;4,8&nbsp;|&nbsp;+1800 avis
            </span>
          </div>

          {/* Stock badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                inStock
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'}`}
              />
              {inStock ? `En stock (${stockQty})` : 'Rupture de stock'}
            </span>

            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${poe ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-200 text-slate-600'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${poe ? 'bg-cyan-500' : 'bg-slate-400'}`} />
              {poe ? 'PoE: Oui' : 'PoE: Non'}
            </span>
          </div>
        </div>
      </div>

      {/* ───── Configurator + Summary ───── */}
      <div className="mb-2 text-xl font-bold text-[#1a3a52]">
        Personnaliser {productName}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Options (left 2/3) */}
        <div className="space-y-4 lg:col-span-2">
          {options.map((opt) => (
            <div key={opt.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
              {/* Section header */}
              <button
                onClick={() => toggleSection(opt.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-semibold text-[#1a3a52]">{opt.name}</span>
                <ChevronDown
                  size={18}
                  className={`text-[#2ad1a4] transition-transform ${
                    openSections[opt.id] ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Section body */}
              {openSections[opt.id] && (
                <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-2">
                  {/* Group values by "category" prefix (text before first space-hyphen pattern) */}
                  {groupValues(opt.values).map(({ label, items }) => (
                    <div key={label}>
                      {label && (
                        <p className="mb-1.5 mt-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                          {label}
                        </p>
                      )}
                      {items.map((val) => {
                        const isSelected = selectedValues[opt.id]?.id === val.id
                        const isOOS = val.quantity === 0
                        return (
                          <button
                            key={val.id}
                            disabled={isOOS}
                            onClick={() => selectValue(opt.id, val)}
                            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition ${
                              isSelected
                                ? 'border-[#2ad1a4] bg-[#f0fdf9] font-semibold text-[#1a3a52] ring-1 ring-[#2ad1a4]'
                                : isOOS
                                ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-[#2ad1a4] hover:bg-[#f0fdf9]'
                            }`}
                          >
                            <span className="text-left">{val.value}</span>
                            <span
                              className={`ml-4 shrink-0 font-bold ${
                                isSelected ? 'text-[#2ad1a4]' : 'text-gray-500'
                              }`}
                            >
                              {parseFloat(val.price) === 0
                                ? 'Inclus'
                                : `${parseFloat(val.price).toFixed(2)} €`}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary (right 1/3) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="font-bold text-[#1a3a52]">Résumé</h3>
            </div>

            <div className="px-5 py-4 space-y-2 min-h-[80px]">
              {summaryItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucune option sélectionnée</p>
              ) : (
                summaryItems.map(({ opt, val }) => (
                  <div key={opt.id} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span className="truncate mr-2">{opt.name}</span>
                      <span className="shrink-0 font-semibold">
                        {parseFloat(val!.price) === 0
                          ? 'Inclus'
                          : `+${(parseFloat(val!.price) * getOptionQuantity(opt.id, val!)).toFixed(2)} €`}
                      </span>
                    </div>

                    {parseFloat(val!.price) > 0 && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedQuantities((prev) => ({
                              ...prev,
                              [opt.id]: Math.max(1, (prev[opt.id] ?? 1) - 1),
                            }))
                          }
                          className="rounded border border-gray-200 px-2 py-0.5 text-xs text-[#1a3a52]"
                        >
                          -
                        </button>
                        <span className="min-w-[1.5rem] text-center text-xs font-semibold text-[#1a3a52]">
                          {getOptionQuantity(opt.id, val!)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedQuantities((prev) => ({
                              ...prev,
                              [opt.id]: Math.min(
                                Math.max(1, val!.quantity || 1),
                                (prev[opt.id] ?? 1) + 1,
                              ),
                            }))
                          }
                          className="rounded border border-gray-200 px-2 py-0.5 text-xs text-[#1a3a52]"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 px-5 py-4">
              <div className="mb-1 text-right text-xs font-semibold text-gray-500">
                Prix unitaire: {totalUnitPrice.toFixed(2)} €
              </div>
              <div className="mb-4 text-right text-2xl font-black text-[#1a3a52]">
                {totalPrice.toFixed(2)} €
              </div>

              {/* Quantity + Add to cart */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-[#2ad1a4]">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-[#1a3a52] hover:text-[#2ad1a4] font-bold"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center text-sm font-semibold text-[#1a3a52]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-3 py-2 text-[#1a3a52] hover:text-[#2ad1a4] font-bold"
                  >
                    +
                  </button>
                </div>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#2ad1a4] px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#20b890] active:scale-95">
                  <ShoppingCart size={16} />
                  Ajouter au panier
                </button>
              </div>
            </div>

            {/* Trust badges */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-2">
              {[
                'Garantie de 3 ans sur toutes les configurations',
                'Uniquement des pièces d\'origine',
                'Envoi anonyme directement à votre client final',
                'Toute machine est expédiée de notre propre entrepôt',
                'Expédition DANS LE MONDE ENTIER (Envoi standard 15 EUR / Express 25 EUR)',
                'La préparation de la configuration prendra 1 à 2 jours ouvrables, y compris les tests',
              ].map((text) => (
                <div key={text} className="flex items-start gap-2 text-xs text-gray-600">
                  <Check size={14} className="mt-0.5 shrink-0 text-[#2ad1a4]" />
                  <span dangerouslySetInnerHTML={{ __html: text.replace('DANS LE MONDE ENTIER', '<strong>DANS LE MONDE ENTIER</strong>') }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Helper: group option values by a leading label like "4-Core", "6-Core" etc.
// Values that don't match get grouped under label = ''
function groupValues(values: ConfigValue[]): { label: string; items: ConfigValue[] }[] {
  const groups: { label: string; items: ConfigValue[] }[] = []
  let current: { label: string; items: ConfigValue[] } | null = null

  // Detect if values carry embedded group labels (e.g. "E5-2637v4 (3.50GHz - 4-Core)")
  // We simply emit all values ungrouped unless the value text starts with a category keyword
  // For simplicity we just return one flat group here; extend as needed.
  for (const val of values) {
    if (!current) {
      current = { label: '', items: [val] }
      groups.push(current)
    } else {
      current.items.push(val)
    }
  }

  return groups
}
