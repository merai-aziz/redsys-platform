import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Package, ShieldCheck, Truck } from 'lucide-react'
import { Prisma } from '@prisma/client'

import { ConfigSummary } from '@/components/configurator/ConfigSummary'
import { ConfigStepperClient } from '@/components/configurator/ConfigStepperClient'
import { prisma } from '@/lib/prisma'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function parseQueryValues(raw: string | string[] | undefined) {
  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => item.split(','))
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (!raw) return []
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default async function ConfiguratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: SearchParams
}) {
  const { id } = await params
  const query = await searchParams

  const model = await prisma.equipmentModel.findUnique({
    where: { id },
    include: {
      brand: true,
      domain: { select: { id: true, label: true, code: true } },
      series: { select: { id: true, name: true } },
      images: { where: { skuId: null }, orderBy: { sortOrder: 'asc' }, take: 1 },
      filterGroups: {
        orderBy: { displayOrder: 'asc' },
        include: {
          filters: {
            orderBy: { displayOrder: 'asc' },
            include: {
              options: {
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  if (!model) {
    notFound()
  }

  const selectedByKey = new Map<string, string[]>()
  for (const group of model.filterGroups) {
    for (const filter of group.filters) {
      const selectedValues = parseQueryValues(query[filter.fieldKey])
      if (selectedValues.length > 0) {
        selectedByKey.set(filter.fieldKey, selectedValues)
      }
    }
  }

  const attributeConditions: Prisma.ProductWhereInput[] = []
  for (const group of model.filterGroups) {
    for (const filter of group.filters) {
      const values = selectedByKey.get(filter.fieldKey)
      if (!values || values.length === 0) continue

      attributeConditions.push({
        attributes: {
          some: {
            filterId: filter.id,
            value: values.length === 1 ? values[0] : { in: values },
          },
        },
      })
    }
  }

  const products = await prisma.product.findMany({
    where: {
      equipmentModelId: id,
      isActive: true,
      ...(attributeConditions.length > 0 ? { AND: attributeConditions } : {}),
    },
    orderBy: [{ price: 'asc' }, { createdAt: 'desc' }],
    include: {
      attributes: {
        include: {
          filter: {
            select: {
              fieldKey: true,
              label: true,
              unit: true,
            },
          },
        },
      },
    },
  })

  const minPrice = products.reduce<number | null>((carry, product) => {
    const numericPrice = Number(product.price)
    if (carry === null) return numericPrice
    return Math.min(carry, numericPrice)
  }, null)

  const maxPrice = products.reduce<number | null>((carry, product) => {
    const numericPrice = Number(product.price)
    if (carry === null) return numericPrice
    return Math.max(carry, numericPrice)
  }, null)

  const stockQty = products.reduce((sum, product) => sum + Math.max(product.stock, 0), 0)

  const filterMetaByKey = new Map<string, { groupName: string; filterLabel: string }>()
  for (const group of model.filterGroups) {
    for (const filter of group.filters) {
      filterMetaByKey.set(filter.fieldKey, {
        groupName: group.name,
        filterLabel: filter.label,
      })
    }
  }

  const selectedOptions = Array.from(selectedByKey.entries()).flatMap(([fieldKey, values]) => {
    const meta = filterMetaByKey.get(fieldKey)
    return values.map((value) => ({
      groupName: meta?.groupName || 'Autre',
      filterLabel: meta?.filterLabel || fieldKey,
      value,
    }))
  })

  const steps = model.filterGroups.map((group) => {
    const isComplete = group.filters.some((filter) => {
      const selected = selectedByKey.get(filter.fieldKey)
      return Boolean(selected && selected.length > 0)
    })

    return {
      id: `group-${group.id}`,
      label: group.name,
      isComplete,
    }
  })

  const firstIncompleteStep = steps.findIndex((step) => !step.isComplete)
  const currentStep = firstIncompleteStep === -1 ? Math.max(steps.length - 1, 0) : firstIncompleteStep

  function toggleFilterHref(fieldKey: string, value: string) {
    const nextSelections = new Map<string, string[]>(selectedByKey)
    const current = nextSelections.get(fieldKey) ?? []
    const exists = current.includes(value)
    const updated = exists ? current.filter((item) => item !== value) : [...current, value]

    if (updated.length === 0) {
      nextSelections.delete(fieldKey)
    } else {
      nextSelections.set(fieldKey, updated)
    }

    const params = new URLSearchParams()
    for (const [key, values] of nextSelections.entries()) {
      if (values.length === 0) continue
      params.set(key, values.join(','))
    }

    const suffix = params.toString()
    return suffix ? `/configurator/${id}?${suffix}` : `/configurator/${id}`
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <section className="border-b border-[#d0d9e3] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a3a52] hover:text-[#2ad1a4]">
            <ChevronLeft className="h-4 w-4" />
            Retour au catalogue
          </Link>
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.24em] text-[#7a8fa3]">
              {model.brand?.name || 'Produit'} / {model.series?.name || 'Série'}
            </p>
            <h1 className="text-3xl font-black text-[#1a3a52] sm:text-4xl">
              {model.name}
            </h1>
            <p className="max-w-3xl text-sm text-[#5a7a9a]">
              {model.shortDescription || model.longDescription || 'Produit technique prêt à être configuré.'}
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:px-8">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-[#d0d9e3] bg-white shadow-sm">
            <div className="aspect-[16/10] bg-[#eef3f8]">
              {model.images[0]?.url ? (
                <img
                  src={model.images[0].url}
                  alt={model.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#c7d2df]">
                  <Package className="h-16 w-16" />
                </div>
              )}
            </div>
            <div className="grid gap-4 border-t border-[#eef1f5] p-6 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#7a8fa3]">Référence</p>
                <p className="mt-1 font-semibold text-[#1a3a52]">{model.reference}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#7a8fa3]">Stock</p>
                <p className="mt-1 font-semibold text-[#1a3a52]">{stockQty > 0 ? `${stockQty} disponible(s)` : 'Rupture de stock'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#7a8fa3]">Condition</p>
                <p className="mt-1 font-semibold text-[#1a3a52]">{model.condition || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d0d9e3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#1a3a52]">Filtres dynamiques</h2>
              <Link
                href={`/configurator/${id}`}
                className="text-xs font-semibold uppercase tracking-wide text-[#0f7a54] hover:text-[#2ad1a4]"
              >
                Reinitialiser
              </Link>
            </div>
            <p className="mt-2 text-sm text-[#5a7a9a]">
              Ces filtres sont affichés uniquement pour ce modèle. Deux modèles de storage peuvent donc avoir des filtres différents.
            </p>
            {steps.length > 0 ? (
              <div className="mt-5 rounded-xl border border-[#e3e9f0] bg-[#f9fbfd] p-4">
                <ConfigStepperClient steps={steps} currentStep={currentStep} />
              </div>
            ) : null}
            <div className="mt-4 space-y-5">
              {model.filterGroups.length === 0 ? (
                <p className="text-sm text-[#5a7a9a]">Aucun filtre configure pour ce modele.</p>
              ) : (
                model.filterGroups.map((group) => (
                  <div key={group.id} id={`group-${group.id}`} className="space-y-3 scroll-mt-24">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a8fa3]">{group.name}</p>
                    {group.filters.map((filter) => (
                      <div key={filter.id} className="space-y-2">
                        <p className="text-sm font-semibold text-[#1a3a52]">{filter.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {filter.options.map((option) => {
                            const isSelected = (selectedByKey.get(filter.fieldKey) ?? []).includes(option.value)
                            return (
                              <Link
                                key={option.id}
                                href={toggleFilterHref(filter.fieldKey, option.value)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                  isSelected
                                    ? 'border-[#0f7a54] bg-[#e8faf4] text-[#0f7a54]'
                                    : 'border-[#d0d9e3] bg-white text-[#1a3a52] hover:border-[#2ad1a4]'
                                }`}
                              >
                                {option.label}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#d0d9e3] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#2ad1a4]" />
                <h2 className="text-lg font-bold text-[#1a3a52]">Contrôle produit</h2>
              </div>
              <p className="mt-3 text-sm text-[#5a7a9a]">
                Cette fiche est alignée avec votre modèle de catalogue Renewtech: Domaine, Marque, Série, Modèle.
              </p>
            </div>
            <div className="rounded-2xl border border-[#d0d9e3] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-[#2ad1a4]" />
                <h2 className="text-lg font-bold text-[#1a3a52]">Livraison / stock</h2>
              </div>
              <p className="mt-3 text-sm text-[#5a7a9a]">
                Les produits ci-dessous sont charges depuis Product et ProductAttribute, avec filtrage temps reel.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d0d9e3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-[#1a3a52]">Produits disponibles</h2>
              <p className="text-xs uppercase tracking-wide text-[#7a8fa3]">{products.length} resultat(s)</p>
            </div>

            <div className="mt-4 grid gap-3">
              {products.length === 0 ? (
                <p className="text-sm text-[#5a7a9a]">Aucun produit ne correspond aux filtres selectionnes.</p>
              ) : (
                products.map((product) => (
                  <article key={product.id} className="rounded-xl border border-[#eef1f5] bg-[#fbfcfe] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#1a3a52]">{product.name}</p>
                        <p className="text-xs text-[#7a8fa3]">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-[#1a3a52]">
                          {Number(product.price).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}
                        </p>
                        <p className="text-xs text-[#5a7a9a]">Stock: {product.stock}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.attributes.map((attribute) => (
                        <span
                          key={attribute.id}
                          className="rounded-full border border-[#d0d9e3] bg-white px-2.5 py-1 text-xs text-[#334e68]"
                        >
                          {attribute.filter.label}: {attribute.value}
                          {attribute.filter.unit ? ` ${attribute.filter.unit}` : ''}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <ConfigSummary
            modelName={model.name}
            basePrice={minPrice}
            selectedOptions={selectedOptions}
            resetHref={`/configurator/${id}`}
            requestQuoteHref="/cart"
          />

          <div className="rounded-2xl border border-[#d0d9e3] bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-[#7a8fa3]">Plage de prix</p>
            <div className="mt-2 text-3xl font-black text-[#1a3a52]">
              {products.length === 0
                ? 'N/A'
                : `${(minPrice ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })} - ${(maxPrice ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' })}`}
            </div>
            <p className="mt-2 text-sm text-[#5a7a9a]">
              {model.domain?.label || 'Domaine'} · {model.brand?.name || 'Marque'}
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2ad1a4] px-4 py-3 text-sm font-bold text-[#1a3a52] transition hover:bg-[#20b890]"
            >
              Continuer la navigation
            </Link>
          </div>
        </aside>
      </main>
    </div>
  )
}
