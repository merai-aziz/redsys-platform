import Link from 'next/link'
import { Package } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ProductCardData = {
  id: string
  sku: string
  name: string
  price: number
  condition: string
  stock: number
  isActive: boolean
  image?: string
  model: {
    id?: string
    name: string
    slug: string
    isConfigurable: boolean
  }
}

function conditionTone(condition: string) {
  const upper = condition.toUpperCase()
  if (upper === 'RECONDITIONED' || upper === 'A') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
  if (upper === 'USED' || upper === 'B') return 'bg-amber-100 text-amber-700 hover:bg-amber-100'
  if (upper === 'NEW' || upper === 'C') return 'bg-sky-100 text-sky-700 hover:bg-sky-100'
  return 'bg-slate-100 text-slate-700 hover:bg-slate-100'
}

export function ProductCard({
  product,
}: {
  product: ProductCardData
}) {
  const inStock = product.stock > 0

  const targetHref = product.model.isConfigurable
    ? `/configurator/${product.model.id ?? product.model.slug}`
    : `/products/${product.id}`

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-0">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-slate-50">
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Package className="h-9 w-9" />
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={conditionTone(product.condition)}>{product.condition}</Badge>
            <Badge className={cn(inStock ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100')}>
              {inStock ? 'En stock' : 'Rupture'}
            </Badge>
            {!product.isActive ? (
              <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">Inactif</Badge>
            ) : null}
          </div>

          <div>
            <p className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</p>
            <p className="mt-1 text-xs text-slate-500">SKU: {product.sku}</p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="text-lg font-bold text-slate-900">
              {product.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
            <Button asChild className="bg-sky-600 text-white hover:bg-sky-700">
              <Link
                href={targetHref}
                onClick={(event) => {
                  event.stopPropagation()
                }}
              >
                {product.model.isConfigurable ? 'Configurer' : 'Voir le produit'}
              </Link>
            </Button>
          </div>
        </div>
        </CardContent>
      </Card>
    </Link>
  )
}
