import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const updateBodySchema = z
  .object({
    price: z.coerce.number().nonnegative().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    condition: z.enum(['A', 'B', 'C']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.price !== undefined ||
      body.stock !== undefined ||
      body.condition !== undefined ||
      body.isActive !== undefined,
    { message: 'Aucun champ a mettre a jour' },
  )

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request)

    const rawParams = await context.params
    const parsedParams = paramsSchema.safeParse(rawParams)
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: 'Parametre id invalide', details: parsedParams.error.flatten() },
        { status: 400 },
      )
    }

    const parsedBody = updateBodySchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Body invalide', details: parsedBody.error.flatten() },
        { status: 400 },
      )
    }

    const { id } = parsedParams.data
    const body = parsedBody.data

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.stock !== undefined ? { stock: body.stock } : {}),
        ...(body.condition !== undefined ? { condition: body.condition } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    })

    return NextResponse.json({ product: updated })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('PUT /api/admin/products/[id] error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request)

    const rawParams = await context.params
    const parsedParams = paramsSchema.safeParse(rawParams)
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: 'Parametre id invalide', details: parsedParams.error.flatten() },
        { status: 400 },
      )
    }

    const { id } = parsedParams.data

    await prisma.$transaction(async (tx) => {
      await tx.productAttribute.deleteMany({ where: { productId: id } })
      await tx.product.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('DELETE /api/admin/products/[id] error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
