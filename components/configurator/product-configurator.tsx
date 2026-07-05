'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ShoppingCart, ChevronDown, Check, X, Star, Trash2 } from 'lucide-react'
import { useCart } from '@/context/CartContext'

function sanitize(dirty: string, opts?: { ALLOWED_TAGS?: string[]; ALLOWED_ATTR?: string[] }): string {
  if (typeof window === 'undefined') return dirty
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('dompurify')
  const purify = mod?.default ?? mod
  return typeof purify?.sanitize === 'function' ? purify.sanitize(dirty, opts ?? {}) : dirty
}

interface ConfigValue {
  id: number
  value: string | null
  group_name?: string | null
  price: string
  quantity: number
  standard_product?: {
    id: number
    name: string
    brand_name: string
    family_name: string
    in_stock: boolean
    stock_qty: number
  }
}

interface ConfigOption {
  id: number
  name: string
  allow_none: boolean
  use_groups: boolean
  values: ConfigValue[]
}

interface ProductConfiguratorProps {
  modelId: string
  productName: string
  brandName: string
  productDescription: string
  fullDescription: string
  basePrice: string
  imageUrl?: string | null
  stockQty: number
  inStock: boolean
  poe?: boolean
  options: ConfigOption[]
}

const NONE_VALUE: ConfigValue = {
  id: -1,
  value: null,
  price: '0',
  quantity: 1,
}

export function ProductConfigurator({
  modelId,
  productName,
  brandName,
  productDescription,
  fullDescription,
  basePrice,
  imageUrl,
  stockQty,
  inStock,
  poe,
  options,
}: ProductConfiguratorProps) {
  const { addItem } = useCart()
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
      return { ...prev, [optId]: isSame ? null : val }
    })
    if (parseFloat(val.price) > 0) {
      setSelectedQuantities((prev) => ({ ...prev, [optId]: prev[optId] ?? 1 }))
    }
  }

  const removeOption = (optId: number) => {
    setSelectedValues((prev) => ({ ...prev, [optId]: null }))
  }

  const getOptionQuantity = (optId: number, val: ConfigValue) => {
    if (parseFloat(val.price) <= 0) return 1
    return Math.max(1, selectedQuantities[optId] ?? 1)
  }

  const totalUnitPrice = options.reduce((sum, opt) => {
    const sel = selectedValues[opt.id]
    if (!sel) return sum
    return sum + parseFloat(sel.price) * getOptionQuantity(opt.id, sel)
  }, parseFloat(basePrice) || 0)

  const totalPrice = totalUnitPrice * quantity

  const summaryItems = options
    .map((opt) => ({ opt, val: selectedValues[opt.id] }))
    .filter(({ val }) => val !== null && val.id !== -1)

function handleAddToCart() {
    if (!inStock) return
    const selectedOptions = summaryItems.map(({ val, opt }) => {
      const optQty = getOptionQuantity(opt.id, val!)
      return {
        label: val?.value ?? opt.name,
        price: (parseFloat(val?.price ?? '0') || 0) * optQty,
        // ✅ FIX : on transmet l'ID réel du ConfigurationValue choisi.
        // C'est la clé qui permet à l'API /api/orders de retrouver le bon
        // standard_product_id et de décrémenter EXACTEMENT ce qui a été
        // sélectionné, au lieu de "deviner" une option disponible au hasard.
        optionId: val!.id,
        // ✅ FIX : on transmet la quantité de cette option (utile si l'utilisateur
        // a pris ex. 3x un composant payant dans sa configuration).
        qty: optQty,
      }
    })
    addItem({
      type: 'configurable',
      modelId,
      name: productName,
      brandName,
      basePrice: parseFloat(basePrice) || 0,
      options: selectedOptions,
      quantity,
      image: imageUrl ?? undefined,
    })
}


  const safeFullDescription = sanitize(fullDescription)
  const trustBadges = [
    'Garantie de 3 ans sur toutes les configurations',
    "Uniquement des pièces d'origine",
    'Envoi anonyme directement à votre client final',
    'Toute machine est expédiée de notre propre entrepôt',
    'Expédition <strong>DANS LE MONDE ENTIER</strong> (Envoi standard 15 EUR / Express 25 EUR)',
    'La préparation de la configuration prendra 1 à 2 jours ouvrables, y compris les tests',
  ].map((text) => sanitize(text, { ALLOWED_TAGS: ['strong'], ALLOWED_ATTR: [] }))

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
            <h2 className="mb-4 text-2xl font-black text-[#1a3a52]">{productName}</h2>
            <div
              className="prose prose-sm text-gray-600"
              dangerouslySetInnerHTML={{ __html: safeFullDescription }}
            />
          </div>
        </div>
      )}

      {/* ───── Hero Section ───── */}
      <div className="mb-8 grid grid-cols-1 items-start gap-8 md:grid-cols-2">
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

          <div className="flex items-center gap-3 border-t border-gray-100 pt-5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={20} className="fill-[#1a3a52] text-[#1a3a52]" />
              ))}
            </div>
            <span className="text-sm font-semibold text-[#1a3a52]">
              Score&nbsp;:&nbsp;4,8&nbsp;|&nbsp;+1800 avis
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'}`} />
              {inStock ? `En stock (${stockQty})` : 'Rupture de stock'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                poe ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-200 text-slate-600'
              }`}
            >
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
        {/* ── Options (left 2/3) ── */}
        <div className="space-y-4 lg:col-span-2">
          {options.map((opt) => {
            const groups = groupValues(opt)
            const isNoneSelected = selectedValues[opt.id]?.id === NONE_VALUE.id

            return (
              <div key={opt.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <button
                  onClick={() => toggleSection(opt.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-semibold text-[#1a3a52]">{opt.name}</span>
                  <ChevronDown
                    size={18}
                    className={`text-[#2ad1a4] transition-transform ${openSections[opt.id] ? 'rotate-180' : ''}`}
                  />
                </button>

                {openSections[opt.id] && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-2">
                    {opt.allow_none && (
                      <button
                        onClick={() => selectValue(opt.id, NONE_VALUE)}
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition ${
                          isNoneSelected
                            ? 'border-[#2ad1a4] bg-[#f0fdf9] font-semibold text-[#1a3a52] ring-1 ring-[#2ad1a4]'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-[#2ad1a4] hover:bg-[#f0fdf9]'
                        }`}
                      >
                        <span>Aucun</span>
                        <span className={`ml-4 shrink-0 font-bold ${isNoneSelected ? 'text-[#2ad1a4]' : 'text-gray-500'}`}>
                          Inclus
                        </span>
                      </button>
                    )}

                    {groups.map(({ label, items }) => (
                      <div key={label ?? '__nogroup__'}>
                        {opt.use_groups && label && (
                          <p className="mb-1.5 mt-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                            {label}
                          </p>
                        )}
                        {items.map((val) => {
                          const isSelected = selectedValues[opt.id]?.id === val.id
                          const isOOS = val.quantity === 0
                          const displayLabel = val.standard_product?.name ?? val.value ?? ''

                          return (
                            <button
                              key={val.id}
                              disabled={isOOS}
                              onClick={() => selectValue(opt.id, val)}
                              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition mb-1 ${
                                isSelected
                                  ? 'border-[#2ad1a4] bg-[#f0fdf9] font-semibold text-[#1a3a52] ring-1 ring-[#2ad1a4]'
                                  : isOOS
                                  ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-[#2ad1a4] hover:bg-[#f0fdf9]'
                              }`}
                            >
                              <span className="text-left">{displayLabel}</span>
                              <span className={`ml-4 shrink-0 font-bold ${isSelected ? 'text-[#2ad1a4]' : 'text-gray-500'}`}>
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
            )
          })}
        </div>

        {/* ── Summary (right 1/3) ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl bg-white shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-[#1a3a52]">Résumé</h3>
              {summaryItems.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-[#f0fdf9] px-2.5 py-0.5 text-xs font-semibold text-[#0f6e56] border border-[#9fe1cb]">
                  {summaryItems.length} option{summaryItems.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Option items */}
            <div className="px-4 py-4 space-y-3 min-h-[80px]">
              {summaryItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-3">
                  Aucune option sélectionnée
                </p>
              ) : (
                summaryItems.map(({ opt, val }) => {
                  const isPaid = parseFloat(val!.price) > 0
                  const qty = getOptionQuantity(opt.id, val!)
                  // group_name = titre de section (catégorie), opt.name = nom de l'option configurée
                  const groupLabel = val!.group_name ?? val!.value ?? null
                  const productLabel = val!.standard_product?.name ?? opt.name

                  return (
                    <div
                      key={opt.id}
                      className="rounded-xl border border-gray-100 bg-[#f8fafc] px-3 py-2.5"
                    >
                      {/* Top row: meta + price */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex flex-col gap-0.5">
                          {/* Catégorie / groupe */}
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 leading-none">
                            {opt.name}
                            {groupLabel ? ` · ${groupLabel}` : ''}
                          </span>
                          {/* Nom du produit sélectionné */}
                          <span className="text-[12px] font-semibold text-[#1a3a52] leading-snug truncate">
                            {productLabel}
                          </span>
                        </div>

                        {isPaid ? (
                          <span className="shrink-0 text-[13px] font-bold text-[#2ad1a4] whitespace-nowrap">
                            +{(parseFloat(val!.price) * qty).toFixed(2)} €
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-[#f0fdf9] border border-[#9fe1cb] px-2 py-0.5 text-[10px] font-semibold text-[#0f6e56] whitespace-nowrap">
                            Inclus
                          </span>
                        )}
                      </div>

                      {/* Bottom row: delete + qty controls */}
                      <div className="mt-2 flex items-center justify-end gap-2">
                        {/* Supprimer l'option */}
                        <button
                          type="button"
                          onClick={() => removeOption(opt.id)}
                          title="Retirer cette option"
                          className="flex items-center justify-center w-6 h-6 rounded-md border border-red-100 bg-white text-red-400 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition"
                        >
                          <Trash2 size={11} />
                        </button>

                        {/* Quantité — seulement pour options payantes */}
                        {isPaid && (
                          <>
                            <div className="flex-1" />
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedQuantities((prev) => ({
                                    ...prev,
                                    [opt.id]: Math.max(1, (prev[opt.id] ?? 1) - 1),
                                  }))
                                }
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-xs font-bold text-[#1a3a52] hover:border-[#2ad1a4] hover:text-[#2ad1a4] transition"
                              >
                                −
                              </button>
                              <span className="min-w-[1.5rem] text-center text-xs font-bold text-[#1a3a52]">
                                {qty}
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
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-xs font-bold text-[#1a3a52] hover:border-[#2ad1a4] hover:text-[#2ad1a4] transition"
                              >
                                +
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Price block */}
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Prix unitaire</span>
                <span className="text-xs font-semibold text-gray-500">
                  {totalUnitPrice.toFixed(2)} €
                </span>
              </div>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-xs text-gray-400">Total</span>
                <span className="text-2xl font-black text-[#1a3a52] tracking-tight">
                  {totalPrice.toFixed(2)} €
                </span>
              </div>
            </div>

            {/* Add to cart */}
            <div className="border-t border-gray-100 px-5 pb-5 pt-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border-[1.5px] border-[#2ad1a4] overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-[#1a3a52] hover:text-[#2ad1a4] font-bold text-sm"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center text-sm font-bold text-[#1a3a52]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-3 py-2 text-[#1a3a52] hover:text-[#2ad1a4] font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow transition ${
                    inStock
                      ? 'bg-[#2ad1a4] hover:bg-[#20b890] active:scale-95'
                      : 'cursor-not-allowed bg-slate-300'
                  }`}
                >
                  <ShoppingCart size={16} />
                  Ajouter au panier
                </button>
              </div>
            </div>

            {/* Trust badges */}
            <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-2">
              {trustBadges.map((text, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed">
                  <Check size={13} className="mt-0.5 shrink-0 text-[#2ad1a4]" />
                  <span dangerouslySetInnerHTML={{ __html: text }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function groupValues(opt: ConfigOption): { label: string | null; items: ConfigValue[] }[] {
  if (!opt.use_groups) {
    return [{ label: null, items: opt.values }]
  }

  const order: string[] = []
  const map = new Map<string, ConfigValue[]>()

  for (const val of opt.values) {
    const key = (val.group_name ?? val.value) ?? ''
    if (!map.has(key)) {
      order.push(key)
      map.set(key, [])
    }
    map.get(key)!.push(val)
  }

  return order.map((key) => ({ label: key || null, items: map.get(key)! }))
}