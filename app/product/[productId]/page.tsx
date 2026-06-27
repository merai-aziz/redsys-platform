'use server'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'

import { ConfiguratorSiteHeader } from '@/components/configurator/configurator-site-header'
import { AddToCartButton } from '@/components/AddToCartButton'
import { prisma } from '@/lib/prisma'

interface PageProps {
  params: Promise<{ productId: string }>
}

export default async function StandardProductPage({ params }: PageProps) {
  const { productId } = await params
  const id = Number(productId)

  if (!Number.isInteger(id)) {
    notFound()
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      brand: true,
      family: {
        include: { category: true },
      },
      specs: {
        orderBy: [{ spec_key: 'asc' }],
      },
    },
  })

  if (!product || product.type !== 'STANDARD') {
    notFound()
  }

  const inStock = product.in_stock && (product.stock_qty ?? 0) > 0
  const fullDescription = (product as { description?: string | null }).description ?? ''

  return (
    <>
      <ConfiguratorSiteHeader />

      <main className="min-h-screen bg-[#f5f7fa]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-[#5a7a9a]">
            <Link href="/" className="hover:text-[#1a3a52]">
              Accueil
            </Link>
            <span>/</span>
            <span>{product.family.category.name}</span>
            <span>/</span>
            <span className="font-semibold text-[#1a3a52]">{product.name}</span>
          </nav>

          {/* Hero — même layout 2 colonnes que le configurateur */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Colonne image */}
            <div className="flex items-center justify-center rounded-2xl border border-[#d0d9e3] bg-white p-8 shadow-sm">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  width={600}
                  height={450}
                  className="max-h-80 w-full object-contain"
                />
              ) : (
                <div className="flex h-64 w-full items-center justify-center rounded-xl bg-[#f5f7fa]">
                  <span className="text-6xl font-black text-[#d0d9e3]">
                    {product.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Colonne infos */}
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-[#1a3a52] sm:text-4xl">
                  {product.name}
                </h1>
                <p className="mt-1 text-sm text-[#5a7a9a]">{product.family.category.name}</p>
              </div>

              {/* Description */}
              {fullDescription && (
                <button
                  type="button"
                  className="w-fit rounded-full bg-[#2ad1a4] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#20b890]"
                >
                  Voir la description complète
                </button>
              )}

              {/* Avis */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${star <= 4 ? 'fill-[#f59e0b] text-[#f59e0b]' : 'fill-[#d0d9e3] text-[#d0d9e3]'}`}
                  />
                ))}
                <span className="text-sm font-semibold text-[#1a3a52]">Score : 4.0</span>
                <span className="text-sm text-[#5a7a9a]">| +200 avis</span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                    inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {inStock ? `En stock (${product.stock_qty})` : 'Rupture de stock'}
                </span>

                {product.poe && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    PoE: Oui
                  </span>
                )}

                {product.brand && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f7ff] px-3 py-1 text-sm font-semibold text-[#1a3a52]">
                    {product.brand.name}
                  </span>
                )}
              </div>

              {/* Prix + bouton panier (Client Component pour useCart) */}
              <div className="flex items-center justify-between rounded-2xl border border-[#d0d9e3] bg-white px-6 py-5 shadow-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#a5b8cc]">Prix</p>
                  <p className="mt-1 text-3xl font-black text-[#1a3a52]">
                    {Number(product.base_price).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </p>
                </div>

                <AddToCartButton
                  model={{
                    id: String(product.id),
                    name: product.name,
                    brandName: product.brand?.name ?? '',
                    reference: String(product.id),
                    basePrice: Number(product.base_price),
                    image: product.image_url ?? undefined,
                  }}
                  inStock={inStock}
                />
              </div>

              {/* Description longue */}
              {fullDescription && (
                <div className="rounded-2xl border border-[#d0d9e3] bg-white p-6 shadow-sm">
                  <h2 className="mb-3 text-base font-bold text-[#1a3a52]">Description</h2>
                  <p className="text-sm leading-relaxed text-[#334e68]">{fullDescription}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}