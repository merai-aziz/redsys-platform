'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw, Search, XCircle } from 'lucide-react'

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

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL')
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return logs.filter((log) => {
      const matchesSearch = `${log.user.firstName} ${log.user.lastName} ${log.user.email} ${log.ipAddress}`
        .toLowerCase()
        .includes(q)
      const matchesFilter = filter === 'ALL' || log.statusLog === filter
      return matchesSearch && matchesFilter
    })
  }, [logs, search, filter])

  const perPage = 12
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pagedLogs = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page])

  const successCount = logs.filter((l) => l.statusLog === 'SUCCESS').length
  const failedCount = logs.filter((l) => l.statusLog === 'FAILED').length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des connexions</h1>
          <p className="mt-1 text-sm text-slate-500">Suivi des 100 dernieres tentatives de connexion.</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} className="border-slate-200 bg-white">
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Journal d acces</CardTitle>
          <CardDescription>Filtrer par statut et rechercher rapidement.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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

            <div className="flex gap-2">
              {(['ALL', 'SUCCESS', 'FAILED'] as const).map((f) => (
                <Button
                  key={f}
                  type="button"
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => {
                    setFilter(f)
                    setPage(1)
                  }}
                  className={filter === f ? 'bg-sky-600 text-white hover:bg-sky-700' : 'border-slate-200 bg-white'}
                >
                  {f === 'ALL' ? 'Tous' : f === 'SUCCESS' ? 'Succes' : 'Echecs'}
                </Button>
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Date et heure</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    Aucun log trouve.
                  </TableCell>
                </TableRow>
              ) : (
                pagedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-slate-900">
                      {log.user.firstName} {log.user.lastName}
                    </TableCell>
                    <TableCell className="text-slate-600">{log.user.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          log.user.userRole === 'ADMIN'
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-100'
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
                        {new Date(log.loginDate).toLocaleTimeString('fr-FR')} - {log.ipAddress}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.statusLog === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 size={14} /> Succes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600">
                          <XCircle size={14} /> Echec
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

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
