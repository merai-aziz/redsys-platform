import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ShieldCheck, Truck, Wrench } from 'lucide-react'

import { CatalogBreadcrumb } from '@/components/catalog/CatalogBreadcrumb'
import { ProductGallery } from '@/components/catalog/ProductGallery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { prisma } from '@/lib/prisma'

type Params = Promise<{ id: string }>

async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      equipmentModel: {
        include: {
          domain: { select: { label: true, slug: true } },
          brand: { select: { name: true, slug: true } },
          series: { select: { name: true, slug: true } },
          images: { orderBy: { sortOrder: 'asc' } },
          filterGroups: {
            include: {
              filters: {
                include: {
                  options: true,
                },
              },
            },
          },
        },
      },
      attributes: {
        include: {
          filter: { select: { label: true, fieldKey: true } },
        },
      },
    },
  })
}

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      equipmentModel: {
        include: {
          brand: { select: { name: true } },
        },
      },
    },
  })

  if (!product) {
    return {
      title: 'Produit introuvable',
      description: 'Le produit demande est introuvable.',
    }
  }

  return {
    title: `${product.name} | ${product.equipmentModel.brand.name}`,
    description: product.equipmentModel.shortDescription ?? product.name,
  }
}

function getConditionLabel(condition: 'A' | 'B' | 'C') {
  if (condition === 'A') return 'RECONDITIONNE'
  return 'OCCASION'
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Params
}) {
  const { id } = await params

  const product = await getProductById(id)

  if (!product) {
    notFound()
  }

  const breadcrumbItems = [
    { label: 'Accueil', href: '/' },
    { label: product.equipmentModel.domain.label, href: `/?domain=${product.equipmentModel.domain.slug}` },
    {
      label: product.equipmentModel.brand.name,
      href: `/?domain=${product.equipmentModel.domain.slug}&brand=${product.equipmentModel.brand.slug}`,
    },
    {
      label: product.equipmentModel.name,
      href: `/?domain=${product.equipmentModel.domain.slug}&brand=${product.equipmentModel.brand.slug}&model=${product.equipmentModel.id}`,
    },
    { label: product.name },
  ]

  const inStock = product.stock > 0

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <CatalogBreadcrumb items={breadcrumbItems} />

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ProductGallery
            productName={product.name}
            images={product.equipmentModel.images.map((image) => ({
              id: image.id,
              url: image.url,
              alt: image.alt,
            }))}
          />
        </div>

        <div className="lg:col-span-5">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl font-bold text-slate-900">{product.name}</CardTitle>
              <p className="text-sm text-slate-500">Reference : {product.sku}</p>

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                  {getConditionLabel(product.condition)}
                </Badge>
                <Badge
                  className={
                    inStock
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-rose-100 text-rose-700 hover:bg-rose-100'
                  }
                >
                  {inStock ? 'En stock' : 'Rupture de stock'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <p className="text-sm text-slate-500">Prix</p>
                <p className="mt-1 text-3xl font-black text-slate-900">
                  {Number(product.price).toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </p>
                <p className="mt-1 text-xs text-slate-500">hors TVA</p>
              </div>

              <div className="space-y-2 border-y border-slate-100 py-4">
                {product.equipmentModel.isConfigurable ? (
                  <Button asChild className="w-full bg-sky-600 text-white hover:bg-sky-700">
                    <Link href={`/configurator/${product.equipmentModel.id}`}>Configurer ce modele</Link>
                  </Button>
                ) : (
                  <Button variant="ghost" className="w-full justify-center border border-slate-200">
                    Demander un devis
                  </Button>
                )}
              </div>

              <ul className="space-y-2 text-sm text-slate-600">
                <li className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Garantie 12 mois
                </li>
                <li className="inline-flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-sky-600" />
                  Teste et certifie
                </li>
                <li className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4 text-violet-600" />
                  Livraison rapide
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Specifications techniques</h2>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="pt-4">
            <Table>
              <TableBody>
                {product.attributes.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-slate-500">Aucune specification disponible.</TableCell>
                    <TableCell />
                  </TableRow>
                ) : (
                  product.attributes.map((attribute) => (
                    <TableRow key={attribute.id}>
                      <TableCell className="w-1/3 font-medium text-slate-700">{attribute.filter.label}</TableCell>
                      <TableCell className="text-slate-900">{attribute.value}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {product.equipmentModel.longDescription || product.equipmentModel.shortDescription ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">Description</h2>
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="pt-5 text-sm leading-7 text-slate-700">
              {product.equipmentModel.longDescription || product.equipmentModel.shortDescription}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  )
}
