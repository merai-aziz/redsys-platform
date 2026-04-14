import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Model ID requis' }, { status: 400 })
    }

    const model = await prisma.equipmentModel.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!model) {
      return NextResponse.json({ error: 'Modèle introuvable' }, { status: 404 })
    }

    const groups = await prisma.equipmentFilterGroup.findMany({
      where: { equipmentModelId: id },
      orderBy: { displayOrder: 'asc' },
      include: {
        filters: {
          orderBy: { displayOrder: 'asc' },
          include: {
            options: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    })

    return NextResponse.json({
      model,
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        display_order: group.displayOrder,
        filters: group.filters.map((filter) => ({
          id: filter.id,
          label: filter.label,
          field_key: filter.fieldKey,
          field_type: filter.fieldType.toLowerCase(),
          unit: filter.unit,
          display_order: filter.displayOrder,
          options: filter.options.map((option) => ({
            id: option.id,
            value: option.value,
            label: option.label,
            display_order: option.displayOrder,
          })),
        })),
      })),
    })
  } catch (error) {
    console.error('GET /api/models/[id]/filters error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
