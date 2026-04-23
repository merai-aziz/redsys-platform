import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_DOMAIN_CODES = new Set(['SERVER', 'STORAGE', 'NETWORK'])

type DomainCode = 'SERVER' | 'STORAGE' | 'NETWORK'

export async function GET(request: Request) {
  await requireAdmin(request)

  const rows = await prisma.sparepartDomainFilter.findMany({
    orderBy: [{ domain_code: 'asc' }, { sort_order: 'asc' }, { filter_id: 'asc' }],
    include: {
      filter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  const grouped = new Map<string, Array<{ id: number; name: string }>>()
  rows.forEach((row) => {
    const current = grouped.get(row.domain_code) ?? []
    current.push({ id: row.filter.id, name: row.filter.name })
    grouped.set(row.domain_code, current)
  })

  const domainFilters = Array.from(grouped.entries()).map(([domainCode, filters]) => ({
    domainCode,
    filters,
  }))

  return NextResponse.json({ domainFilters })
}

export async function PUT(request: Request) {
  await requireAdmin(request)

  const body = (await request.json()) as {
    domainFilters?: Array<{
      domainCode?: string
      filterIds?: number[]
    }>
  }

  const normalizedAssignments = Array.isArray(body.domainFilters)
    ? body.domainFilters
      .map((entry) => {
        const domainCode = String(entry.domainCode ?? '').toUpperCase()
        const filterIds = Array.isArray(entry.filterIds)
          ? entry.filterIds.filter((filterId): filterId is number => Number.isInteger(filterId))
          : []
        return { domainCode, filterIds }
      })
      .filter((entry) => ALLOWED_DOMAIN_CODES.has(entry.domainCode))
    : []

  await prisma.$transaction(async (tx) => {
    await tx.sparepartDomainFilter.deleteMany({})

    const rows = normalizedAssignments.flatMap((assignment) =>
      assignment.filterIds.map((filterId, index) => ({
        domain_code: assignment.domainCode as DomainCode,
        filter_id: filterId,
        sort_order: index,
      })),
    )

    if (rows.length > 0) {
      await tx.sparepartDomainFilter.createMany({
        data: rows,
        skipDuplicates: true,
      })
    }
  })

  return NextResponse.json({ success: true })
}
