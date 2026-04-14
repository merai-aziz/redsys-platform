import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/equipment'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

type FilterFieldType = 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN'
type FilterKind = 'group' | 'filter' | 'option' | 'product'

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, accessSecret)
    if (payload.role !== 'ADMIN') return null
    return payload
  } catch {
    return null
  }
}

function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function parseFieldType(value: unknown): FilterFieldType {
  const candidate = String(value ?? 'TEXT').toUpperCase()
  if (candidate === 'NUMBER' || candidate === 'SELECT' || candidate === 'BOOLEAN') return candidate
  return 'TEXT'
}

function parseAttributes(value: unknown): Array<{ fieldKey: string; value: string }> {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const raw = item as Record<string, unknown>
      const fieldKey = String(raw.fieldKey ?? '').trim()
      const attributeValue = String(raw.value ?? '').trim()
      if (!fieldKey || !attributeValue) return null
      return { fieldKey, value: attributeValue }
    })
    .filter((item): item is { fieldKey: string; value: string } => Boolean(item))
}

async function getGroupForModel(groupId: string, modelId: string) {
  return prisma.equipmentFilterGroup.findFirst({
    where: {
      id: groupId,
      equipmentModelId: modelId,
    },
    select: {
      id: true,
      equipmentModelId: true,
    },
  })
}

async function getModelWithFilters(modelId: string) {
  const [model, groups, products] = await Promise.all([
    prisma.equipmentModel.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        name: true,
        reference: true,
        slug: true,
      },
    }),
    prisma.equipmentFilterGroup.findMany({
      where: { equipmentModelId: modelId },
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
    }),
    prisma.product.findMany({
      where: { equipmentModelId: modelId },
      orderBy: { createdAt: 'desc' },
      include: {
        attributes: {
          include: {
            filter: {
              select: {
                id: true,
                fieldKey: true,
                label: true,
                fieldType: true,
                unit: true,
              },
            },
          },
        },
      },
    }),
  ])

  return { model, groups, products }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorise', 401)

    const { id } = await context.params
    if (!id) return apiError('ID manquant')
    const modelId = String(id)

    const payload = await getModelWithFilters(modelId)
    if (!payload.model) return apiError('Modele non trouve', 404)

    return NextResponse.json({
      model: payload.model,
      groups: payload.groups.map((group) => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        displayOrder: group.displayOrder,
        filters: group.filters.map((filter) => ({
          id: filter.id,
          label: filter.label,
          fieldKey: filter.fieldKey,
          fieldType: filter.fieldType,
          unit: filter.unit,
          displayOrder: filter.displayOrder,
          options: filter.options.map((option) => ({
            id: option.id,
            value: option.value,
            label: option.label,
            displayOrder: option.displayOrder,
          })),
        })),
      })),
      products: payload.products.map((product) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: Number(product.price),
        condition: product.condition,
        stock: product.stock,
        isActive: product.isActive,
        attributes: product.attributes.map((attribute) => ({
          id: attribute.id,
          filterId: attribute.filterId,
          fieldKey: attribute.filter.fieldKey,
          label: attribute.filter.label,
          fieldType: attribute.filter.fieldType,
          unit: attribute.filter.unit,
          value: attribute.value,
        })),
      })),
    })
  } catch (error) {
    console.error('GET /api/admin/model/[id]/filters error', error)
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorise', 401)

    const { id } = await context.params
    if (!id) return apiError('ID manquant')
    const modelId = String(id)

    const body = (await req.json()) as Record<string, unknown>
    const kind = String(body.kind ?? '').toLowerCase() as FilterKind

    if (kind === 'group') {
      if (!String(body.name ?? '').trim()) return apiError('Nom du groupe requis')
      const groupName = String(body.name).trim()
      const created = await prisma.equipmentFilterGroup.create({
        data: {
          equipmentModelId: modelId,
          name: groupName,
          slug: String(body.slug ?? '').trim() || slugify(groupName),
          displayOrder: Number(body.displayOrder ?? 0),
        },
      })
      return NextResponse.json({ group: created }, { status: 201 })
    }

    if (kind === 'filter') {
      if (!String(body.filterGroupId ?? '').trim()) return apiError('Groupe requis')
      if (!String(body.label ?? '').trim()) return apiError('Label requis')
      if (!String(body.fieldKey ?? '').trim()) return apiError('Cle filtre requise')

      const groupId = String(body.filterGroupId).trim()
      const group = await getGroupForModel(groupId, modelId)
      if (!group) return apiError('Groupe invalide pour ce modele')

      const created = await prisma.equipmentFilter.create({
        data: {
          filterGroupId: groupId,
          equipmentModelId: modelId,
          label: String(body.label).trim(),
          fieldKey: String(body.fieldKey).trim(),
          fieldType: parseFieldType(body.fieldType),
          unit: String(body.unit ?? '').trim() || null,
          displayOrder: Number(body.displayOrder ?? 0),
        },
      })
      return NextResponse.json({ filter: created }, { status: 201 })
    }

    if (kind === 'option') {
      if (!String(body.filterId ?? '').trim()) return apiError('Filtre requis')
      if (!String(body.label ?? '').trim()) return apiError('Label requis')
      if (!String(body.value ?? '').trim()) return apiError('Valeur requise')

      const created = await prisma.equipmentFilterOption.create({
        data: {
          filterId: String(body.filterId),
          label: String(body.label).trim(),
          value: String(body.value).trim(),
          displayOrder: Number(body.displayOrder ?? 0),
        },
      })
      return NextResponse.json({ option: created }, { status: 201 })
    }

    if (kind === 'product') {
      if (!String(body.name ?? '').trim()) return apiError('Nom produit requis')
      if (!String(body.sku ?? '').trim()) return apiError('SKU requis')

      const attributes = parseAttributes(body.attributes)
      const filters = await prisma.equipmentFilter.findMany({
        where: {
          filterGroup: {
            equipmentModelId: modelId,
          },
        },
        select: {
          id: true,
          fieldKey: true,
        },
      })
      const filterIdByKey = new Map(filters.map((filter) => [filter.fieldKey, filter.id]))

      const unknownAttributeKey = attributes.find((attribute) => !filterIdByKey.has(attribute.fieldKey))
      if (unknownAttributeKey) {
        return apiError(`Attribut inconnu pour ce modele: ${unknownAttributeKey.fieldKey}`)
      }

      const product = await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            equipmentModelId: modelId,
            sku: String(body.sku).trim(),
            name: String(body.name).trim(),
            price: new Prisma.Decimal(String(body.price ?? 0)),
            condition: String(body.condition ?? 'A').toUpperCase() as 'A' | 'B' | 'C',
            stock: Number(body.stock ?? 0),
            isActive: Boolean(body.isActive ?? true),
          },
        })

        for (const attribute of attributes) {
          const filterId = filterIdByKey.get(attribute.fieldKey)
          if (!filterId) continue

          await tx.productAttribute.create({
            data: {
              productId: created.id,
              filterId,
              equipmentModelId: modelId,
              value: attribute.value,
            },
          })
        }

        return created
      })

      return NextResponse.json({ product }, { status: 201 })
    }

    return apiError('Type introuvable')
  } catch (error) {
    console.error('POST /api/admin/model/[id]/filters error', error)
    return apiError('Erreur serveur', 500)
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorise', 401)

    const { id } = await context.params
    if (!id) return apiError('ID manquant')
    const modelId = String(id)

    const body = (await req.json()) as Record<string, unknown>
    const kind = String(body.kind ?? '').toLowerCase() as FilterKind
    const targetId = String(body.id ?? '').trim()

    if (!targetId) return apiError('ID requis')

    if (kind === 'group') {
      const nextName = String(body.name ?? '').trim()
      const updated = await prisma.equipmentFilterGroup.update({
        where: { id: targetId },
        data: {
          ...(nextName ? { name: nextName } : {}),
          ...(body.slug !== undefined ? { slug: String(body.slug).trim() || slugify(nextName || 'group') } : {}),
          displayOrder: Number(body.displayOrder ?? 0),
        },
      })
      return NextResponse.json({ group: updated })
    }

    if (kind === 'filter') {
      let nextModelId = modelId
      if (body.filterGroupId !== undefined) {
        const nextGroup = await getGroupForModel(String(body.filterGroupId), modelId)
        if (!nextGroup) return apiError('Groupe invalide pour ce modele')
        nextModelId = nextGroup.equipmentModelId
      }

      const updated = await prisma.equipmentFilter.update({
        where: { id: targetId },
        data: {
          ...(body.filterGroupId ? { filterGroupId: String(body.filterGroupId) } : {}),
          equipmentModelId: nextModelId,
          ...(body.label !== undefined ? { label: String(body.label).trim() } : {}),
          ...(body.fieldKey !== undefined ? { fieldKey: String(body.fieldKey).trim() } : {}),
          ...(body.fieldType !== undefined ? { fieldType: parseFieldType(body.fieldType) } : {}),
          ...(body.unit !== undefined ? { unit: String(body.unit).trim() || null } : {}),
          ...(body.displayOrder !== undefined ? { displayOrder: Number(body.displayOrder) } : {}),
        },
      })
      return NextResponse.json({ filter: updated })
    }

    if (kind === 'option') {
      const updated = await prisma.equipmentFilterOption.update({
        where: { id: targetId },
        data: {
          ...(body.filterId ? { filterId: String(body.filterId) } : {}),
          ...(body.label !== undefined ? { label: String(body.label).trim() } : {}),
          ...(body.value !== undefined ? { value: String(body.value).trim() } : {}),
          ...(body.displayOrder !== undefined ? { displayOrder: Number(body.displayOrder) } : {}),
        },
      })
      return NextResponse.json({ option: updated })
    }

    if (kind === 'product') {
      const currentProduct = await prisma.product.findUnique({
        where: { id: targetId },
        select: { id: true, equipmentModelId: true },
      })
      if (!currentProduct || currentProduct.equipmentModelId !== modelId) {
        return apiError('Produit introuvable pour ce modele', 404)
      }

      const attributes = parseAttributes(body.attributes)
      const filters = await prisma.equipmentFilter.findMany({
        where: {
          filterGroup: {
            equipmentModelId: modelId,
          },
        },
        select: {
          id: true,
          fieldKey: true,
        },
      })
      const filterIdByKey = new Map(filters.map((filter) => [filter.fieldKey, filter.id]))

      const unknownAttributeKey = attributes.find((attribute) => !filterIdByKey.has(attribute.fieldKey))
      if (unknownAttributeKey) {
        return apiError(`Attribut inconnu pour ce modele: ${unknownAttributeKey.fieldKey}`)
      }

      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.product.update({
          where: { id: targetId },
          data: {
            ...(body.sku !== undefined ? { sku: String(body.sku).trim() } : {}),
            ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
            ...(body.price !== undefined ? { price: new Prisma.Decimal(String(body.price)) } : {}),
            ...(body.condition !== undefined
              ? { condition: String(body.condition).toUpperCase() as 'A' | 'B' | 'C' }
              : {}),
            ...(body.stock !== undefined ? { stock: Number(body.stock) } : {}),
            ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
          },
        })

        if (Array.isArray(body.attributes)) {
          await tx.productAttribute.deleteMany({ where: { productId: targetId } })
          for (const attribute of attributes) {
            const filterId = filterIdByKey.get(attribute.fieldKey)
            if (!filterId) continue
            await tx.productAttribute.create({
              data: {
                productId: next.id,
                filterId,
                equipmentModelId: modelId,
                value: attribute.value,
              },
            })
          }
        }

        return next
      })

      return NextResponse.json({ product: updated })
    }

    return apiError('Type introuvable')
  } catch (error) {
    console.error('PUT /api/admin/model/[id]/filters error', error)
    return apiError('Erreur serveur', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await checkAdmin(req)
    if (!admin) return apiError('Non autorise', 401)

    const { id } = await context.params
    if (!id) return apiError('ID manquant')

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const kind = String(body.kind ?? '').toLowerCase() as FilterKind
    const targetId = String(body.id ?? '').trim()

    if (!targetId) return apiError('ID requis')

    if (kind === 'group') {
      await prisma.equipmentFilterGroup.delete({ where: { id: targetId } })
      return NextResponse.json({ success: true })
    }

    if (kind === 'filter') {
      await prisma.equipmentFilter.delete({ where: { id: targetId } })
      return NextResponse.json({ success: true })
    }

    if (kind === 'option') {
      await prisma.equipmentFilterOption.delete({ where: { id: targetId } })
      return NextResponse.json({ success: true })
    }

    if (kind === 'product') {
      await prisma.product.delete({ where: { id: targetId } })
      return NextResponse.json({ success: true })
    }

    return apiError('Type introuvable')
  } catch (error) {
    console.error('DELETE /api/admin/model/[id]/filters error', error)
    return apiError('Erreur serveur', 500)
  }
}
