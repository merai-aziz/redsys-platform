'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { FacetsMap } from '@/types/filters'
import { cn } from '@/lib/utils'

type FilterOption = {
  id: string
  value: string
  label: string
  displayOrder: number
}

type FilterItem = {
  id: string
  label: string
  fieldKey: string
  fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN'
  unit?: string | null
  displayOrder: number
  options: FilterOption[]
}

type FilterGroup = {
  id: string
  name: string
  slug: string
  displayOrder: number
  filters: FilterItem[]
}

export function FilterSidebar({
  groups,
  facets,
  selectedFilters,
  onFilterChange,
  stockCount,
  inStockOnly,
  onStockChange,
  onReset,
  priceRange,
}: {
  groups: FilterGroup[]
  facets: FacetsMap
  selectedFilters: Record<string, string>
  onFilterChange: (fieldKey: string, value: string | null) => void
  stockCount?: number
  inStockOnly: boolean
  onStockChange: (value: boolean) => void
  onReset: () => void
  priceRange?: { min: number; max: number }
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const group of groups) {
      map[group.id] = true
    }
    return map
  })

  const activeCount = useMemo(() => {
    const selectedCount = Object.entries(selectedFilters).filter(([, value]) => String(value ?? '').trim().length > 0).length
    return selectedCount + (inStockOnly ? 1 : 0)
  }, [inStockOnly, selectedFilters])

  function toggleGroup(groupId: string) {
    setExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Filtres</CardTitle>
          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{activeCount} actif(s)</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className={cn(
            'rounded-lg border p-3 transition',
            inStockOnly
              ? 'border-sky-200 bg-sky-50'
              : 'border-slate-200 bg-slate-50',
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <Label className="inline-flex text-xs uppercase tracking-[0.14em] text-slate-500">Disponibilite</Label>
            {stockCount && stockCount > 0 ? (
              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{stockCount}</Badge>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => onStockChange(event.target.checked)}
            />
            En stock uniquement
          </label>
        </div>

        {priceRange ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Label className="text-xs uppercase tracking-[0.14em] text-slate-500">Prix</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={priceRange.min}
                max={priceRange.max}
                placeholder={`Min (${priceRange.min})`}
                value={selectedFilters.min_price ?? ''}
                onChange={(event) => onFilterChange('min_price', event.target.value || null)}
                className="h-9 bg-white"
              />
              <Input
                type="number"
                min={priceRange.min}
                max={priceRange.max}
                placeholder={`Max (${priceRange.max})`}
                value={selectedFilters.max_price ?? ''}
                onChange={(event) => onFilterChange('max_price', event.target.value || null)}
                className="h-9 bg-white"
              />
            </div>
          </div>
        ) : null}

        <Separator />

        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = expanded[group.id] ?? true
            return (
              <div key={group.id} className="rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                >
                  <span className="text-sm font-semibold text-slate-800">{group.name}</span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>

                {isOpen ? (
                  <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                    {group.filters.map((filter) => {
                      const selected = selectedFilters[filter.fieldKey] ?? ''
                      const facetEntries = facets[filter.fieldKey] ?? []

                      return (
                        <div key={filter.id} className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{filter.label}</p>

                          <div className="space-y-1.5">
                            {(filter.options.length > 0 ? filter.options : facetEntries.map((entry) => ({ id: entry.value, value: entry.value, label: entry.label, displayOrder: 0 }))).map((option) => {
                              const facet = facetEntries.find((entry) => entry.value === option.value)
                              const isChecked = selected === option.value

                              return (
                                <label
                                  key={option.id}
                                  className={cn(
                                    'flex cursor-pointer items-center justify-between rounded-md border px-2.5 py-2 text-sm transition',
                                    isChecked
                                      ? 'border-sky-200 bg-sky-50 text-sky-800'
                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                                  )}
                                >
                                  <span className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(event) =>
                                        onFilterChange(filter.fieldKey, event.target.checked ? option.value : null)
                                      }
                                    />
                                    {option.label}
                                  </span>
                                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{facet?.count ?? 0}</Badge>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        {activeCount > 0 ? (
          <Button variant="ghost" onClick={onReset} className="w-full text-slate-700 hover:bg-slate-100">
            <RotateCcw className="h-4 w-4" />
            Effacer les filtres
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
