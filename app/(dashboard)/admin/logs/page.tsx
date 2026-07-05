'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2, RefreshCw, Search, XCircle,
  Monitor, Smartphone, Tablet, AlertTriangle, Download, Globe,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Log {
  id: string
  ipAddress: string
  deviceInfo: string
  loginDate: string
  statusLog: 'SUCCESS' | 'FAILED'
  user: {
    firstName: string
    lastName: string
    email: string
    userRole: string
  }
}

type DeviceType = 'mobile' | 'tablet' | 'desktop'

// ─── Parsing basique du user-agent (deviceInfo) : pas de librairie externe,
// juste des règles suffisantes pour un affichage lisible ─────────────────────
function parseDeviceInfo(ua: string): { label: string; type: DeviceType } {
  const s = (ua || '').toLowerCase()

  let os = 'OS inconnu'
  if (s.includes('windows')) os = 'Windows'
  else if (s.includes('mac os') || s.includes('macintosh')) os = 'macOS'
  else if (s.includes('android')) os = 'Android'
  else if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) os = 'iOS'
  else if (s.includes('linux')) os = 'Linux'

  let browser = 'Navigateur inconnu'
  if (s.includes('edg/')) browser = 'Edge'
  else if (s.includes('chrome/') && !s.includes('edg/')) browser = 'Chrome'
  else if (s.includes('firefox/')) browser = 'Firefox'
  else if (s.includes('safari/') && !s.includes('chrome/')) browser = 'Safari'

  let type: DeviceType = 'desktop'
  if (s.includes('ipad') || s.includes('tablet')) type = 'tablet'
  else if (s.includes('mobi') || s.includes('android') || s.includes('iphone')) type = 'mobile'

  return { label: `${browser} · ${os}`, type }
}

function DeviceIcon({ type }: { type: DeviceType }) {
  if (type === 'mobile') return <Smartphone size={14} className="shrink-0 text-slate-400" />
  if (type === 'tablet') return <Tablet size={14} className="shrink-0 text-slate-400" />
  return <Monitor size={14} className="shrink-0 text-slate-400" />
}

function exportToCsv(logs: Log[]) {
  const header = ['Utilisateur', 'Email', 'Rôle', 'Date', 'Heure', 'IP', 'Appareil', 'Statut']
  const rows = logs.map((log) => {
    const device = parseDeviceInfo(log.deviceInfo)
    const d = new Date(log.loginDate)
    return [
      `${log.user.firstName} ${log.user.lastName}`,
      log.user.email,
      log.user.userRole,
      d.toLocaleDateString('fr-FR'),
      d.toLocaleTimeString('fr-FR'),
      log.ipAddress,
      device.label,
      log.statusLog === 'SUCCESS' ? 'Succès' : 'Échec',
    ]
  })
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-connexion-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'EMPLOYEE' | 'CLIENT'>('ALL')
  const [page, setPage] = useState(1)

  async function fetchLogs() {
    setLoading(true)
    const res = await fetch('/api/admin/logs')
    const data = await res.json()
    setLogs(data.logs || [])
    setLoading(false)
  }

  useEffect(() => {
    let ignore = false

    async function bootstrapLogs() {
      try {
        const res = await fetch('/api/admin/logs')
        const data = await res.json()
        if (!ignore) setLogs(data.logs || [])
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void bootstrapLogs()
    return () => {
      ignore = true
    }
  }, [])

  // ─── Détection d'activité suspecte : une IP avec 3+ échecs dans les 100
  // dernières tentatives est signalée ─────────────────────────────────────
  const failedByIp = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of logs) {
      if (log.statusLog === 'FAILED') {
        map.set(log.ipAddress, (map.get(log.ipAddress) ?? 0) + 1)
      }
    }
    return map
  }, [logs])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return logs.filter((log) => {
      const matchesSearch = `${log.user.firstName} ${log.user.lastName} ${log.user.email} ${log.ipAddress}`
        .toLowerCase()
        .includes(q)
      const matchesFilter = filter === 'ALL' || log.statusLog === filter
      const matchesRole = roleFilter === 'ALL' || log.user.userRole === roleFilter
      return matchesSearch && matchesFilter && matchesRole
    })
  }, [logs, search, filter, roleFilter])

  const perPage = 12
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pagedLogs = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page])

  const successCount = logs.filter((l) => l.statusLog === 'SUCCESS').length
  const failedCount = logs.filter((l) => l.statusLog === 'FAILED').length
  const uniqueIpCount = new Set(logs.map((l) => l.ipAddress)).size

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des connexions</h1>
          <p className="mt-1 text-sm text-slate-500">Suivi des 100 dernieres tentatives de connexion.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportToCsv(filtered)}
            disabled={filtered.length === 0}
            className="border-slate-200 bg-white"
          >
            <Download size={14} /> Exporter CSV
          </Button>
          <Button variant="outline" onClick={fetchLogs} className="border-slate-200 bg-white">
            <RefreshCw size={14} /> Actualiser
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{logs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Succes</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{successCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Echecs</p>
            <p className="mt-1 text-3xl font-bold text-rose-600">{failedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">IP uniques</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{uniqueIpCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Journal d acces</CardTitle>
          <CardDescription>Filtrer par statut, par role et rechercher rapidement.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Rechercher utilisateur, email ou IP"
                className="h-10 border-slate-200 bg-slate-50 pl-9"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:overflow-visible sm:pb-0">
                {(['ALL', 'SUCCESS', 'FAILED'] as const).map((f) => (
                  <Button
                    key={f}
                    type="button"
                    size="sm"
                    variant={filter === f ? 'default' : 'outline'}
                    onClick={() => {
                      setFilter(f)
                      setPage(1)
                    }}
                    className={`shrink-0 ${filter === f ? 'bg-sky-600 text-white hover:bg-sky-700' : 'border-slate-200 bg-white'}`}
                  >
                    {f === 'ALL' ? 'Tous' : f === 'SUCCESS' ? 'Succes' : 'Echecs'}
                  </Button>
                ))}
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:overflow-visible sm:pb-0">
                {(['ALL', 'ADMIN', 'EMPLOYEE', 'CLIENT'] as const).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={roleFilter === r ? 'default' : 'outline'}
                    onClick={() => {
                      setRoleFilter(r)
                      setPage(1)
                    }}
                    className={`shrink-0 ${roleFilter === r ? 'bg-slate-800 text-white hover:bg-slate-900' : 'border-slate-200 bg-white'}`}
                  >
                    {r === 'ALL' ? 'Tous rôles' : r}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Date et heure</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Appareil</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      Aucun log trouve.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedLogs.map((log) => {
                    const device = parseDeviceInfo(log.deviceInfo)
                    const isSuspicious = log.statusLog === 'FAILED' && (failedByIp.get(log.ipAddress) ?? 0) >= 3

                    return (
                      <TableRow key={log.id} className={isSuspicious ? 'bg-rose-50/50' : undefined}>
                        <TableCell className="font-medium text-slate-900">
                          <div>{log.user.firstName} {log.user.lastName}</div>
                          <div className="text-xs text-slate-500 md:hidden">{log.user.email}</div>
                        </TableCell>
                        <TableCell className="hidden text-slate-600 md:table-cell">{log.user.email}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              log.user.userRole === 'ADMIN'
                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-100'
                                : log.user.userRole === 'EMPLOYEE'
                                ? 'bg-violet-100 text-violet-700 hover:bg-violet-100'
                                : 'bg-sky-100 text-sky-700 hover:bg-sky-100'
                            }
                          >
                            {log.user.userRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-900">
                            {new Date(log.loginDate).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(log.loginDate).toLocaleTimeString('fr-FR')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700">
                            <Globe size={12} className="shrink-0 text-slate-400" />
                            {log.ipAddress}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                            <DeviceIcon type={device.type} />
                            {device.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {log.statusLog === 'SUCCESS' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 size={14} /> Succes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600">
                                <XCircle size={14} /> Echec
                              </span>
                            )}
                            {isSuspicious && (
                              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                                <AlertTriangle size={10} /> Activité suspecte
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-5">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    text="Precedent"
                    onClick={(event) => {
                      event.preventDefault()
                      setPage((prev) => Math.max(1, prev - 1))
                    }}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                  .map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(event) => {
                          event.preventDefault()
                          setPage(p)
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    text="Suivant"
                    onClick={(event) => {
                      event.preventDefault()
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}