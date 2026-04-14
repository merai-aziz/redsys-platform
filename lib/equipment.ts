export type EquipmentType = 'SERVER' | 'STORAGE' | 'NETWORK' | 'COMPONENT'

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return fallback
}

export function parseInteger(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function parseDecimal(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

export type EquipmentSpecInput = {
  specKey: string
  specValue: string
  unit: string
}

const EQUIPMENT_TYPES = new Set<EquipmentType>(['SERVER', 'STORAGE', 'NETWORK', 'COMPONENT'])

const SERVER_REQUIRED_SPEC_KEYS = ['cpu', 'ram', 'storage']

export function parseEquipmentType(value: unknown, fallback: EquipmentType = 'SERVER'): EquipmentType {
  const candidate = String(value ?? '').toUpperCase() as EquipmentType
  return EQUIPMENT_TYPES.has(candidate) ? candidate : fallback
}

export function parseEquipmentSpecs(value: unknown): EquipmentSpecInput[] {
  if (!Array.isArray(value)) return []

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const raw = item as Record<string, unknown>
      const specKey = String(raw.specKey ?? '').trim()
      const specValue = String(raw.specValue ?? '').trim()
      const unit = String(raw.unit ?? '').trim()
      if (!specKey || !specValue) return null
      return { specKey, specValue, unit }
    })
    .filter((item): item is EquipmentSpecInput => Boolean(item))

  const deduped = new Map<string, EquipmentSpecInput>()
  normalized.forEach((item) => {
    deduped.set(item.specKey.toLowerCase(), item)
  })

  return Array.from(deduped.values())
}

export function validateEquipmentSpecs(equipmentType: EquipmentType, specs: EquipmentSpecInput[]) {
  if (equipmentType !== 'SERVER') return { ok: true as const }
  if (specs.length === 0) {
    return {
      ok: false as const,
      message: 'Pour un equipement SERVER, ajoutez au moins une caracteristique dans equipmentSpec.',
    }
  }

  const keys = new Set(specs.map((spec) => spec.specKey.toLowerCase()))
  const missing = SERVER_REQUIRED_SPEC_KEYS.filter((key) => !keys.has(key))

  if (missing.length > 0) {
    return {
      ok: false as const,
      message: `Pour un SERVER, les specs suivantes sont requises: ${missing.join(', ')}.`,
    }
  }

  return { ok: true as const }
}
