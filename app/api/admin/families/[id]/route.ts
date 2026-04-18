import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, context: Params) {
  await requireAdmin(request)

  const { id } = await context.params
  const familyId = Number(id)

  if (!Number.isInteger(familyId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const body = (await request.json()) as { name?: string; category_id?: number }
  const name = body.name?.trim()
  const categoryId = Number(body.category_id)

  if (!name || !Number.isInteger(categoryId)) {
    return NextResponse.json({ error: 'Nom et category_id requis' }, { status: 400 })
  }

  const family = await prisma.family.update({
    where: { id: familyId },
    data: { name, category_id: categoryId },
  })

  return NextResponse.json({ family })
}

export async function DELETE(request: Request, context: Params) {
  await requireAdmin(request)

  const { id } = await context.params
  const familyId = Number(id)

  if (!Number.isInteger(familyId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  await prisma.family.delete({ where: { id: familyId } })
  return NextResponse.json({ success: true })
}
