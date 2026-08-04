import { DomainCode, DOMAIN_NEEDS, NeedsState } from './domainNeeds'
import { ApplicationType, RiskLevel, SimulationInput } from './recommendationclient'

interface RawMetrics {
  cpu: number
  ram: number
  bandwidth: number
  diskIO: number
}

/**
 * Reproduit la normalisation de computeMetrics() de la page de simulation,
 * mais SANS la contribution des options produit (aucun produit n'est encore
 * choisi au moment de demander une recommandation).
 */
function computeNeedsOnlyMetrics(domainCode: DomainCode, needs: NeedsState): RawMetrics {
  const fields = DOMAIN_NEEDS[domainCode]
  const metrics: RawMetrics = { cpu: 0, ram: 0, bandwidth: 0, diskIO: 0 }

  fields.forEach((field) => {
    const val = needs[field.id] ?? field.defaultValue
    let normalizedVal = 0

    if (field.type === 'slider') {
      const min = field.min ?? 0
      const max = field.max ?? 100
      if (max > 1000) {
        const logMin = Math.log(min + 1)
        const logMax = Math.log(max + 1)
        const logVal = Math.log(Number(val) + 1)
        normalizedVal = Math.max(0, Math.min(1, (logVal - logMin) / Math.max(0.1, logMax - logMin)))
      } else {
        normalizedVal = Math.max(0, Math.min(1, (Number(val) - min) / Math.max(1, max - min)))
      }
    } else if (field.type === 'select' && field.options) {
      const idx = field.options.indexOf(String(val))
      normalizedVal = idx <= 0 ? 0 : Math.pow(idx / (field.options.length - 1), 0.8)
    }

    const keys: (keyof RawMetrics)[] = ['cpu', 'ram', 'bandwidth', 'diskIO']
    keys.forEach((k) => {
      const w = field.impact[k] ?? 0
      metrics[k] += normalizedVal * w * 60
    })
  })

  const keys: (keyof RawMetrics)[] = ['cpu', 'ram', 'bandwidth', 'diskIO']
  keys.forEach((k) => {
    metrics[k] = Math.min(95, Math.max(5, metrics[k]))
  })

  return metrics
}

/** Nombre d'"unités de charge" représentatif du domaine, pour numberOfUsers. */
export function getLoadUnits(domainCode: DomainCode, needs: NeedsState): number {
  if (domainCode === 'SERVER') {
    const nbUsers = Number(needs.nb_users ?? 0)
    const nbVm = Number(needs.nb_vm ?? 0)
    return Math.max(1, nbUsers || nbVm * 10 || 50)
  }
  if (domainCode === 'NETWORK') {
    const nbPorts = Number(needs.nb_ports ?? 0)
    return Math.max(1, nbPorts || 50)
  }
  // STORAGE
  const nbServers = Number(needs.nb_servers ?? 0)
  return Math.max(1, nbServers * 10 || 50)
}

export interface BuildSimulationOptions {
  applicationType?: ApplicationType
  riskLevel?: RiskLevel
  budgetMin?: number | null
  budgetMax?: number | null
}

export function buildSimulationInput(
  domainCode: DomainCode,
  needs: NeedsState,
  options: BuildSimulationOptions = {}
): SimulationInput {
  const metrics = computeNeedsOnlyMetrics(domainCode, needs)

  return {
    applicationType: options.applicationType ?? 'WEB',
    riskLevel: options.riskLevel ?? 'MEDIUM',
    numberOfUsers: getLoadUnits(domainCode, needs),
    cpuUsagePct: metrics.cpu,
    ramUsagePct: metrics.ram,
    storageUsagePct: metrics.diskIO,
    networkUsagePct: metrics.bandwidth,
    budgetMin: options.budgetMin ?? null,
    budgetMax: options.budgetMax ?? null,
  }
}
