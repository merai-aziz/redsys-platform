'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

type BreadcrumbItem = {
  label: string
  href?: string
}

export function CatalogBreadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[]
  className?: string
}) {
  const previous = items.length >= 2 ? items[items.length - 2] : null

  return (
    <nav aria-label="Fil d'ariane" className={cn('w-full', className)}>
      <div className="md:hidden">
        {previous?.href ? (
          <Link
            href={previous.href}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </Link>
        ) : null}
      </div>

      <ol className="hidden items-center gap-2 text-sm md:flex">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-slate-500 transition hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast ? 'font-semibold text-slate-900' : 'text-slate-500')}>
                  {item.label}
                </span>
              )}

              {!isLast ? <ChevronRight className="h-4 w-4 text-slate-400" /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
