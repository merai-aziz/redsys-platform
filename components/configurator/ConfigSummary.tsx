'use client'

import Link from 'next/link'
import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function ConfigSummary({
  modelName,
  basePrice,
  selectedOptions,
  onReset,
  onRequestQuote,
  resetHref,
  requestQuoteHref,
}: {
  modelName: string
  basePrice: number | null
  selectedOptions: Array<{ groupName: string; filterLabel: string; value: string }>
  onReset?: () => void
  onRequestQuote?: () => void
  resetHref?: string
  requestQuoteHref?: string
}) {
  return (
    <aside className="lg:sticky lg:top-24">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Votre configuration</CardTitle>
          <p className="text-sm font-semibold text-slate-800">{modelName}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            {selectedOptions.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune option selectionnee.</p>
            ) : (
              selectedOptions.map((option, index) => (
                <div key={`${option.groupName}-${option.filterLabel}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">{option.groupName}</p>
                  <p className="text-sm font-medium text-slate-800">
                    {option.filterLabel}: <span className="font-semibold">{option.value}</span>
                  </p>
                </div>
              ))
            )}
          </div>

          <Separator />

          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Prix estime</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {basePrice === null
                ? 'N/A'
                : basePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
            <p className="mt-1 text-xs text-slate-500">Delta options: TODO</p>
          </div>

          <div className="space-y-2 pt-1">
            {onRequestQuote ? (
              <Button onClick={onRequestQuote} className="w-full bg-sky-600 text-white hover:bg-sky-700">
                Demander un devis
              </Button>
            ) : requestQuoteHref ? (
              <Button asChild className="w-full bg-sky-600 text-white hover:bg-sky-700">
                <Link href={requestQuoteHref}>Demander un devis</Link>
              </Button>
            ) : null}

            {onReset ? (
              <Button variant="ghost" onClick={onReset} className="w-full text-slate-700 hover:bg-slate-100">
                <RotateCcw className="h-4 w-4" />
                Reinitialiser
              </Button>
            ) : resetHref ? (
              <Button asChild variant="ghost" className="w-full text-slate-700 hover:bg-slate-100">
                <Link href={resetHref}>
                  <RotateCcw className="h-4 w-4" />
                  Reinitialiser
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}
