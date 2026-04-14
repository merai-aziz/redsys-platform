export type FilterFacet = {
  value: string
  label: string
  count: number
}

export type FacetsMap = Record<string, FilterFacet[]>
