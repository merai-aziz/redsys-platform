import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { ConfiguratorTopMenu } from '@/components/catalog/configurator-top-menu'
import { ProductConfigurator } from '@/components/configurator/product-configurator'
import { prisma } from '@/lib/prisma'

interface PageProps {
  params: Promise<{ productId: string }>
}

export default async function ConfiguratorPage({ params }: PageProps) {
  const { productId } = await params
  const id = Number(productId)

  if (!Number.isInteger(id)) {
    notFound()
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      family: {
        include: { category: true },
      },
      configuration_options: {
        include: {
          values: true,
        },
        orderBy: { id: 'asc' },
      },
    },
  })

  if (!product || product.type !== 'CONFIGURABLE') {
    notFound()
  }

  const fullDescription = (product as { description?: string | null }).description ?? ''

  return (
    <main className="min-h-screen bg-[#f5f7fa]">
      <div className="bg-[#0f2436] text-xs text-white/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 sm:px-6 lg:px-8">
          <span>Livraison rapide · Support technique 24/7</span>
          <div className="flex items-center gap-4"></div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1a3a52] shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-6 py-4">
            <div className="shrink-0 text-xl font-black tracking-tight text-white">
              <Link href="/" aria-label="Accueil" className="block">
                <Image
                  src="/redsys-logo.png"
                  alt="Redsys"
                  width={220}
                  height={64}
                  className="h-12 w-auto"
                  priority
                />
              </Link>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link
                href="/login"
                className="hidden items-center gap-2 rounded-full px-3 py-1.5 font-semibold text-white/80 transition hover:bg-white/10 hover:text-white sm:flex"
              >
                Se connecter
              </Link>
              <Link
                href="/cart"
                className="flex items-center gap-2 rounded-full bg-[#2ad1a4] px-4 py-2 font-bold text-[#1a3a52] transition hover:bg-[#20b890]"
              >
                Panier
              </Link>
              <Link href="/" className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 font-bold text-white transition hover:bg-white/10">
                ← Retour
              </Link>
            </div>
          </div>

          <ConfiguratorTopMenu />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-[#5a7a9a]">
          <Link href="/" className="hover:text-[#1a3a52]">Accueil</Link>
          <span>/</span>
          <span>{product.family.category.name}</span>
          <span>/</span>
          <span className="font-semibold text-[#1a3a52]">{product.name}</span>
        </nav>

        <ProductConfigurator
          productName={product.name}
          productDescription={product.family.category.name}
          fullDescription={fullDescription}
          basePrice={String(product.base_price)}
          imageUrl={product.image_url}
          stockQty={product.stock_qty}
          inStock={product.in_stock}
          poe={product.poe}
          options={product.configuration_options.map((opt: typeof product.configuration_options[0]) => ({
            id: opt.id,
            name: opt.name,
            values: opt.values.map((v: typeof opt.values[0]) => ({
              id: v.id,
              value: v.value,
              price: String(v.price),
              quantity: v.quantity,
            }))
          }))}
        />
      </div>
    </main>
  )
}
