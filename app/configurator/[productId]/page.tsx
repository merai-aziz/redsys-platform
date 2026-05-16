import { notFound } from 'next/navigation'
import Link from 'next/link'

import { ConfiguratorSiteHeader } from '@/components/configurator/configurator-site-header'
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
      brand: true,
      family: {
        include: { category: true },
      },
      configuration_options: {
        include: {
          values: {
            include: {
              standard_product: {
                include: {
                  brand: true,
                  family: true,
                },
              },
            },
          },
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
    <>
      <ConfiguratorSiteHeader />

      <main className="min-h-screen bg-[#f5f7fa]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="mb-6 flex items-center gap-2 text-sm text-[#5a7a9a]">
            <Link href="/" className="hover:text-[#1a3a52]">Accueil</Link>
            <span>/</span>
            <span>{product.family.category.name}</span>
            <span>/</span>
            <span className="font-semibold text-[#1a3a52]">{product.name}</span>
          </nav>

          <ProductConfigurator
            modelId={String(product.id)}
            productName={product.name}
            brandName={product.brand?.name ?? ''}
            productDescription={product.family.category.name}
            fullDescription={fullDescription}
            basePrice={String(product.base_price)}
            imageUrl={product.image_url}
            stockQty={product.stock_qty}
            inStock={product.in_stock}
            poe={product.poe}
            options={product.configuration_options.map((opt) => ({
              id: opt.id,
              name: opt.name,
              allow_none: opt.allow_none,
              use_groups: opt.use_groups,
              values: opt.values.map((v) => ({
                id: v.id,
                // value = group_name pour rétrocompat (utilisé par groupValues comme clé)
                value: v.group_name ?? null,
                // group_name explicite — titre de section affiché, jamais label du bouton
                group_name: v.group_name ?? null,
                price: String(v.price),
                quantity: v.quantity,
                standard_product: {
                  id: v.standard_product.id,
                  // name = toujours affiché dans le bouton cliquable
                  name: v.standard_product.name,
                  brand_name: v.standard_product.brand.name,
                  family_name: v.standard_product.family.name,
                  in_stock: v.standard_product.in_stock,
                  stock_qty: v.standard_product.stock_qty,
                },
              })),
            }))}
          />
        </div>
      </main>
    </>
  )
}