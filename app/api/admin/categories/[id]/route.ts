import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, context: Params) {
  await requireAdmin(request)
  const { id } = await context.params
  const categoryId = Number(id)

  if (!Number.isInteger(categoryId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const body = (await request.json()) as { name?: string }
  const name = body.name?.trim()

  if (!name) {
    return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  }

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: { name },
  })

  return NextResponse.json({ category })
}

export async function DELETE(request: Request, context: Params) {
  await requireAdmin(request)
  const { id } = await context.params
  const categoryId = Number(id)

  if (!Number.isInteger(categoryId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  await prisma.category.delete({ where: { id: categoryId } })
  return NextResponse.json({ success: true })
}
