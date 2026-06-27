'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CatalogModel {
  id: string
  name: string
  basePrice: number
  image: string | null
  stockQty: number
  status: string
  condition: string | null
  poe: boolean
  brandName: string
  familyName: string
  categoryName: string
  domainId: string
  filterValues: Array<{ filterId: number; filterName: string; valueId: number; value: string }>
}

interface ConfigOptionValue {
  id: number
  // value = group_name pour rétrocompat (clé de groupement legacy)
  value: string | null
  // group_name explicite — titre de section affiché (ex: "4-Core"), jamais le nom du bouton
  group_name?: string | null
  price: number
  quantity: number
  // Détails du produit standard rattaché à cette valeur — c'est lui qui fournit
  // le libellé réellement affiché sur le bouton (ex: "LENOVO - Intel Xeon E-2134...")
  standard_product?: {
    id: number
    name: string
    brand_name?: string
    family_name?: string
    in_stock?: boolean
    stock_qty?: number
  } | null
}

interface ConfigOption {
  id: number
  name: string
  allow_none?: boolean
  use_groups?: boolean
  values: ConfigOptionValue[]
}

interface ProductDetail {
  id: string
  name: string
  brandName: string
  categoryName: string
  familyName: string
  basePrice: number
  image: string | null
  inStock: boolean
  domainId: string
  options: ConfigOption[]
}

type DomainCode = 'SERVER' | 'STORAGE' | 'NETWORK'

// ─── Domain needs definitions ─────────────────────────────────────────────────

interface NeedField {
  id: string
  label: string
  type: 'slider' | 'select'
  min?: number
  max?: number
  step?: number
  unit?: string
  options?: string[]
  defaultValue: number | string
  impact: {
    cpu?: number
    ram?: number
    temp?: number
    bandwidth?: number
    diskIO?: number
    power?: number
  }
}

const DOMAIN_NEEDS: Record<DomainCode, NeedField[]> = {
  SERVER: [
    {
      id: 'virtualization',
      label: 'Type de virtualisation',
      type: 'select',
      options: ['Aucune', 'VMware ESXi', 'Hyper-V', 'KVM', 'Proxmox', 'Xen'],
      defaultValue: 'Aucune',
      impact: { cpu: 0.4, ram: 0.35, power: 0.2 },
    },
    {
      id: 'os',
      label: 'Système d\'exploitation',
      type: 'select',
      options: ['Linux', 'Windows Server', 'FreeBSD', 'VMware ESXi', 'Bare Metal'],
      defaultValue: 'Linux',
      impact: { ram: 0.15, diskIO: 0.1 },
    },
    {
      id: 'nb_vm',
      label: 'Nombre de VMs',
      type: 'slider',
      min: 0, max: 200, step: 5, unit: 'VMs',
      defaultValue: 0,
      impact: { cpu: 0.55, ram: 0.6, power: 0.35, temp: 0.3 },
    },
    {
      id: 'db_type',
      label: 'Type de base de données',
      type: 'select',
      options: ['Aucune', 'PostgreSQL', 'MySQL', 'MongoDB', 'Oracle', 'SQL Server', 'Redis'],
      defaultValue: 'Aucune',
      impact: { ram: 0.3, diskIO: 0.45, cpu: 0.2 },
    },
    {
      id: 'nb_users',
      label: 'Nombre d\'utilisateurs',
      type: 'slider',
      min: 0, max: 5000, step: 50, unit: 'users',
      defaultValue: 0,
      impact: { cpu: 0.3, ram: 0.25, bandwidth: 0.5, power: 0.15 },
    },
    {
      id: 'network_load',
      label: 'Charge réseau',
      type: 'slider',
      min: 0, max: 100, step: 5, unit: '%',
      defaultValue: 0,
      impact: { bandwidth: 0.7, cpu: 0.15, power: 0.1 },
    },
    {
      id: 'cache_size',
      label: 'Taille du cache',
      type: 'slider',
      min: 0, max: 512, step: 8, unit: 'GB',
      defaultValue: 0,
      impact: { ram: 0.5, diskIO: 0.3, cpu: 0.1 },
    },
  ],
  STORAGE: [
    {
      id: 'capacity_needed',
      label: 'Capacité requise',
      type: 'slider',
      min: 0, max: 2000, step: 50, unit: 'TB',
      defaultValue: 0,
      impact: { diskIO: 0.4, power: 0.3, temp: 0.2 },
    },
    {
      id: 'data_type',
      label: 'Type de données',
      type: 'select',
      options: ['Fichiers plats', 'Bases de données', 'Archives', 'Média/Vidéo', 'Sauvegardes', 'Objets S3'],
      defaultValue: 'Fichiers plats',
      impact: { diskIO: 0.35, bandwidth: 0.25, cpu: 0.15 },
    },
    {
      id: 'nb_servers',
      label: 'Serveurs connectés',
      type: 'slider',
      min: 0, max: 100, step: 1, unit: 'serveurs',
      defaultValue: 0,
      impact: { bandwidth: 0.6, cpu: 0.2, power: 0.25 },
    },
    {
      id: 'iops',
      label: 'IOPS attendus',
      type: 'slider',
      min: 0, max: 500000, step: 5000, unit: 'IOPS',
      defaultValue: 0,
      impact: { diskIO: 0.7, cpu: 0.3, temp: 0.25, power: 0.3 },
    },
    {
      id: 'redundancy',
      label: 'Niveau de redondance',
      type: 'select',
      options: ['Aucune', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10', 'Erasure Coding'],
      defaultValue: 'Aucune',
      impact: { diskIO: 0.2, cpu: 0.25, power: 0.2 },
    },
    {
      id: 'protocol',
      label: 'Protocole de stockage',
      type: 'select',
      options: ['iSCSI', 'Fibre Channel', 'NFS', 'SMB/CIFS', 'S3', 'NVMe-oF'],
      defaultValue: 'iSCSI',
      impact: { bandwidth: 0.4, cpu: 0.2, diskIO: 0.15 },
    },
    {
      id: 'replication',
      label: 'Réplication distante',
      type: 'slider',
      min: 0, max: 100, step: 10, unit: '%',
      defaultValue: 0,
      impact: { bandwidth: 0.5, cpu: 0.15, power: 0.1 },
    },
  ],
  NETWORK: [
    {
      id: 'nb_ports',
      label: 'Nombre de ports requis',
      type: 'slider',
      min: 0, max: 512, step: 8, unit: 'ports',
      defaultValue: 0,
      impact: { bandwidth: 0.5, power: 0.4, cpu: 0.15 },
    },
    {
      id: 'throughput',
      label: 'Débit requis',
      type: 'slider',
      min: 0, max: 400, step: 10, unit: 'Gbps',
      defaultValue: 0,
      impact: { bandwidth: 0.8, cpu: 0.3, power: 0.35, temp: 0.2 },
    },
    {
      id: 'nb_vlans',
      label: 'Nombre de VLANs',
      type: 'slider',
      min: 0, max: 4096, step: 64, unit: 'VLANs',
      defaultValue: 0,
      impact: { cpu: 0.35, ram: 0.25, bandwidth: 0.15 },
    },
    {
      id: 'traffic_type',
      label: 'Type de trafic',
      type: 'select',
      options: ['Data center Est-Ouest', 'Edge/Internet', 'Voix/Vidéo', 'Stockage SAN', 'HPC/Calcul', 'Mixte'],
      defaultValue: 'Mixte',
      impact: { bandwidth: 0.4, cpu: 0.2, ram: 0.15 },
    },
    {
      id: 'redundancy',
      label: 'Redondance réseau',
      type: 'select',
      options: ['Aucune', 'LACP/Bonding', 'Spanning Tree', 'VRRP/HSRP', 'Multi-chassis LAG', 'Full mesh'],
      defaultValue: 'Aucune',
      impact: { cpu: 0.3, ram: 0.2, bandwidth: 0.2 },
    },
    {
      id: 'poe_load',
      label: 'Charge PoE',
      type: 'slider',
      min: 0, max: 100, step: 5, unit: '%',
      defaultValue: 0,
      impact: { power: 0.7, temp: 0.35 },
    },
    {
      id: 'routing_complexity',
      label: 'Complexité du routage',
      type: 'slider',
      min: 0, max: 100, step: 5, unit: '%',
      defaultValue: 0,
      impact: { cpu: 0.55, ram: 0.4, power: 0.15 },
    },
  ],
}

// ─── Simulation engine ────────────────────────────────────────────────────────

type NeedsState = Record<string, number | string>
type OptionsState = Record<number, number | null>

interface Metrics {
  cpu: number
  ram: number
  temp: number
  bandwidth: number
  diskIO: number
  power: number
}

function inferDomainCode(domainId: string, categoryName: string, familyName: string): DomainCode {
  const hay = `${domainId} ${categoryName} ${familyName}`.toLowerCase()
  if (hay.includes('server') || hay.includes('serveur') || hay.includes('rack') || hay.includes('blade')) return 'SERVER'
  if (hay.includes('storage') || hay.includes('stockage') || hay.includes('san') || hay.includes('nas')) return 'STORAGE'
  if (hay.includes('network') || hay.includes('reseau') || hay.includes('switch') || hay.includes('router') || hay.includes('catalyst') || hay.includes('nexus')) return 'NETWORK'
  if (domainId.includes('storage')) return 'STORAGE'
  if (domainId.includes('network')) return 'NETWORK'
  return 'SERVER'
}

function selectWeightForOption(optName: string, domainCode: DomainCode): Partial<Metrics> {
  const n = optName.toLowerCase()
  const domainMultiplier = domainCode === 'SERVER' ? 1.2 : domainCode === 'STORAGE' ? 1.1 : 1.0
  
  if (n.includes('cpu') || n.includes('processeur') || n.includes('proc') || n.includes('core')) {
    return { cpu: 0.6 * domainMultiplier, temp: 0.3 * domainMultiplier, power: 0.25 * domainMultiplier }
  }
  if (n.includes('ram') || n.includes('mémoire') || n.includes('memoire') || n.includes('memory') || n.includes('ddr')) {
    return { ram: 0.65 * domainMultiplier, power: 0.15 * domainMultiplier }
  }
  if (n.includes('disk') || n.includes('disque') || n.includes('ssd') || n.includes('hdd') || n.includes('nvme') || n.includes('sata') || n.includes('sas')) {
    return { diskIO: 0.65 * domainMultiplier, temp: 0.2 * domainMultiplier, power: 0.2 * domainMultiplier }
  }
  if (n.includes('réseau') || n.includes('network') || n.includes('nic') || n.includes('port') || n.includes('10g') || n.includes('25g') || n.includes('100g') || n.includes('ethernet')) {
    return { bandwidth: 0.65 * domainMultiplier, power: 0.15 * domainMultiplier }
  }
  if (n.includes('alim') || n.includes('power') || n.includes('psu') || n.includes('watt') || n.includes('alimentation')) {
    return { power: 0.6 * domainMultiplier, temp: 0.2 * domainMultiplier }
  }
  if (n.includes('cache') || n.includes('buffer')) {
    return { diskIO: 0.3 * domainMultiplier, ram: 0.25 * domainMultiplier, cpu: 0.15 * domainMultiplier }
  }
  if (n.includes('gpu') || n.includes('accél') || n.includes('acceleration') || n.includes('cuda')) {
    return { cpu: 0.4 * domainMultiplier, power: 0.5 * domainMultiplier, temp: 0.4 * domainMultiplier }
  }
  if (n.includes('raid') || n.includes('redondance')) {
    return { diskIO: 0.3 * domainMultiplier, cpu: 0.2 * domainMultiplier, power: 0.2 * domainMultiplier }
  }
  if (n.includes('virtual') || n.includes('hypervisor') || n.includes('vm')) {
    return { cpu: 0.5 * domainMultiplier, ram: 0.3 * domainMultiplier, power: 0.2 * domainMultiplier }
  }
  return { cpu: 0.15 * domainMultiplier, ram: 0.15 * domainMultiplier, power: 0.1 * domainMultiplier }
}

function computeMetrics(
  domainCode: DomainCode,
  product: ProductDetail,
  needs: NeedsState,
  optionsState: OptionsState,
): Metrics {
  const fields = DOMAIN_NEEDS[domainCode]
  let metricAccum: Metrics = { cpu: 0, ram: 0, temp: 0, bandwidth: 0, diskIO: 0, power: 0 }

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

    const keys: (keyof Metrics)[] = ['cpu', 'ram', 'temp', 'bandwidth', 'diskIO', 'power']
    keys.forEach((k) => {
      const w = field.impact[k] ?? 0
      metricAccum[k] += normalizedVal * w * 60
    })
  })

  product.options.forEach((opt) => {
    const selectedIdx = optionsState[opt.id]
    if (selectedIdx === null || selectedIdx === undefined) return
    const n = opt.values.length - 1
    if (n <= 0) return
    
    const optNorm = Math.pow(selectedIdx / n, 0.7)
    const weights = selectWeightForOption(opt.name, domainCode)
    const impactFactor = 35
    
    const keys: (keyof Metrics)[] = ['cpu', 'ram', 'temp', 'bandwidth', 'diskIO', 'power']
    keys.forEach((k) => {
      const w = (weights as any)[k] ?? 0
      metricAccum[k] += optNorm * w * impactFactor
    })
  })

  const keys: (keyof Metrics)[] = ['cpu', 'ram', 'temp', 'bandwidth', 'diskIO', 'power']
  keys.forEach((k) => {
    if (k === 'temp') {
      metricAccum[k] = Math.min(100, Math.max(10, metricAccum[k]))
    } else {
      metricAccum[k] = Math.min(95, Math.max(5, metricAccum[k]))
    }
  })

  return metricAccum
}

function getStatus(m: Metrics): 'healthy' | 'warning' | 'critical' {
  const weightedAvg = (m.cpu * 0.35 + m.ram * 0.3 + m.temp * 0.35)
  if (weightedAvg > 82) return 'critical'
  if (weightedAvg > 60) return 'warning'
  return 'healthy'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GaugeBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value)
  const textColor = pct > 75 ? '#f09595' : pct > 50 ? '#ef9f27' : '#5dcaa5'
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: '#888780' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: textColor }}>{pct}%</span>
      </div>
      <div style={{ background: '#2c2c2a', borderRadius: 4, height: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  )
}

function Visual3D({
  code,
  metrics,
  frame,
  image,
  name,
}: {
  code: DomainCode
  metrics: Metrics
  frame: number
  image: string | null
  name: string
}) {
  const [rotY, setRotY] = useState(0)
  const [rotX, setRotX] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const lastMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!autoRotate) return
    setRotY((frame * 0.25) % 360)
  }, [frame, autoRotate])

  const status = getStatus(metrics)
  const led = status === 'healthy' ? '#1d9e75' : status === 'warning' ? '#ef9f27' : '#e24b4a'
  const blink = frame % 60 < 30

  const DOMAIN_ICONS: Record<DomainCode, string> = { SERVER: '🖥', STORAGE: '💾', NETWORK: '🌐' }

  function onMouseDown(e: React.MouseEvent) {
    setIsDragging(true); setAutoRotate(false)
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    setRotY((p) => p + dx * 0.5)
    setRotX((p) => Math.max(-35, Math.min(35, p + dy * 0.3)))
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }
  function onMouseUp() { setIsDragging(false) }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom((z) => Math.min(3, Math.max(0.5, z - e.deltaY * 0.001)))
  }
  function onDoubleClick() { setRotX(0); setRotY(0); setZoom(1); setAutoRotate(true) }

  const glowColor = status === 'healthy' ? 'rgba(29,158,117,0.35)' : status === 'warning' ? 'rgba(239,159,39,0.35)' : 'rgba(226,75,74,0.35)'
  const imgTransform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${zoom})`

  return (
    <div
      style={{ position: 'relative', width: '100%', height: 280, overflow: 'hidden', borderRadius: 8, cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp} onWheel={onWheel} onDoubleClick={onDoubleClick}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, #1a1a18 0%, #0a0a09 100%)' }}>
        <svg width="100%" height="100%" style={{ opacity: 0.12, position: 'absolute', inset: 0 }}>
          <defs>
            <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1d9e75" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: `translateX(-50%) scaleX(${zoom})`, width: 180, height: 14, background: 'radial-gradient(ellipse, rgba(0,0,0,0.7) 0%, transparent 72%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ transform: imgTransform, transition: isDragging ? 'none' : 'transform 0.04s linear', transformStyle: 'preserve-3d' }}>
          {image
            ? <img src={image} alt={name} draggable={false} style={{ maxHeight: 200, maxWidth: 380, objectFit: 'contain', filter: `drop-shadow(0 24px 48px rgba(0,0,0,0.9)) drop-shadow(0 0 28px ${glowColor})`, transition: 'filter 0.5s' }} />
            : <div style={{ fontSize: 80, opacity: 0.18 }}>{DOMAIN_ICONS[code]}</div>
          }
        </div>
      </div>
      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none' }}>
        {[{ label: 'CPU', value: metrics.cpu, color: '#534ab7' }, { label: 'RAM', value: metrics.ram, color: '#1d6e9e' }, { label: 'TEMP', value: metrics.temp, color: metrics.temp > 75 ? '#e24b4a' : '#ef9f27' }].map((m) => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(10,10,9,0.72)', borderRadius: 5, padding: '2px 7px', backdropFilter: 'blur(6px)', border: '0.5px solid #2c2c2a' }}>
            <span style={{ fontSize: 8, color: '#5f5e5a', width: 28, fontFamily: 'monospace' }}>{m.label}</span>
            <div style={{ width: 44, height: 3, background: '#1a1a18', borderRadius: 2 }}>
              <div style={{ width: `${m.value}%`, height: '100%', background: m.color, borderRadius: 2, transition: 'width 0.45s' }} />
            </div>
            <span style={{ fontSize: 8, color: m.color, width: 24, textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(m.value)}%</span>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(10,10,9,0.72)', borderRadius: 5, padding: '3px 8px', backdropFilter: 'blur(6px)', border: `0.5px solid ${led}44` }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: blink ? led : 'transparent', border: `1.5px solid ${led}`, boxShadow: blink ? `0 0 6px ${led}` : 'none', transition: 'all 0.1s' }} />
          <span style={{ fontSize: 8, color: led, fontFamily: 'monospace', letterSpacing: '0.08em' }}>{status === 'healthy' ? 'OPTIMAL' : status === 'warning' ? 'ATTENTION' : 'CRITIQUE'}</span>
        </div>
        <div style={{ background: 'rgba(10,10,9,0.72)', borderRadius: 5, padding: '2px 8px', backdropFilter: 'blur(6px)', border: '0.5px solid #2c2c2a' }}>
          <span style={{ fontSize: 8, color: metrics.temp > 75 ? '#e24b4a' : metrics.temp > 55 ? '#ef9f27' : '#1d9e75', fontFamily: 'monospace' }}>{Math.round(28 + metrics.temp * 0.45)}°C</span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
        <span style={{ fontSize: 8, color: '#2a2a28', fontFamily: 'monospace' }}>DRAG · SCROLL · DBL-CLIC reset</span>
      </div>
      {zoom !== 1 && (
        <div style={{ position: 'absolute', bottom: 6, right: 8, background: 'rgba(10,10,9,0.72)', borderRadius: 4, padding: '1px 6px', pointerEvents: 'none' }}>
          <span style={{ fontSize: 8, color: '#5f5e5a', fontFamily: 'monospace' }}>{zoom.toFixed(1)}×</span>
        </div>
      )}
    </div>
  )
}

const DOMAIN_LABELS: Record<DomainCode, string> = { SERVER: 'Serveur', STORAGE: 'Storage', NETWORK: 'Réseau' }
const DOMAIN_ICONS: Record<DomainCode, string> = { SERVER: '🖥', STORAGE: '💾', NETWORK: '🌐' }

// ─── Needs Panel ──────────────────────────────────────────────────────────────

function NeedsPanel({
  domainCode,
  needs,
  onChange,
}: {
  domainCode: DomainCode
  needs: NeedsState
  onChange: (id: string, val: number | string) => void
}) {
  const fields = DOMAIN_NEEDS[domainCode]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {fields.map((field) => {
        const val = needs[field.id] ?? field.defaultValue
        return (
          <div key={field.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 11, color: '#888780' }}>{field.label}</label>
              {field.type === 'slider' && (
                <span style={{ fontSize: 10, color: '#d3d1c7', fontFamily: 'monospace' }}>
                  {field.id === 'iops'
                    ? Number(val) >= 1000
                      ? `${(Number(val) / 1000).toFixed(0)}k`
                      : Number(val)
                    : Number(val)} {field.unit}
                </span>
              )}
            </div>
            {field.type === 'slider' && (
              <>
                <input
                  type="range"
                  min={field.min} max={field.max} step={field.step}
                  value={Number(val)}
                  onChange={(e) => onChange(field.id, Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#1d9e75', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 8, color: '#333' }}>{field.min}{field.unit}</span>
                  <span style={{ fontSize: 8, color: '#333' }}>{field.max! >= 1000 ? `${(field.max! / 1000).toFixed(0)}k` : field.max}{field.unit}</span>
                </div>
              </>
            )}
            {field.type === 'select' && field.options && (
              <select
                value={String(val)}
                onChange={(e) => onChange(field.id, e.target.value)}
                style={{
                  width: '100%', background: '#0f0f0e', border: '0.5px solid #2c2c2a',
                  borderRadius: 6, color: '#d3d1c7', fontSize: 11, padding: '5px 8px',
                  cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                }}
              >
                {field.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Options Panel ────────────────────────────────────────────────────────────

function OptionsPanel({
  product,
  optionsState,
  onToggle,
}: {
  product: ProductDetail
  optionsState: OptionsState
  onToggle: (optId: number, valueIdx: number | null) => void
}) {
  if (product.options.length === 0) {
    return <p style={{ fontSize: 12, color: '#444441' }}>Aucune option configurable pour ce produit.</p>
  }

  // Fonction pour gérer le toggle avec désélection
  const handleToggle = (optId: number, valueIdx: number) => {
    const currentSelected = optionsState[optId]
    // Si on clique sur la même option déjà sélectionnée, on la désélectionne
    if (currentSelected === valueIdx) {
      onToggle(optId, null)
    } else {
      onToggle(optId, valueIdx)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {product.options.map((opt) => {
        const selectedIdx = optionsState[opt.id] ?? null

        // Grouper les valeurs par group_name (titre de section, ex: "4-Core").
        // On utilise group_name en priorité, value en repli (rétrocompat),
        // et le nom de l'option elle-même en dernier recours.
        const groupedValues: Record<string, ConfigOptionValue[]> = {}
        opt.values.forEach((v) => {
          const rawGroup = v.group_name ?? v.value
          const groupName = rawGroup && rawGroup.trim() !== '' ? rawGroup : (opt.name || 'Options')

          if (!groupedValues[groupName]) {
            groupedValues[groupName] = []
          }
          groupedValues[groupName].push(v)
        })

        return (
          <div key={opt.id}>
            {/* Nom de l'option (ex: CPU) */}
            <div style={{ 
              fontSize: 12, 
              color: '#1d9e75', 
              letterSpacing: '0.1em', 
              marginBottom: 12,
              fontWeight: 600
            }}>
              {opt.name.toUpperCase()}
            </div>
            
            {/* Sous-groupes (ex: 4-CORE) */}
            {Object.entries(groupedValues).map(([groupName, values]) => (
              <div key={`${opt.id}-${groupName}`} style={{ marginBottom: 12 }}>
                <div style={{ 
                  fontSize: 10, 
                  color: '#888780', 
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                  paddingLeft: 4,
                  fontWeight: 500
                }}>
                  {groupName.toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {values.map((v) => {
                    // Trouver l'index réel dans le tableau original (référence stable pour le state)
                    const realIndex = opt.values.findIndex(ov => ov.id === v.id)
                    const isSelected = selectedIdx === realIndex
                    // Le nom affiché est toujours le nom du produit standard,
                    // jamais le group_name ni l'id brut.
                    const displayName = v.standard_product?.name ?? v.value ?? v.id.toString()

                    return (
                      <div
                        key={`${opt.id}-${v.id}`}
                        style={{
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 10,
                          background: isSelected ? 'rgba(29,158,117,0.08)' : '#0f0f0e',
                          border: `0.5px solid ${isSelected ? '#1d9e75' : '#1e1e1c'}`,
                          borderRadius: 6, 
                          padding: '6px 10px', 
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onClick={() => handleToggle(opt.id, realIndex)}
                      >
                        <input
                          type="radio"
                          name={`option-${opt.id}`}
                          checked={isSelected}
                          onChange={() => handleToggle(opt.id, realIndex)}
                          style={{ 
                            accentColor: '#1d9e75', 
                            width: 13, 
                            height: 13, 
                            flexShrink: 0,
                            cursor: 'pointer'
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: 10.5, 
                            color: isSelected ? '#e1f5ee' : '#d3d1c7',
                            lineHeight: 1.3,
                          }}>
                            {displayName}
                          </div>
                        </div>
                        {v.price > 0 && (
                          <div style={{ 
                            fontSize: 10.5, 
                            color: isSelected ? '#1d9e75' : '#888780',
                            fontWeight: isSelected ? 500 : 400,
                            flexShrink: 0,
                            marginLeft: 8
                          }}>
                            {v.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </div>
                        )}
                        {isSelected && (
                          <span style={{ 
                            fontSize: 11, 
                            color: '#1d9e75', 
                            flexShrink: 0,
                            marginLeft: 4
                          }}>
                            ✓
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}



// ─── Main page ────────────────────────────────────────────────────────────────

export default function SimulationPage() {
  const router = useRouter()

  const [configProducts, setConfigProducts] = useState<CatalogModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<'choose' | 'pick-model' | 'simulate'>('choose')
  const [activeDomain, setActiveDomain] = useState<DomainCode>('SERVER')
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [brandFilter, setBrandFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [needs, setNeeds] = useState<NeedsState>({})
  const [needsPerDomain, setNeedsPerDomain] = useState<Record<DomainCode, NeedsState>>({
    SERVER: {},
    STORAGE: {},
    NETWORK: {}
  })
  const [optionsState, setOptionsState] = useState<OptionsState>({})

  const [frame, setFrame] = useState(0)
  const rafRef = useRef<number | null>(null)

  const [activePanel, setActivePanel] = useState<'needs' | 'options'>('needs')

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/catalog', { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error('err'); return r.json() })
      .then((data) => {
        const models: CatalogModel[] = Array.isArray(data.models) ? data.models : []
        setConfigProducts(models.filter((m) => m.condition === 'CONFIGURABLE'))
      })
      .catch((e) => { if (e.name !== 'AbortError') setError('Impossible de charger le catalogue.') })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    let f = 0
    const tick = () => { f++; setFrame(f); rafRef.current = requestAnimationFrame(tick) }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const byDomain = useMemo<Record<DomainCode, CatalogModel[]>>(() => {
    const map: Record<DomainCode, CatalogModel[]> = { SERVER: [], STORAGE: [], NETWORK: [] }
    configProducts.forEach((m) => {
      const code = inferDomainCode(m.domainId, m.categoryName, m.familyName)
      map[code].push(m)
    })
    return map
  }, [configProducts])

  const brandsForDomain = useMemo<string[]>(() => {
    const models = byDomain[activeDomain]
    const set = new Set(models.map((m) => m.brandName).filter(Boolean))
    return Array.from(set).sort()
  }, [byDomain, activeDomain])

  const filteredModels = useMemo(() => {
    let models = byDomain[activeDomain]
    if (brandFilter !== 'ALL') models = models.filter((m) => m.brandName === brandFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      models = models.filter((m) => m.name.toLowerCase().includes(q) || m.brandName.toLowerCase().includes(q))
    }
    return models
  }, [byDomain, activeDomain, brandFilter, searchQuery])

  async function selectModel(m: CatalogModel) {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/products/${m.id}/options`)
      if (!res.ok) throw new Error('err')
      const data = await res.json()
      const opts: ConfigOption[] = Array.isArray(data.options) ? data.options : []
      
      const domCode = inferDomainCode(m.domainId, m.categoryName, m.familyName)
      
      setSelectedProduct({
        id: m.id,
        name: m.name,
        brandName: m.brandName,
        categoryName: m.categoryName,
        familyName: m.familyName,
        basePrice: m.basePrice,
        image: m.image,
        inStock: (m.stockQty ?? 0) > 0,
        domainId: m.domainId,
        options: opts,
      })
      
      const savedNeeds = needsPerDomain[domCode] || {}
      const initNeeds: NeedsState = {}
      DOMAIN_NEEDS[domCode].forEach((f) => {
        initNeeds[f.id] = savedNeeds[f.id] ?? f.defaultValue
      })
      setNeeds(initNeeds)
      
      const initOpts: OptionsState = {}
      opts.forEach((o) => { initOpts[o.id] = null })
      setOptionsState(initOpts)
      setStep('simulate')
    } catch {
      setError('Impossible de charger les options.')
    } finally {
      setLoadingDetail(false)
    }
  }

  const domainCode = selectedProduct
    ? inferDomainCode(selectedProduct.domainId, selectedProduct.categoryName, selectedProduct.familyName)
    : activeDomain

  const metrics = useMemo<Metrics>(() => {
    if (!selectedProduct) return { cpu: 5, ram: 5, temp: 5, bandwidth: 5, diskIO: 5, power: 5 }
    return computeMetrics(domainCode, selectedProduct, needs, optionsState)
  }, [selectedProduct, domainCode, needs, optionsState])

  const status = getStatus(metrics)
  const statusColor = {
    healthy: { border: '#0f6e56', glow: '0 0 24px rgba(29,158,117,0.14)', dot: '#1d9e75' },
    warning: { border: '#854f0b', glow: '0 0 24px rgba(239,159,39,0.14)', dot: '#ef9f27' },
    critical: { border: '#993c1d', glow: '0 0 24px rgba(226,75,74,0.14)', dot: '#e24b4a' },
  }[status]

  const checkedOptions = useMemo(() => {
    if (!selectedProduct) return []
    return selectedProduct.options
      .map((opt) => {
        const idx = optionsState[opt.id]
        if (idx === null || idx === undefined) return null
        const val = opt.values[idx]
        if (!val) return null
        const displayValue = val.standard_product?.name ?? val.value ?? val.id.toString()
        return { optName: opt.name, value: displayValue, price: val.price }
      })
      .filter(Boolean) as { optName: string; value: string; price: number }[]
  }, [selectedProduct, optionsState])

  const addedPrice = checkedOptions.reduce((s, v) => s + v.price, 0)

  const S = {
    page: { minHeight: '100vh', background: '#0a0a09', color: '#d3d1c7', fontFamily: "ui-monospace,'SFMono-Regular',monospace" } as React.CSSProperties,
    hdr: { borderBottom: '0.5px solid #1e1e1c', padding: '13px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
    card: { background: '#0f0f0e', border: '0.5px solid #1e1e1c', borderRadius: 14, padding: '16px 18px' } as React.CSSProperties,
  }

  const handleNeedChange = (id: string, val: number | string) => {
    setNeeds((prev) => {
      const newNeeds = { ...prev, [id]: val }
      setNeedsPerDomain((prevDomains) => ({
        ...prevDomains,
        [domainCode]: newNeeds
      }))
      return newNeeds
    })
  }

  // ── STEP 1 ─────────────────────────────────────────────────────────────────
  if (step === 'choose') {
    return (
      <div style={S.page}>
        <div style={S.hdr}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1d9e75', boxShadow: '0 0 8px #1d9e75' }} />
            <span style={{ fontSize: 11, color: '#5f5e5a', letterSpacing: '0.12em' }}>SIMULATEUR INFRASTRUCTURE</span>
          </div>
        </div>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 28px' }}>
          <p style={{ fontSize: 10, color: '#5f5e5a', letterSpacing: '0.2em', marginBottom: 12 }}>ÉTAPE 01 / DOMAINE</p>
          <h1 style={{ fontSize: 32, fontWeight: 400, color: '#f1efe8', marginBottom: 10, lineHeight: 1.22 }}>
            Choisissez votre<br /><span style={{ color: '#1d9e75' }}>infrastructure</span>
          </h1>
          <p style={{ fontSize: 13, color: '#5f5e5a', marginBottom: 48 }}>
            {loading ? 'Chargement du catalogue…' : error ?? `${configProducts.length} produit(s) configurable(s)`}
          </p>
          {loading
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#5f5e5a', fontSize: 13 }}>
                <div style={{ width: 18, height: 18, border: '2px solid #1d9e75', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Chargement…
              </div>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
                {(['SERVER', 'STORAGE', 'NETWORK'] as DomainCode[]).map((code) => {
                  const count = byDomain[code].length
                  const descs: Record<DomainCode, string> = {
                    SERVER: 'Serveurs physiques haute performance — rack, tour, blade',
                    STORAGE: 'Baies SAN/NAS entreprise — RAID, SSD/HDD hybride',
                    NETWORK: 'Switchs manageable L2/L3 — ports, VLANs, uplinks',
                  }
                  return (
                    <button
                      key={code}
                      onClick={() => { setActiveDomain(code); setBrandFilter('ALL'); setSearchQuery(''); setStep('pick-model') }}
                      disabled={count === 0}
                      style={{ background: 'transparent', border: '0.5px solid #2c2c2a', borderRadius: 12, padding: '24px 18px', cursor: count === 0 ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: count === 0 ? 0.4 : 1, transition: 'all 0.18s', position: 'relative' }}
                      onMouseEnter={(e) => { if (count > 0) { e.currentTarget.style.borderColor = '#1d9e75'; e.currentTarget.style.background = 'rgba(29,158,117,0.04)' } }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2c2c2a'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 12 }}>{DOMAIN_ICONS[code]}</div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#f1efe8', marginBottom: 6 }}>{DOMAIN_LABELS[code]}</div>
                      <div style={{ fontSize: 11, color: '#5f5e5a', marginBottom: 16, lineHeight: 1.65 }}>{descs[code]}</div>
                      <div style={{ fontSize: 11, color: count > 0 ? '#1d9e75' : '#444441' }}>{count} modèle{count !== 1 ? 's' : ''}</div>
                      <div style={{ position: 'absolute', bottom: 18, right: 18, fontSize: 16, color: '#2c2c2a' }}>→</div>
                    </button>
                  )
                })}
              </div>
            )
          }
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── STEP 2 ─────────────────────────────────────────────────────────────────
  if (step === 'pick-model') {
    return (
      <div style={S.page}>
        <div style={S.hdr}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setStep('choose')} style={{ background: 'none', border: 'none', color: '#5f5e5a', cursor: 'pointer', fontSize: 12, padding: 0 }}>← Retour</button>
            <span style={{ color: '#1e1e1c' }}>|</span>
            <span style={{ fontSize: 11, color: '#5f5e5a', letterSpacing: '0.1em' }}>SÉLECTION / <span style={{ color: '#1d9e75' }}>{DOMAIN_LABELS[activeDomain].toUpperCase()}</span></span>
          </div>
          <span style={{ fontSize: 11, color: '#5f5e5a' }}>{filteredModels.length} / {byDomain[activeDomain].length} modèle(s)</span>
        </div>

        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '36px 28px' }}>
          <p style={{ fontSize: 10, color: '#5f5e5a', letterSpacing: '0.2em', marginBottom: 10 }}>ÉTAPE 02 / MODÈLE</p>
          <h2 style={{ fontSize: 24, fontWeight: 400, color: '#f1efe8', marginBottom: 24 }}>
            Choisissez un <span style={{ color: '#1d9e75' }}>modèle à simuler</span>
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#444441', pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                placeholder="Rechercher un modèle…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0f0f0e', border: '0.5px solid #2c2c2a', borderRadius: 8,
                  color: '#d3d1c7', fontSize: 12, padding: '8px 12px 8px 32px',
                  outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#1d9e75' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#2c2c2a' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setBrandFilter('ALL')}
                style={{ background: brandFilter === 'ALL' ? '#1d9e75' : 'transparent', border: `0.5px solid ${brandFilter === 'ALL' ? '#1d9e75' : '#2c2c2a'}`, borderRadius: 6, color: brandFilter === 'ALL' ? '#0a0a09' : '#888780', fontSize: 11, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s' }}
              >
                Toutes
              </button>
              {brandsForDomain.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setBrandFilter(brand)}
                  style={{ background: brandFilter === brand ? '#1d9e75' : 'transparent', border: `0.5px solid ${brandFilter === brand ? '#1d9e75' : '#2c2c2a'}`, borderRadius: 6, color: brandFilter === brand ? '#0a0a09' : '#888780', fontSize: 11, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s' }}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {loadingDetail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#5f5e5a', fontSize: 13, marginBottom: 20 }}>
              <div style={{ width: 16, height: 16, border: '2px solid #1d9e75', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Chargement des options…
            </div>
          )}

          {filteredModels.length === 0
            ? <p style={{ color: '#5f5e5a', fontSize: 13 }}>Aucun résultat pour ces filtres.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                {filteredModels.map((m) => {
                  const inStock = (m.stockQty ?? 0) > 0
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectModel(m)}
                      disabled={loadingDetail}
                      style={{ background: '#0f0f0e', border: '0.5px solid #1e1e1c', borderRadius: 12, padding: '14px 13px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1d9e75'; e.currentTarget.style.background = 'rgba(29,158,117,0.05)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e1e1c'; e.currentTarget.style.background = '#0f0f0e' }}
                    >
                      <div style={{ width: '100%', aspectRatio: '16/9', background: '#1a1a18', borderRadius: 7, marginBottom: 11, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.image
                          ? <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 24, opacity: 0.3 }}>{DOMAIN_ICONS[activeDomain]}</span>
                        }
                      </div>
                      <div style={{ fontSize: 9, color: '#5f5e5a', marginBottom: 3 }}>{m.brandName}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#f1efe8', marginBottom: 9, lineHeight: 1.45 }}>{m.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#1d9e75' }}>{m.basePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                        <span style={{ fontSize: 8, color: inStock ? '#1d9e75' : '#ef9f27' }}>{inStock ? '● Stock' : '○ Rupture'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          }
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── STEP 3 — SIMULATION ────────────────────────────────────────────────────
  if (!selectedProduct) return null

  return (
    <div style={S.page}>
      <div style={S.hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setStep('pick-model')} style={{ background: 'none', border: 'none', color: '#5f5e5a', cursor: 'pointer', fontSize: 12, padding: 0 }}>← Retour</button>
          <span style={{ color: '#1e1e1c' }}>|</span>
          <span style={{ fontSize: 11, color: '#5f5e5a', letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
            SIMULATION / <span style={{ color: '#1d9e75' }}>{selectedProduct.name}</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor.dot, boxShadow: `0 0 7px ${statusColor.dot}` }} />
          <span style={{ fontSize: 11, color: statusColor.dot }}>
            {status === 'healthy' ? 'OPTIMAL' : status === 'warning' ? 'ATTENTION' : 'CRITIQUE'}
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '270px 1fr 270px',
        minHeight: 'calc(100vh - 46px)',
      }}>

        <div style={{ borderRight: '0.5px solid #1a1a18', padding: '20px 16px', overflowY: 'auto', background: '#0c0c0b' }}>
          <p style={{ fontSize: 10, color: '#5f5e5a', letterSpacing: '0.15em', marginBottom: 6 }}>MES BESOINS</p>
          <p style={{ fontSize: 9, color: '#333', marginBottom: 18, lineHeight: 1.6 }}>
            Définissez vos exigences — les métriques se recalculent en temps réel.
          </p>
          <NeedsPanel
            domainCode={domainCode}
            needs={needs}
            onChange={handleNeedChange}
          />
        </div>

        <div style={{ padding: '20px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{
            ...S.card,
            border: `0.5px solid ${statusColor.border}`,
            boxShadow: statusColor.glow,
            transition: 'border-color 0.5s,box-shadow 0.5s',
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 9, color: '#5f5e5a', letterSpacing: '0.1em' }}>VISUALISATION — {selectedProduct.brandName.toUpperCase()}</span>
              <span style={{ fontSize: 9, color: '#444441' }}>{DOMAIN_LABELS[domainCode].toUpperCase()}</span>
            </div>
            <Visual3D
              code={domainCode}
              metrics={metrics}
              frame={frame}
              image={selectedProduct.image}
              name={selectedProduct.name}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { 
                label: 'CPU', 
                value: metrics.cpu, 
                color: metrics.cpu > 75 ? '#e24b4a' : metrics.cpu > 50 ? '#ef9f27' : '#534ab7' 
              },
              { 
                label: 'RAM', 
                value: metrics.ram, 
                color: metrics.ram > 75 ? '#e24b4a' : metrics.ram > 50 ? '#ef9f27' : '#1d6e9e' 
              },
              { 
                label: 'Température', 
                value: metrics.temp, 
                color: metrics.temp > 75 ? '#e24b4a' : metrics.temp > 50 ? '#ef9f27' : '#1d9e75' 
              },
              { 
                label: 'Bande passante', 
                value: metrics.bandwidth, 
                color: metrics.bandwidth > 75 ? '#e24b4a' : metrics.bandwidth > 50 ? '#ef9f27' : '#1d9e75' 
              },
              { 
                label: 'Disque I/O', 
                value: metrics.diskIO, 
                color: metrics.diskIO > 75 ? '#e24b4a' : metrics.diskIO > 50 ? '#ef9f27' : '#993c1d' 
              },
              { 
                label: 'Consommation', 
                value: metrics.power, 
                color: metrics.power > 75 ? '#e24b4a' : metrics.power > 50 ? '#ef9f27' : '#ba7517' 
              },
            ].map((mc) => (
              <div key={mc.label} style={{ ...S.card, padding: '10px 12px' }}>
                <div style={{ fontSize: 8, color: '#5f5e5a', letterSpacing: '0.08em', marginBottom: 4 }}>{mc.label.toUpperCase()}</div>
                <div style={{ fontSize: 18, fontWeight: 400, color: '#f1efe8', marginBottom: 5 }}>
                  {Math.round(mc.value)}<span style={{ fontSize: 9, color: '#5f5e5a' }}>%</span>
                </div>
                <div style={{ background: '#1a1a18', borderRadius: 3, height: 3 }}>
                  <div style={{ width: `${mc.value}%`, height: '100%', borderRadius: 3, background: mc.color, transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
              </div>
            ))}
          </div>

          {status !== 'healthy' && (
            <div style={{ background: status === 'critical' ? 'rgba(153,60,29,0.1)' : 'rgba(133,79,11,0.1)', border: `0.5px solid ${statusColor.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 11, color: status === 'critical' ? '#f09595' : '#fac775' }}>
              {status === 'critical' ? '⚠ Charge critique — la configuration actuelle dépasse les capacités recommandées.' : '⚠ Charge élevée — certains besoins sollicitent fortement les ressources.'}
            </div>
          )}

          <div style={S.card}>
            <p style={{ fontSize: 10, color: '#5f5e5a', letterSpacing: '0.1em', marginBottom: 10 }}>RÉCAPITULATIF</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
              <span style={{ color: '#888780' }}>Produit</span>
              <span style={{ color: '#d3d1c7', maxWidth: '58%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedProduct.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 10 }}>
              <span style={{ color: '#888780' }}>Prix de base</span>
              <span style={{ color: '#d3d1c7' }}>{selectedProduct.basePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
            </div>
            {checkedOptions.length === 0
              ? <p style={{ fontSize: 10, color: '#333', marginBottom: 10 }}>Aucune option sélectionnée.</p>
              : checkedOptions.map((cv) => (
                <div key={cv.optName} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                  <span style={{ color: '#888780', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '48%' }}>{cv.optName}</span>
                  <span style={{ color: '#d3d1c7', maxWidth: '50%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cv.value} {cv.price > 0 && <span style={{ color: '#1d9e75' }}>+{cv.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>}
                  </span>
                </div>
              ))
            }
            <div style={{ borderTop: '0.5px solid #1e1e1c', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#5f5e5a' }}>Total estimé</span>
              <span style={{ color: '#1d9e75', fontWeight: 500 }}>{(selectedProduct.basePrice + addedPrice).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
            </div>
          </div>

          <button
            onClick={() => router.push(`/configurator/${selectedProduct.id}`)}
            style={{ background: '#1d9e75', border: 'none', borderRadius: 10, padding: '14px 20px', color: '#0a0a09', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#0f6e56'; e.currentTarget.style.color = '#e1f5ee' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1d9e75'; e.currentTarget.style.color = '#0a0a09' }}
          >
            <span>Configurer — {selectedProduct.name}</span>
            <span style={{ fontSize: 16 }}>→</span>
          </button>
        </div>

        <div style={{ borderLeft: '0.5px solid #1a1a18', padding: '20px 16px', overflowY: 'auto', background: '#0c0c0b' }}>
          <p style={{ fontSize: 10, color: '#5f5e5a', letterSpacing: '0.15em', marginBottom: 6 }}>OPTIONS PRODUIT</p>
          <p style={{ fontSize: 9, color: '#333', marginBottom: 16, lineHeight: 1.6 }}>
            Cochez une valeur par option pour affiner la simulation.
          </p>

          <OptionsPanel
            product={selectedProduct}
            optionsState={optionsState}
            onToggle={(optId, valueIdx) => setOptionsState((prev) => ({ ...prev, [optId]: valueIdx }))}
          />

          <div style={{ borderTop: '0.5px solid #1a1a18', marginTop: 20, paddingTop: 16 }}>
            <p style={{ fontSize: 10, color: '#5f5e5a', letterSpacing: '0.15em', marginBottom: 12 }}>APERÇU MÉTRIQUES</p>
            <GaugeBar label="CPU" value={metrics.cpu} color="#534ab7" />
            <GaugeBar label="RAM" value={metrics.ram} color="#1d6e9e" />
            <GaugeBar label="Température" value={metrics.temp} color={metrics.temp > 75 ? '#e24b4a' : '#ef9f27'} />
            <GaugeBar label="Bande passante" value={metrics.bandwidth} color="#1d9e75" />
            <GaugeBar label="Disque I/O" value={metrics.diskIO} color="#993c1d" />
            <GaugeBar label="Consommation" value={metrics.power} color="#ba7517" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 900px) {
          .sim-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}