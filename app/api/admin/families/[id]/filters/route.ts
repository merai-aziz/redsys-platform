import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: Params) {
  await requireAdmin(request)

  const { id } = await context.params
  const familyId = Number(id)

  if (!Number.isInteger(familyId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const [family, links] = await Promise.all([
    prisma.family.findUnique({
      where: { id: familyId },
      include: { category: true },
    }),
    prisma.$queryRaw<Array<{ filter_id: number }>>`
      SELECT filter_id
      FROM family_filters
      WHERE family_id = ${familyId}
      ORDER BY sort_order ASC, filter_id ASC
    `,
  ])

  if (!family) {
    return NextResponse.json({ error: 'Famille introuvable' }, { status: 404 })
  }

  return NextResponse.json({
    family,
    assignedFilterIds: links.map((link) => link.filter_id),
  })
}

export async function PUT(request: Request, context: Params) {
  await requireAdmin(request)

  const { id } = await context.params
  const familyId = Number(id)

  if (!Number.isInteger(familyId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const body = (await request.json()) as { filterIds?: number[] }
  const filterIds = Array.isArray(body.filterIds)
    ? body.filterIds.filter((filterId): filterId is number => Number.isInteger(filterId))
    : []

  const uniqueFilterIds = Array.from(new Set(filterIds))

  const operations = [
    prisma.$executeRaw`
      DELETE FROM family_filters
      WHERE family_id = ${familyId}
    `,
    ...uniqueFilterIds.map((filterId, index) =>
      prisma.$executeRaw`
        INSERT INTO family_filters (family_id, filter_id, sort_order)
        VALUES (${familyId}, ${filterId}, ${index})
      `),
  ]

  await prisma.$transaction(operations)

  return NextResponse.json({ success: true })
}
