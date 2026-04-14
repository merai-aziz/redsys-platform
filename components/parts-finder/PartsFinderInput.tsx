'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type FinderItem = {
  type: 'model' | 'sku'
  id: string
  reference: string
  name: string
  price: number | null
  condition: string | null
  stock: number
  image: string | null
  domain: { label: string; slug: string }
  brand: { name: string; slug: string }
  modelSlug?: string
}

type FinderResponse = {
  results: FinderItem[]
  total: number
}

type SearchState = 'idle' | 'loading' | 'results' | 'empty' | 'error'

export function PartsFinderInput({
  placeholder = 'Trouver une référence, un modèle ou un SKU',
  className,
}: {
  placeholder?: string
  className?: string
}) {
  const router = useRouter()

  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>('idle')
  const [items, setItems] = useState<FinderItem[]>([])

  const trimmed = query.trim()

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setState('idle')
      }
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setState('idle')
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onEscape)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [])

  useEffect(() => {
    if (trimmed.length < 2) {
      setItems([])
      setState('idle')
      return
    }

    setState('loading')
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          limit: '8',
        })

        const res = await fetch(`/api/parts-finder?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
        })

        if (!res.ok) {
          setItems([])
          setState('error')
          return
        }

        const data = (await res.json()) as FinderResponse
        const nextItems = Array.isArray(data.results) ? data.results.slice(0, 8) : []
        setItems(nextItems)
        setState(nextItems.length > 0 ? 'results' : 'empty')
      } catch {
        if (controller.signal.aborted) return
        setItems([])
        setState('error')
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [trimmed])

  const showDropdown = state !== 'idle'

  const domainTone = useMemo(
    () => ({
      server: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
      storage: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
      network: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    }),
    [],
  )

  function domainBadgeClass(slug: string) {
    const key = slug.toLowerCase()
    if (key.includes('server')) return domainTone.server
    if (key.includes('storage')) return domainTone.storage
    if (key.includes('network')) return domainTone.network
    return 'bg-slate-100 text-slate-700 hover:bg-slate-100'
  }

  function handlePick(item: FinderItem) {
    if (item.type === 'model') {
      router.push(`/configurator/${item.id}`)
    } else {
      const modelTarget = item.modelSlug ?? ''
      if (modelTarget) {
        router.push(`/configurator/${modelTarget}?sku=${item.id}`)
      }
    }
    setState('idle')
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (trimmed.length >= 2) {
            setState(items.length > 0 ? 'results' : state === 'error' ? 'error' : 'empty')
          }
        }}
        placeholder={placeholder}
        className="h-10 border-slate-200 bg-white pl-9"
      />

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          {state === 'loading' ? (
            <div className="space-y-2 p-3">
              <div className="h-12 animate-pulse rounded-md bg-slate-100" />
              <div className="h-12 animate-pulse rounded-md bg-slate-100" />
              <div className="h-12 animate-pulse rounded-md bg-slate-100" />
            </div>
          ) : null}

          {state === 'error' ? (
            <p className="p-3 text-sm text-rose-600">Erreur de recherche, reessayez</p>
          ) : null}

          {state === 'empty' ? (
            <p className="p-3 text-sm text-slate-600">Aucun resultat pour « {trimmed} »</p>
          ) : null}

          {state === 'results' ? (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => handlePick(item)}
                    className="flex w-full items-start gap-3 border-b border-slate-100 p-3 text-left transition hover:bg-slate-50"
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-12 w-12 rounded-md object-cover ring-1 ring-slate-200" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">
                        IMG
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Badge className={item.type === 'model' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : 'bg-violet-100 text-violet-700 hover:bg-violet-100'}>
                          {item.type === 'model' ? 'MODELE' : 'SKU'}
                        </Badge>
                        <Badge className={domainBadgeClass(item.domain.slug)}>{item.domain.label}</Badge>
                      </div>

                      <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="truncate text-xs text-slate-500">{item.reference}</p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {item.price === null
                          ? 'Prix non renseigne'
                          : item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
