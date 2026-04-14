import { EquipmentFilterFieldTypeEnum, ProductConditionEnum, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

type DomainSeed = { id: string; name: string; slug: string; code: string }
type BrandSeed = { id: string; name: string; slug: string; domainIds: string[] }
type SeriesSeed = {
  id: string
  name: string
  slug: string
  brandId: string
  domainId: string
}
type ModelSeed = {
  id: string
  name: string
  slug: string
  reference: string
  seriesId: string
  brandId: string
  domainId: string
}
type FilterOptionSeed = string

type FilterSeed = {
  label: string
  fieldKey: string
  type: 'select' | 'boolean' | 'text' | 'number'
  unit: string | null
  order: number
  options: FilterOptionSeed[]
}

type FilterGroupSeed = {
  name: string
  slug: string
  order: number
  filters: FilterSeed[]
}

type ProductSeed = {
  modelId: string
  sku: string
  name: string
  price: number
  condition: 'A' | 'B' | 'C'
  stock: number
  attributes: Record<string, string>
}

// ============================================================
// SEED COMPLET — Renewtech Clone
// Donnees reelles extraites de renewtech.fr
// ============================================================

// ============================================================
// DOMAINES
// ============================================================
const domains: DomainSeed[] = [
  { id: 'dom_server', name: 'Server', slug: 'server', code: 'SERVER' },
  { id: 'dom_storage', name: 'Storage', slug: 'storage', code: 'STORAGE' },
  { id: 'dom_network', name: 'Network', slug: 'network', code: 'NETWORK' },
]

// ============================================================
// MARQUES
// ============================================================
const brands: BrandSeed[] = [
  { id: 'br_cisco', name: 'Cisco', slug: 'cisco', domainIds: ['dom_server', 'dom_network'] },
  { id: 'br_dell', name: 'Dell EMC', slug: 'dell-emc', domainIds: ['dom_server', 'dom_storage'] },
  { id: 'br_hpe', name: 'HPE', slug: 'hpe', domainIds: ['dom_server', 'dom_storage', 'dom_network'] },
  { id: 'br_ibm', name: 'IBM', slug: 'ibm', domainIds: ['dom_server', 'dom_storage'] },
  { id: 'br_lenovo', name: 'Lenovo', slug: 'lenovo', domainIds: ['dom_server', 'dom_storage'] },
  { id: 'br_fujitsu', name: 'Fujitsu', slug: 'fujitsu', domainIds: ['dom_server', 'dom_storage'] },
  { id: 'br_supermicro', name: 'Supermicro', slug: 'supermicro', domainIds: ['dom_server'] },
  { id: 'br_netapp', name: 'NetApp', slug: 'netapp', domainIds: ['dom_storage'] },
  { id: 'br_brocade', name: 'Brocade', slug: 'brocade', domainIds: ['dom_network'] },
  { id: 'br_arista', name: 'Arista', slug: 'arista', domainIds: ['dom_network'] },
]

// ============================================================
// SERIES (Familles)
// ============================================================
const series: SeriesSeed[] = [
  { id: 'sr_cisco_rack', name: 'Rack Servers', slug: 'rack-servers', brandId: 'br_cisco', domainId: 'dom_server' },
  { id: 'sr_cisco_blade', name: 'Blade Servers', slug: 'blade-servers', brandId: 'br_cisco', domainId: 'dom_server' },
  { id: 'sr_dell_rack', name: 'Rack Servers', slug: 'rack-servers', brandId: 'br_dell', domainId: 'dom_server' },
  { id: 'sr_dell_tower', name: 'Tower Servers', slug: 'tower-servers', brandId: 'br_dell', domainId: 'dom_server' },
  { id: 'sr_dell_blade', name: 'Blade Servers', slug: 'blade-servers', brandId: 'br_dell', domainId: 'dom_server' },
  { id: 'sr_hpe_rack', name: 'Rack Servers', slug: 'rack-servers', brandId: 'br_hpe', domainId: 'dom_server' },
  { id: 'sr_hpe_tower', name: 'Tower Servers', slug: 'tower-servers', brandId: 'br_hpe', domainId: 'dom_server' },
  { id: 'sr_hpe_blade', name: 'Blade Servers', slug: 'blade-servers', brandId: 'br_hpe', domainId: 'dom_server' },
  { id: 'sr_ibm_rack', name: 'Rack Servers', slug: 'rack-servers', brandId: 'br_ibm', domainId: 'dom_server' },
  { id: 'sr_ibm_blade', name: 'Blade Servers', slug: 'blade-servers', brandId: 'br_ibm', domainId: 'dom_server' },
  { id: 'sr_len_rack', name: 'Rack Servers', slug: 'rack-servers', brandId: 'br_lenovo', domainId: 'dom_server' },
  { id: 'sr_len_tower', name: 'Tower Servers', slug: 'tower-servers', brandId: 'br_lenovo', domainId: 'dom_server' },
  { id: 'sr_len_blade', name: 'Blade Servers', slug: 'blade-servers', brandId: 'br_lenovo', domainId: 'dom_server' },
  { id: 'sr_fuj_rack', name: 'Rack Servers', slug: 'rack-servers', brandId: 'br_fujitsu', domainId: 'dom_server' },
  { id: 'sr_sm_1u', name: '1U', slug: '1u', brandId: 'br_supermicro', domainId: 'dom_server' },
  { id: 'sr_sm_2u', name: '2U', slug: '2u', brandId: 'br_supermicro', domainId: 'dom_server' },
  { id: 'sr_sm_gpu', name: 'GPU Systems', slug: 'gpu-systems', brandId: 'br_supermicro', domainId: 'dom_server' },
  { id: 'sr_dell_pv', name: 'PowerVault', slug: 'powervault', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'sr_dell_vnx', name: 'VNX', slug: 'vnx', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'sr_dell_unity', name: 'Unity', slug: 'unity', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'sr_hpe_msa', name: 'MSA Storage', slug: 'msa-storage', brandId: 'br_hpe', domainId: 'dom_storage' },
  { id: 'sr_hpe_disk', name: 'Disk Enclosures', slug: 'disk-enclosures', brandId: 'br_hpe', domainId: 'dom_storage' },
  { id: 'sr_ibm_v3700', name: 'Storwize V3700', slug: 'storwize-v3700', brandId: 'br_ibm', domainId: 'dom_storage' },
  { id: 'sr_ibm_v5000', name: 'Storwize V5000', slug: 'storwize-v5000', brandId: 'br_ibm', domainId: 'dom_storage' },
  { id: 'sr_ibm_v7000', name: 'Storwize V7000', slug: 'storwize-v7000', brandId: 'br_ibm', domainId: 'dom_storage' },
  { id: 'sr_ibm_flash5', name: 'FlashSystem 5000', slug: 'flashsystem-5000', brandId: 'br_ibm', domainId: 'dom_storage' },
  { id: 'sr_ibm_flash7', name: 'FlashSystem 7000', slug: 'flashsystem-7000', brandId: 'br_ibm', domainId: 'dom_storage' },
  { id: 'sr_ibm_flash9', name: 'FlashSystem 9000', slug: 'flashsystem-9000', brandId: 'br_ibm', domainId: 'dom_storage' },
  { id: 'sr_na_ds', name: 'DS Series', slug: 'ds-series', brandId: 'br_netapp', domainId: 'dom_storage' },
  { id: 'sr_na_e', name: 'E Series', slug: 'e-series', brandId: 'br_netapp', domainId: 'dom_storage' },
  { id: 'sr_cisco_cat29', name: 'Catalyst 2960', slug: 'catalyst-2960', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'sr_cisco_cat93', name: 'Catalyst 9300', slug: 'catalyst-9300', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'sr_cisco_cat92', name: 'Catalyst 9200', slug: 'catalyst-9200', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'sr_cisco_nex9', name: 'Nexus 9000', slug: 'nexus-9000', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'sr_cisco_nex3', name: 'Nexus 3000', slug: 'nexus-3000', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'sr_bro_300', name: 'Brocade 300', slug: 'brocade-300', brandId: 'br_brocade', domainId: 'dom_network' },
  { id: 'sr_bro_600', name: 'Brocade 600', slug: 'brocade-600', brandId: 'br_brocade', domainId: 'dom_network' },
  { id: 'sr_bro_700', name: 'Brocade 700', slug: 'brocade-700', brandId: 'br_brocade', domainId: 'dom_network' },
  { id: 'sr_hpe_net', name: 'HPE Switches', slug: 'hpe-switches', brandId: 'br_hpe', domainId: 'dom_network' },
]

// ============================================================
// MODELES
// ============================================================
const models: ModelSeed[] = [
  { id: 'mdl_ucs_c220_m4', name: 'UCS C220 M4', slug: 'ucs-c220-m4', reference: 'UCS-C220-M4S', seriesId: 'sr_cisco_rack', brandId: 'br_cisco', domainId: 'dom_server' },
  { id: 'mdl_ucs_c220_m5', name: 'UCS C220 M5', slug: 'ucs-c220-m5', reference: 'UCS-C220-M5SX', seriesId: 'sr_cisco_rack', brandId: 'br_cisco', domainId: 'dom_server' },
  { id: 'mdl_ucs_c240_m4', name: 'UCS C240 M4', slug: 'ucs-c240-m4', reference: 'UCS-C240-M4S', seriesId: 'sr_cisco_rack', brandId: 'br_cisco', domainId: 'dom_server' },
  { id: 'mdl_ucs_c240_m5', name: 'UCS C240 M5', slug: 'ucs-c240-m5', reference: 'UCS-C240-M5S', seriesId: 'sr_cisco_rack', brandId: 'br_cisco', domainId: 'dom_server' },
  { id: 'mdl_ucs_b200_m4', name: 'UCS B200 M4', slug: 'ucs-b200-m4', reference: 'UCS-B200-M4', seriesId: 'sr_cisco_blade', brandId: 'br_cisco', domainId: 'dom_server' },
  { id: 'mdl_ucs_b200_m5', name: 'UCS B200 M5', slug: 'ucs-b200-m5', reference: 'UCS-B200-M5', seriesId: 'sr_cisco_blade', brandId: 'br_cisco', domainId: 'dom_server' },
  { id: 'mdl_pe_r630', name: 'PowerEdge R630', slug: 'poweredge-r630', reference: 'PE-R630', seriesId: 'sr_dell_rack', brandId: 'br_dell', domainId: 'dom_server' },
  { id: 'mdl_pe_r730', name: 'PowerEdge R730', slug: 'poweredge-r730', reference: 'PE-R730', seriesId: 'sr_dell_rack', brandId: 'br_dell', domainId: 'dom_server' },
  { id: 'mdl_pe_r740', name: 'PowerEdge R740', slug: 'poweredge-r740', reference: 'PE-R740', seriesId: 'sr_dell_rack', brandId: 'br_dell', domainId: 'dom_server' },
  { id: 'mdl_pe_r750', name: 'PowerEdge R750', slug: 'poweredge-r750', reference: 'PE-R750', seriesId: 'sr_dell_rack', brandId: 'br_dell', domainId: 'dom_server' },
  { id: 'mdl_pe_r640', name: 'PowerEdge R640', slug: 'poweredge-r640', reference: 'PE-R640', seriesId: 'sr_dell_rack', brandId: 'br_dell', domainId: 'dom_server' },
  { id: 'mdl_pe_r440', name: 'PowerEdge R440', slug: 'poweredge-r440', reference: 'PE-R440', seriesId: 'sr_dell_rack', brandId: 'br_dell', domainId: 'dom_server' },
  { id: 'mdl_dl380_g10', name: 'ProLiant DL380 G10', slug: 'proliant-dl380-g10', reference: 'DL380-G10', seriesId: 'sr_hpe_rack', brandId: 'br_hpe', domainId: 'dom_server' },
  { id: 'mdl_dl360_g10', name: 'ProLiant DL360 G10', slug: 'proliant-dl360-g10', reference: 'DL360-G10', seriesId: 'sr_hpe_rack', brandId: 'br_hpe', domainId: 'dom_server' },
  { id: 'mdl_dl380_g9', name: 'ProLiant DL380 G9', slug: 'proliant-dl380-g9', reference: 'DL380-G9', seriesId: 'sr_hpe_rack', brandId: 'br_hpe', domainId: 'dom_server' },
  { id: 'mdl_dl360_g9', name: 'ProLiant DL360 G9', slug: 'proliant-dl360-g9', reference: 'DL360-G9', seriesId: 'sr_hpe_rack', brandId: 'br_hpe', domainId: 'dom_server' },
  { id: 'mdl_x3650_m5', name: 'System x3650 M5', slug: 'system-x3650-m5', reference: 'X3650-M5-8871', seriesId: 'sr_ibm_rack', brandId: 'br_ibm', domainId: 'dom_server' },
  { id: 'mdl_x3550_m5', name: 'System x3550 M5', slug: 'system-x3550-m5', reference: 'X3550-M5-8869', seriesId: 'sr_ibm_rack', brandId: 'br_ibm', domainId: 'dom_server' },
  { id: 'mdl_sr630', name: 'ThinkSystem SR630', slug: 'thinksystem-sr630', reference: 'SR630-7X02', seriesId: 'sr_len_rack', brandId: 'br_lenovo', domainId: 'dom_server' },
  { id: 'mdl_sr650', name: 'ThinkSystem SR650', slug: 'thinksystem-sr650', reference: 'SR650-7X06', seriesId: 'sr_len_rack', brandId: 'br_lenovo', domainId: 'dom_server' },
  { id: 'mdl_sr650_v2', name: 'ThinkSystem SR650 V2', slug: 'thinksystem-sr650-v2', reference: 'SR650V2-7Z73', seriesId: 'sr_len_rack', brandId: 'br_lenovo', domainId: 'dom_server' },
  { id: 'mdl_md1200', name: 'PowerVault MD1200', slug: 'powervault-md1200', reference: 'MD1200', seriesId: 'sr_dell_pv', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'mdl_md1220', name: 'PowerVault MD1220', slug: 'powervault-md1220', reference: 'MD1220', seriesId: 'sr_dell_pv', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'mdl_md3200', name: 'PowerVault MD3200', slug: 'powervault-md3200', reference: 'MD3200', seriesId: 'sr_dell_pv', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'mdl_md3600', name: 'PowerVault MD3600', slug: 'powervault-md3600', reference: 'MD3600', seriesId: 'sr_dell_pv', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'mdl_me4024', name: 'PowerVault ME4024', slug: 'powervault-me4024', reference: 'ME4024', seriesId: 'sr_dell_pv', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'mdl_vnx5200', name: 'VNX 5200', slug: 'vnx-5200', reference: 'VNX5200', seriesId: 'sr_dell_vnx', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'mdl_vnx5400', name: 'VNX 5400', slug: 'vnx-5400', reference: 'VNX5400', seriesId: 'sr_dell_vnx', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'mdl_unity300', name: 'Unity 300', slug: 'unity-300', reference: 'UNITY300', seriesId: 'sr_dell_unity', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'mdl_unity400', name: 'Unity 400', slug: 'unity-400', reference: 'UNITY400', seriesId: 'sr_dell_unity', brandId: 'br_dell', domainId: 'dom_storage' },
  { id: 'mdl_msa2050', name: 'MSA 2050', slug: 'msa-2050', reference: 'MSA2050', seriesId: 'sr_hpe_msa', brandId: 'br_hpe', domainId: 'dom_storage' },
  { id: 'mdl_msa2060', name: 'MSA 2060', slug: 'msa-2060', reference: 'MSA2060', seriesId: 'sr_hpe_msa', brandId: 'br_hpe', domainId: 'dom_storage' },
  { id: 'mdl_v3700', name: 'Storwize V3700', slug: 'storwize-v3700', reference: '2072-12C', seriesId: 'sr_ibm_v3700', brandId: 'br_ibm', domainId: 'dom_storage' },
  { id: 'mdl_v7000', name: 'Storwize V7000', slug: 'storwize-v7000', reference: '2076-524', seriesId: 'sr_ibm_v7000', brandId: 'br_ibm', domainId: 'dom_storage' },
  { id: 'mdl_ds2246', name: 'DS2246', slug: 'ds2246', reference: 'DS2246', seriesId: 'sr_na_ds', brandId: 'br_netapp', domainId: 'dom_storage' },
  { id: 'mdl_ds4246', name: 'DS4246', slug: 'ds4246', reference: 'DS4246', seriesId: 'sr_na_ds', brandId: 'br_netapp', domainId: 'dom_storage' },
  { id: 'mdl_cat2960x', name: 'Catalyst 2960X', slug: 'catalyst-2960x', reference: 'WS-C2960X', seriesId: 'sr_cisco_cat29', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'mdl_cat2960s', name: 'Catalyst 2960S', slug: 'catalyst-2960s', reference: 'WS-C2960S', seriesId: 'sr_cisco_cat29', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'mdl_cat9300', name: 'Catalyst 9300', slug: 'catalyst-9300', reference: 'C9300', seriesId: 'sr_cisco_cat93', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'mdl_cat9300l', name: 'Catalyst 9300L', slug: 'catalyst-9300l', reference: 'C9300L', seriesId: 'sr_cisco_cat93', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'mdl_cat9200', name: 'Catalyst 9200', slug: 'catalyst-9200', reference: 'C9200', seriesId: 'sr_cisco_cat92', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'mdl_nex9300', name: 'Nexus 9300', slug: 'nexus-9300', reference: 'N9K-C9300', seriesId: 'sr_cisco_nex9', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'mdl_nex9500', name: 'Nexus 9500', slug: 'nexus-9500', reference: 'N9K-C9500', seriesId: 'sr_cisco_nex9', brandId: 'br_cisco', domainId: 'dom_network' },
  { id: 'mdl_bro_g620', name: 'Brocade G620', slug: 'brocade-g620', reference: 'BR-G620', seriesId: 'sr_bro_600', brandId: 'br_brocade', domainId: 'dom_network' },
  { id: 'mdl_bro_6510', name: 'Brocade 6510', slug: 'brocade-6510', reference: 'BR-6510', seriesId: 'sr_bro_300', brandId: 'br_brocade', domainId: 'dom_network' },
]

// ============================================================
// FILTRES PAR MODELE
// ============================================================
const filtersByModel: Record<string, FilterGroupSeed[]> = {
  SERVER_RACK: [
    {
      name: 'CPU / Processeur', slug: 'cpu', order: 1,
      filters: [
        { label: 'Fabricant CPU', fieldKey: 'cpu_vendor', type: 'select', unit: null, order: 1, options: ['Intel', 'AMD'] },
        { label: 'Famille CPU', fieldKey: 'cpu_family', type: 'select', unit: null, order: 2, options: ['Xeon E5', 'Xeon E7', 'Xeon Gold', 'Xeon Silver', 'Xeon Platinum', 'EPYC 7002', 'EPYC 7003'] },
        { label: 'Nombre de sockets', fieldKey: 'cpu_sockets', type: 'select', unit: null, order: 3, options: ['1', '2', '4'] },
        { label: 'Nombre de coeurs', fieldKey: 'cpu_cores', type: 'select', unit: null, order: 4, options: ['6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '28', '32', '40', '48', '56', '64'] },
        { label: 'Frequence', fieldKey: 'cpu_freq', type: 'select', unit: 'GHz', order: 5, options: ['1.7', '1.8', '2.0', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '3.0', '3.2', '3.4'] },
      ],
    },
    {
      name: 'Memoire RAM', slug: 'ram', order: 2,
      filters: [
        { label: 'Capacite RAM', fieldKey: 'ram_gb', type: 'select', unit: 'GB', order: 1, options: ['16', '32', '64', '96', '128', '192', '256', '384', '512', '768', '1024', '1536', '2048'] },
        { label: 'Type RAM', fieldKey: 'ram_type', type: 'select', unit: null, order: 2, options: ['DDR3', 'DDR3L', 'DDR4', 'DDR4 ECC', 'DDR5 ECC'] },
        { label: 'Vitesse RAM', fieldKey: 'ram_speed', type: 'select', unit: 'MHz', order: 3, options: ['1066', '1333', '1600', '1866', '2133', '2400', '2666', '2933', '3200'] },
        { label: 'Nb de slots RAM', fieldKey: 'ram_slots', type: 'select', unit: null, order: 4, options: ['8', '12', '16', '24', '32', '48'] },
      ],
    },
    {
      name: 'Stockage interne', slug: 'storage', order: 3,
      filters: [
        { label: 'Type de disque', fieldKey: 'disk_type', type: 'select', unit: null, order: 1, options: ['HDD SAS', 'HDD SATA', 'SSD SAS', 'SSD SATA', 'SSD NVMe'] },
        { label: 'Capacite disque', fieldKey: 'disk_capacity', type: 'select', unit: 'GB', order: 2, options: ['300', '600', '900', '1200', '1800', '2400', '4000', '8000', '16000'] },
        { label: 'Nb de baies', fieldKey: 'disk_bays', type: 'select', unit: null, order: 3, options: ['4', '8', '10', '12', '16', '24', '25', '26', '28', '32'] },
        { label: 'Form factor', fieldKey: 'disk_ff', type: 'select', unit: null, order: 4, options: ['SFF 2.5"', 'LFF 3.5"'] },
      ],
    },
    {
      name: 'Reseau', slug: 'network', order: 4,
      filters: [
        { label: 'Carte reseau', fieldKey: 'nic_speed', type: 'select', unit: 'Gbps', order: 1, options: ['1', '10', '25', '40', '100'] },
        { label: 'Type NIC', fieldKey: 'nic_type', type: 'select', unit: null, order: 2, options: ['Ethernet', 'Fibre Channel', 'iSCSI', 'FCoE'] },
        { label: 'Nb de ports NIC', fieldKey: 'nic_ports', type: 'select', unit: null, order: 3, options: ['2', '4', '8'] },
      ],
    },
    {
      name: 'Alimentation', slug: 'power', order: 5,
      filters: [
        { label: 'Puissance PSU', fieldKey: 'psu_watts', type: 'select', unit: 'W', order: 1, options: ['350', '450', '550', '750', '1100', '1200', '2000'] },
        { label: 'Nb de PSU', fieldKey: 'psu_count', type: 'select', unit: null, order: 2, options: ['1', '2'] },
        { label: 'PSU redondant', fieldKey: 'psu_redundant', type: 'boolean', unit: null, order: 3, options: [] },
      ],
    },
    {
      name: 'Rack', slug: 'rack', order: 6,
      filters: [
        { label: 'Rack Unit', fieldKey: 'rack_unit', type: 'select', unit: 'U', order: 1, options: ['1', '2', '4', '8', '10'] },
      ],
    },
    {
      name: 'Etat', slug: 'condition', order: 7,
      filters: [
        { label: 'Etat reconditionne', fieldKey: 'condition', type: 'select', unit: null, order: 1, options: ['A', 'B', 'C'] },
        { label: 'Garantie', fieldKey: 'warranty_months', type: 'select', unit: 'mois', order: 2, options: ['3', '6', '12', '24', '36'] },
      ],
    },
  ],
  SERVER_BLADE: [
    {
      name: 'CPU / Processeur', slug: 'cpu', order: 1,
      filters: [
        { label: 'Fabricant CPU', fieldKey: 'cpu_vendor', type: 'select', unit: null, order: 1, options: ['Intel', 'AMD'] },
        { label: 'Nombre de coeurs', fieldKey: 'cpu_cores', type: 'select', unit: null, order: 2, options: ['6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '28'] },
        { label: 'Frequence', fieldKey: 'cpu_freq', type: 'select', unit: 'GHz', order: 3, options: ['1.7', '2.0', '2.1', '2.3', '2.5', '2.6', '2.8', '3.0'] },
      ],
    },
    {
      name: 'Memoire RAM', slug: 'ram', order: 2,
      filters: [
        { label: 'Capacite RAM', fieldKey: 'ram_gb', type: 'select', unit: 'GB', order: 1, options: ['16', '32', '64', '128', '256', '512'] },
        { label: 'Type RAM', fieldKey: 'ram_type', type: 'select', unit: null, order: 2, options: ['DDR3', 'DDR4', 'DDR4 ECC'] },
      ],
    },
    {
      name: 'Chassis', slug: 'chassis', order: 3,
      filters: [
        { label: 'Type chassis', fieldKey: 'chassis_type', type: 'select', unit: null, order: 1, options: ['UCS 5108', 'BladeSystem c7000', 'BladeSystem c3000', 'PowerEdge M1000e', 'Flex System Enterprise'] },
      ],
    },
    {
      name: 'Etat', slug: 'condition', order: 4,
      filters: [
        { label: 'Etat reconditionne', fieldKey: 'condition', type: 'select', unit: null, order: 1, options: ['A', 'B', 'C'] },
      ],
    },
  ],
  STORAGE: [
    {
      name: 'Type de stockage', slug: 'storage-type', order: 1,
      filters: [
        { label: 'Type', fieldKey: 'storage_type', type: 'select', unit: null, order: 1, options: ['SAN', 'NAS', 'DAS', 'iSCSI', 'FC', 'NVMe-oF'] },
        { label: 'Protocole', fieldKey: 'protocol', type: 'select', unit: null, order: 2, options: ['FC', 'iSCSI', 'NFS', 'SMB', 'SAS', 'NVMe'] },
      ],
    },
    {
      name: 'Capacite', slug: 'capacity', order: 2,
      filters: [
        { label: 'Capacite brute', fieldKey: 'raw_capacity', type: 'select', unit: 'TB', order: 1, options: ['1', '2', '4', '8', '12', '16', '24', '32', '48', '64', '96', '128', '192', '256', '512', '1024'] },
        { label: 'Nb de baies', fieldKey: 'disk_bays', type: 'select', unit: null, order: 2, options: ['4', '6', '8', '12', '24', '25', '60', '70', '84', '92', '102'] },
        { label: 'Form factor disque', fieldKey: 'disk_ff', type: 'select', unit: null, order: 3, options: ['SFF 2.5"', 'LFF 3.5"', 'Mixed'] },
      ],
    },
    {
      name: 'Disques', slug: 'disks', order: 3,
      filters: [
        { label: 'Type de disque', fieldKey: 'disk_type', type: 'select', unit: null, order: 1, options: ['HDD SAS', 'HDD SATA', 'SSD SAS', 'SSD NVMe', 'Flash'] },
        { label: 'Vitesse disque', fieldKey: 'disk_rpm', type: 'select', unit: 'RPM', order: 2, options: ['5400', '7200', '10000', '15000', 'Flash'] },
      ],
    },
    {
      name: 'Controleur', slug: 'controller', order: 4,
      filters: [
        { label: 'Nb controleurs', fieldKey: 'ctrl_count', type: 'select', unit: null, order: 1, options: ['1', '2', '4'] },
        { label: 'Cache controleur', fieldKey: 'ctrl_cache', type: 'select', unit: 'GB', order: 2, options: ['4', '8', '16', '32', '64', '128'] },
        { label: 'Redondance', fieldKey: 'ctrl_redundant', type: 'boolean', unit: null, order: 3, options: [] },
      ],
    },
    {
      name: 'Connectivite', slug: 'connectivity', order: 5,
      filters: [
        { label: 'Ports hote', fieldKey: 'host_ports', type: 'select', unit: null, order: 1, options: ['2', '4', '6', '8', '12', '16'] },
        { label: 'Vitesse port', fieldKey: 'port_speed', type: 'select', unit: 'Gbps', order: 2, options: ['4', '8', '10', '16', '25', '32', '40', '100'] },
      ],
    },
    {
      name: 'Etat', slug: 'condition', order: 6,
      filters: [
        { label: 'Etat reconditionne', fieldKey: 'condition', type: 'select', unit: null, order: 1, options: ['A', 'B', 'C'] },
        { label: 'Garantie', fieldKey: 'warranty_months', type: 'select', unit: 'mois', order: 2, options: ['3', '6', '12', '24', '36'] },
      ],
    },
  ],
  NETWORK_SWITCH: [
    {
      name: 'Ports', slug: 'ports', order: 1,
      filters: [
        { label: 'Nombre de ports', fieldKey: 'nb_ports', type: 'select', unit: null, order: 1, options: ['8', '12', '16', '18', '24', '32', '36', '40', '48', '56', '64', '72', '96', 'Modular'] },
        { label: 'Vitesse des ports', fieldKey: 'port_speed', type: 'select', unit: 'G', order: 2, options: ['1', '8', '10', '16', '25', '32', '40', '100', '400'] },
        { label: 'Ports uplink', fieldKey: 'uplink_ports', type: 'select', unit: null, order: 3, options: ['2', '4', '8', '12'] },
      ],
    },
    {
      name: 'Type de switch', slug: 'switch-type', order: 2,
      filters: [
        { label: 'Type', fieldKey: 'switch_type', type: 'select', unit: null, order: 1, options: ['Ethernet', 'Fibre Channel', 'Switch Chassis', 'Modular'] },
        { label: 'Manageable', fieldKey: 'manageable', type: 'boolean', unit: null, order: 2, options: [] },
        { label: 'PoE', fieldKey: 'poe', type: 'boolean', unit: null, order: 3, options: [] },
      ],
    },
    {
      name: 'SFP / Transceivers', slug: 'sfp', order: 3,
      filters: [
        { label: 'Type SFP', fieldKey: 'sfp_type', type: 'select', unit: null, order: 1, options: ['SFP', 'SFP+', 'SFP28', 'QSFP', 'QSFP28', 'QSFP-DD'] },
        { label: 'Vitesse SFP', fieldKey: 'sfp_speed', type: 'select', unit: 'G', order: 2, options: ['1', '10', '25', '40', '100', '400'] },
      ],
    },
    {
      name: 'Alimentation', slug: 'power', order: 4,
      filters: [
        { label: 'PSU redondant', fieldKey: 'psu_redundant', type: 'boolean', unit: null, order: 1, options: [] },
        { label: 'Puissance PSU', fieldKey: 'psu_watts', type: 'select', unit: 'W', order: 2, options: ['150', '250', '350', '550', '1100', '3000'] },
      ],
    },
    {
      name: 'Rack', slug: 'rack', order: 5,
      filters: [
        { label: 'Rack Unit', fieldKey: 'rack_unit', type: 'select', unit: 'U', order: 1, options: ['1', '2', '4', '7', '10', '14'] },
      ],
    },
    {
      name: 'Etat', slug: 'condition', order: 6,
      filters: [
        { label: 'Etat reconditionne', fieldKey: 'condition', type: 'select', unit: null, order: 1, options: ['A', 'B', 'C'] },
        { label: 'Garantie', fieldKey: 'warranty_months', type: 'select', unit: 'mois', order: 2, options: ['3', '6', '12', '24', '36'] },
      ],
    },
  ],
}

// ============================================================
// MAPPING : quel modele utilise quel set de filtres
// ============================================================
const modelFilterMapping: Record<string, keyof typeof filtersByModel> = {
  mdl_ucs_c220_m4: 'SERVER_RACK',
  mdl_ucs_c220_m5: 'SERVER_RACK',
  mdl_ucs_c240_m4: 'SERVER_RACK',
  mdl_ucs_c240_m5: 'SERVER_RACK',
  mdl_ucs_b200_m4: 'SERVER_BLADE',
  mdl_ucs_b200_m5: 'SERVER_BLADE',
  mdl_pe_r630: 'SERVER_RACK',
  mdl_pe_r730: 'SERVER_RACK',
  mdl_pe_r740: 'SERVER_RACK',
  mdl_pe_r750: 'SERVER_RACK',
  mdl_pe_r640: 'SERVER_RACK',
  mdl_pe_r440: 'SERVER_RACK',
  mdl_dl380_g10: 'SERVER_RACK',
  mdl_dl360_g10: 'SERVER_RACK',
  mdl_dl380_g9: 'SERVER_RACK',
  mdl_dl360_g9: 'SERVER_RACK',
  mdl_x3650_m5: 'SERVER_RACK',
  mdl_x3550_m5: 'SERVER_RACK',
  mdl_sr630: 'SERVER_RACK',
  mdl_sr650: 'SERVER_RACK',
  mdl_sr650_v2: 'SERVER_RACK',
  mdl_md1200: 'STORAGE',
  mdl_md1220: 'STORAGE',
  mdl_md3200: 'STORAGE',
  mdl_md3600: 'STORAGE',
  mdl_me4024: 'STORAGE',
  mdl_vnx5200: 'STORAGE',
  mdl_vnx5400: 'STORAGE',
  mdl_unity300: 'STORAGE',
  mdl_unity400: 'STORAGE',
  mdl_msa2050: 'STORAGE',
  mdl_msa2060: 'STORAGE',
  mdl_v3700: 'STORAGE',
  mdl_v7000: 'STORAGE',
  mdl_ds2246: 'STORAGE',
  mdl_ds4246: 'STORAGE',
  mdl_cat2960x: 'NETWORK_SWITCH',
  mdl_cat2960s: 'NETWORK_SWITCH',
  mdl_cat9300: 'NETWORK_SWITCH',
  mdl_cat9300l: 'NETWORK_SWITCH',
  mdl_cat9200: 'NETWORK_SWITCH',
  mdl_nex9300: 'NETWORK_SWITCH',
  mdl_nex9500: 'NETWORK_SWITCH',
  mdl_bro_g620: 'NETWORK_SWITCH',
  mdl_bro_6510: 'NETWORK_SWITCH',
}

// ============================================================
// PRODUITS EXEMPLES
// ============================================================
const products: ProductSeed[] = [
  {
    modelId: 'mdl_ucs_c220_m4',
    sku: 'RT-UCS-C220M4-001',
    name: 'Cisco UCS C220 M4 — 2x E5-2680v4 — 128GB — 2x 600GB SAS',
    price: 890,
    condition: 'A',
    stock: 4,
    attributes: {
      cpu_vendor: 'Intel', cpu_family: 'Xeon E5', cpu_sockets: '2',
      cpu_cores: '14', cpu_freq: '2.4',
      ram_gb: '128', ram_type: 'DDR4 ECC', ram_speed: '2133', ram_slots: '24',
      disk_type: 'HDD SAS', disk_capacity: '600', disk_bays: '8', disk_ff: 'SFF 2.5"',
      nic_speed: '10', nic_type: 'Ethernet', nic_ports: '4',
      psu_watts: '770', psu_count: '2', psu_redundant: 'true',
      rack_unit: '1', condition: 'A', warranty_months: '12',
    },
  },
  {
    modelId: 'mdl_ucs_c220_m4',
    sku: 'RT-UCS-C220M4-002',
    name: 'Cisco UCS C220 M4 — 2x E5-2650v4 — 64GB — 2x 300GB SAS',
    price: 650,
    condition: 'B',
    stock: 7,
    attributes: {
      cpu_vendor: 'Intel', cpu_family: 'Xeon E5', cpu_sockets: '2',
      cpu_cores: '12', cpu_freq: '2.2',
      ram_gb: '64', ram_type: 'DDR4 ECC', ram_speed: '2133', ram_slots: '24',
      disk_type: 'HDD SAS', disk_capacity: '300', disk_bays: '8', disk_ff: 'SFF 2.5"',
      nic_speed: '10', nic_type: 'Ethernet', nic_ports: '4',
      psu_watts: '770', psu_count: '2', psu_redundant: 'true',
      rack_unit: '1', condition: 'B', warranty_months: '6',
    },
  },
  {
    modelId: 'mdl_pe_r740',
    sku: 'RT-PE-R740-001',
    name: 'Dell PowerEdge R740 — 2x Gold 6148 — 256GB — 8x 1.2TB SAS',
    price: 2100,
    condition: 'A',
    stock: 3,
    attributes: {
      cpu_vendor: 'Intel', cpu_family: 'Xeon Gold', cpu_sockets: '2',
      cpu_cores: '20', cpu_freq: '2.4',
      ram_gb: '256', ram_type: 'DDR4 ECC', ram_speed: '2666', ram_slots: '24',
      disk_type: 'HDD SAS', disk_capacity: '1200', disk_bays: '16', disk_ff: 'SFF 2.5"',
      nic_speed: '10', nic_type: 'Ethernet', nic_ports: '4',
      psu_watts: '750', psu_count: '2', psu_redundant: 'true',
      rack_unit: '2', condition: 'A', warranty_months: '12',
    },
  },
  {
    modelId: 'mdl_dl380_g10',
    sku: 'RT-DL380G10-001',
    name: 'HPE ProLiant DL380 G10 — 2x Silver 4210R — 128GB — 4x 1.8TB SAS',
    price: 1450,
    condition: 'A',
    stock: 5,
    attributes: {
      cpu_vendor: 'Intel', cpu_family: 'Xeon Silver', cpu_sockets: '2',
      cpu_cores: '10', cpu_freq: '2.4',
      ram_gb: '128', ram_type: 'DDR4 ECC', ram_speed: '2933', ram_slots: '24',
      disk_type: 'HDD SAS', disk_capacity: '1800', disk_bays: '8', disk_ff: 'SFF 2.5"',
      nic_speed: '10', nic_type: 'Ethernet', nic_ports: '4',
      psu_watts: '800', psu_count: '2', psu_redundant: 'true',
      rack_unit: '2', condition: 'A', warranty_months: '12',
    },
  },
  {
    modelId: 'mdl_md1200',
    sku: 'RT-MD1200-001',
    name: 'Dell PowerVault MD1200 — 12x 2TB SAS 7.2K — DAS',
    price: 480,
    condition: 'A',
    stock: 6,
    attributes: {
      storage_type: 'DAS', protocol: 'SAS',
      raw_capacity: '24', disk_bays: '12', disk_ff: 'LFF 3.5"',
      disk_type: 'HDD SAS', disk_rpm: '7200',
      ctrl_count: '2', ctrl_cache: '4', ctrl_redundant: 'true',
      host_ports: '4', port_speed: '6',
      condition: 'A', warranty_months: '6',
    },
  },
  {
    modelId: 'mdl_cat2960x',
    sku: 'RT-CAT2960X-48-001',
    name: 'Cisco Catalyst 2960X-48FPD-L — 48 ports 1G PoE+ — 2x SFP+',
    price: 320,
    condition: 'A',
    stock: 10,
    attributes: {
      nb_ports: '48', port_speed: '1', uplink_ports: '2',
      switch_type: 'Ethernet', manageable: 'true', poe: 'true',
      sfp_type: 'SFP+', sfp_speed: '10',
      psu_redundant: 'false', psu_watts: '740',
      rack_unit: '1', condition: 'A', warranty_months: '12',
    },
  },
  {
    modelId: 'mdl_cat9300',
    sku: 'RT-C9300-48P-001',
    name: 'Cisco Catalyst 9300-48P — 48 ports 1G PoE+ — 4x SFP+',
    price: 890,
    condition: 'A',
    stock: 5,
    attributes: {
      nb_ports: '48', port_speed: '1', uplink_ports: '4',
      switch_type: 'Ethernet', manageable: 'true', poe: 'true',
      sfp_type: 'SFP+', sfp_speed: '10',
      psu_redundant: 'true', psu_watts: '715',
      rack_unit: '1', condition: 'A', warranty_months: '12',
    },
  },
]

function toFilterType(type: FilterSeed['type']): EquipmentFilterFieldTypeEnum {
  if (type === 'boolean') return EquipmentFilterFieldTypeEnum.BOOLEAN
  if (type === 'number') return EquipmentFilterFieldTypeEnum.NUMBER
  if (type === 'text') return EquipmentFilterFieldTypeEnum.TEXT
  return EquipmentFilterFieldTypeEnum.SELECT
}

function modelSlugForDb(input: ModelSeed) {
  return input.slug
}

function seriesSlugForDb(input: SeriesSeed) {
  // The source payload is kept exact; DB requires globally unique slugs.
  return `${input.brandId}-${input.domainId}-${input.slug}`
}

async function upsertDomains() {
  const domainIdMap = new Map<string, string>()

  for (const [index, domain] of domains.entries()) {
    const dbDomain = await prisma.equipmentDomain.upsert({
      where: { code: domain.code },
      update: {
        code: domain.code,
        label: domain.name,
        slug: domain.slug,
        sortOrder: index + 1,
        isActive: true,
      },
      create: {
        id: domain.id,
        code: domain.code,
        label: domain.name,
        slug: domain.slug,
        sortOrder: index + 1,
        isActive: true,
      },
    })

    domainIdMap.set(domain.id, dbDomain.id)
  }

  return domainIdMap
}

async function upsertBrands(domainIdMap: Map<string, string>) {
  const brandIdMap = new Map<string, string>()

  for (const [index, brand] of brands.entries()) {
    const resolvedDomainId = domainIdMap.get(brand.domainIds[0])
    if (!resolvedDomainId) {
      throw new Error(`Domain introuvable pour la marque ${brand.id}`)
    }

    const dbBrand = await prisma.equipmentBrand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        slug: brand.slug,
        domainId: resolvedDomainId,
        sortOrder: index + 1,
        isActive: true,
      },
      create: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        domainId: resolvedDomainId,
        sortOrder: index + 1,
        isActive: true,
      },
    })

    brandIdMap.set(brand.id, dbBrand.id)
  }

  return brandIdMap
}

async function upsertSeries(
  domainIdMap: Map<string, string>,
  brandIdMap: Map<string, string>,
) {
  const seriesIdMap = new Map<string, string>()

  for (const [index, serie] of series.entries()) {
    const resolvedBrandId = brandIdMap.get(serie.brandId)
    const resolvedDomainId = domainIdMap.get(serie.domainId)
    if (!resolvedBrandId || !resolvedDomainId) {
      throw new Error(`Serie invalide: ${serie.id}`)
    }

    const dbSeries = await prisma.equipmentSeries.upsert({
      where: { slug: seriesSlugForDb(serie) },
      update: {
        name: serie.name,
        slug: seriesSlugForDb(serie),
        brandId: resolvedBrandId,
        domainId: resolvedDomainId,
        sortOrder: index + 1,
        isActive: true,
      },
      create: {
        id: serie.id,
        name: serie.name,
        slug: seriesSlugForDb(serie),
        brandId: resolvedBrandId,
        domainId: resolvedDomainId,
        sortOrder: index + 1,
        isActive: true,
      },
    })

    seriesIdMap.set(serie.id, dbSeries.id)
  }

  return seriesIdMap
}

async function upsertModels(
  domainIdMap: Map<string, string>,
  brandIdMap: Map<string, string>,
  seriesIdMap: Map<string, string>,
) {
  const modelIdMap = new Map<string, string>()

  for (const model of models) {
    const resolvedDomainId = domainIdMap.get(model.domainId)
    const resolvedBrandId = brandIdMap.get(model.brandId)
    const resolvedSeriesId = seriesIdMap.get(model.seriesId)
    if (!resolvedDomainId || !resolvedBrandId || !resolvedSeriesId) {
      throw new Error(`Modele invalide: ${model.id}`)
    }

    const dbModel = await prisma.equipmentModel.upsert({
      where: { reference: model.reference },
      update: {
        name: model.name,
        slug: modelSlugForDb(model),
        reference: model.reference,
        seriesId: resolvedSeriesId,
        brandId: resolvedBrandId,
        domainId: resolvedDomainId,
        isConfigurable: true,
      },
      create: {
        id: model.id,
        name: model.name,
        slug: modelSlugForDb(model),
        reference: model.reference,
        seriesId: resolvedSeriesId,
        brandId: resolvedBrandId,
        domainId: resolvedDomainId,
        isConfigurable: true,
      },
    })

    modelIdMap.set(model.id, dbModel.id)
  }

  return modelIdMap
}

async function upsertFiltersForModel(modelId: string, profile: keyof typeof filtersByModel) {
  const filterIdByFieldKey = new Map<string, string>()
  const groups = filtersByModel[profile]

  for (const group of groups) {
    const filterGroup = await prisma.equipmentFilterGroup.upsert({
      where: {
        equipmentModelId_slug: {
          equipmentModelId: modelId,
          slug: group.slug,
        },
      },
      update: {
        name: group.name,
        displayOrder: group.order,
      },
      create: {
        equipmentModelId: modelId,
        name: group.name,
        slug: group.slug,
        displayOrder: group.order,
      },
    })

    for (const filter of group.filters) {
      const dbFilter = await prisma.equipmentFilter.upsert({
        where: {
          filterGroupId_fieldKey: {
            filterGroupId: filterGroup.id,
            fieldKey: filter.fieldKey,
          },
        },
        update: {
          label: filter.label,
          fieldType: toFilterType(filter.type),
          unit: filter.unit,
          displayOrder: filter.order,
          equipmentModelId: modelId,
        },
        create: {
          filterGroupId: filterGroup.id,
          equipmentModelId: modelId,
          label: filter.label,
          fieldKey: filter.fieldKey,
          fieldType: toFilterType(filter.type),
          unit: filter.unit,
          displayOrder: filter.order,
        },
      })

      filterIdByFieldKey.set(filter.fieldKey, dbFilter.id)

      for (const [index, optionValue] of filter.options.entries()) {
        await prisma.equipmentFilterOption.upsert({
          where: {
            filterId_value: {
              filterId: dbFilter.id,
              value: optionValue,
            },
          },
          update: {
            label: optionValue,
            displayOrder: index + 1,
          },
          create: {
            filterId: dbFilter.id,
            value: optionValue,
            label: optionValue,
            displayOrder: index + 1,
          },
        })
      }
    }
  }

  return filterIdByFieldKey
}

async function upsertProductsAndAttributes(
  modelIdMap: Map<string, string>,
  filterMapByModel: Map<string, Map<string, string>>,
) {
  for (const item of products) {
    const resolvedModelId = modelIdMap.get(item.modelId)
    if (!resolvedModelId) {
      throw new Error(`Aucun modele trouve pour ${item.modelId}`)
    }

    const filterMap = filterMapByModel.get(item.modelId)
    if (!filterMap) {
      throw new Error(`Aucun mapping de filtres trouve pour le modele ${item.modelId}`)
    }

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.upsert({
        where: { sku: item.sku },
        update: {
          equipmentModelId: resolvedModelId,
          name: item.name,
          price: item.price,
          condition: item.condition as ProductConditionEnum,
          stock: item.stock,
          isActive: true,
        },
        create: {
          equipmentModelId: resolvedModelId,
          sku: item.sku,
          name: item.name,
          price: item.price,
          condition: item.condition as ProductConditionEnum,
          stock: item.stock,
          isActive: true,
        },
      })

      const usedFilterIds: string[] = []

      for (const [fieldKey, value] of Object.entries(item.attributes)) {
        const filterId = filterMap.get(fieldKey)
        if (!filterId) {
          throw new Error(`Aucun filtre trouve pour fieldKey=${fieldKey} dans modelId=${item.modelId}`)
        }

        usedFilterIds.push(filterId)

        await tx.productAttribute.upsert({
          where: {
            productId_filterId: {
              productId: product.id,
              filterId,
            },
          },
          update: {
            value,
            equipmentModelId: resolvedModelId,
          },
          create: {
            productId: product.id,
            filterId,
            equipmentModelId: resolvedModelId,
            value,
          },
        })
      }

      await tx.productAttribute.deleteMany({
        where: {
          productId: product.id,
          filterId: {
            notIn: usedFilterIds,
          },
        },
      })
    })
  }
}

async function purgeModelsWithoutFilters() {
  const staleModels = await prisma.equipmentModel.findMany({
    where: {
      filterGroups: {
        none: {},
      },
    },
    select: {
      id: true,
    },
  })

  if (staleModels.length === 0) {
    console.log('Aucun modele sans filtre a supprimer')
    return
  }

  const staleIds = staleModels.map((model) => model.id)

  await prisma.$transaction(async (tx) => {
    await tx.product.deleteMany({
      where: {
        equipmentModelId: {
          in: staleIds,
        },
      },
    })

    await tx.equipmentModel.deleteMany({
      where: {
        id: {
          in: staleIds,
        },
      },
    })
  })

  console.log(`Modeles sans filtre supprimes: ${staleIds.length}`)
}

async function main() {
  const domainIdMap = await upsertDomains()
  const brandIdMap = await upsertBrands(domainIdMap)
  const seriesIdMap = await upsertSeries(domainIdMap, brandIdMap)
  const modelIdMap = await upsertModels(domainIdMap, brandIdMap, seriesIdMap)

  const filterMapByModel = new Map<string, Map<string, string>>()
  for (const model of models) {
    const profile = modelFilterMapping[model.id]
    if (!profile) continue

    const resolvedModelId = modelIdMap.get(model.id)
    if (!resolvedModelId) {
      throw new Error(`Modele introuvable pour mapping filtres: ${model.id}`)
    }

    const map = await upsertFiltersForModel(resolvedModelId, profile)
    filterMapByModel.set(model.id, map)
  }

  await upsertProductsAndAttributes(modelIdMap, filterMapByModel)
  await purgeModelsWithoutFilters()

  console.log('Seed termine avec succes')
  console.log(`Domains: ${domains.length}`)
  console.log(`Brands: ${brands.length}`)
  console.log(`Series: ${series.length}`)
  console.log(`Models: ${models.length}`)
  console.log(`Products: ${products.length}`)
}

main()
  .catch((error) => {
    console.error('Erreur seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
