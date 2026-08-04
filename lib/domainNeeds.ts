export type DomainCode = 'SERVER' | 'STORAGE' | 'NETWORK'

export interface NeedField {
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

export type NeedsState = Record<string, number | string>

export const DOMAIN_NEEDS: Record<DomainCode, NeedField[]> = {
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
