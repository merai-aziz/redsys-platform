import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import type { FacetsMap } from '@/types/filters'

const RESERVED_PARAMS = new Set([
  'model_id',
  'modelId',
  'min_price',
  'max_price',
  'is_active',
  'limit',
  'offset',
  'sort',
])

const sortEnum = z
  .enum(['price_asc', 'price_desc', 'name_asc', 'stock_desc'])
  .optional()

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const modelId = searchParams.get('model_id') ?? searchParams.get('modelId')

    if (!modelId) {
      return NextResponse.json(
        { error: 'Le parametre model_id est requis' },
        { status: 400 },
      )
    }

    const knownFilters = await prisma.equipmentFilter.findMany({
      where: {
        filterGroup: {
          equipmentModelId: modelId,
        },
      },
      select: {
        id: true,
        fieldKey: true,
        options: {
          select: {
            value: true,
            label: true,
          },
        },
      },
    })

    const filterIdByKey = new Map(
      knownFilters.map((filter) => [filter.fieldKey, filter.id]),
    )

    const attributeValuesByKey = new Map<string, string[]>()

    for (const [key, value] of searchParams.entries()) {
      if (RESERVED_PARAMS.has(key)) continue
      if (!filterIdByKey.has(key)) continue

      const parsedValues = value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)

      if (parsedValues.length === 0) continue

      attributeValuesByKey.set(key, parsedValues)
    }

    const attributeConditions: Prisma.ProductWhereInput[] = []

    for (const [fieldKey, values] of attributeValuesByKey.entries()) {
      const filterId = filterIdByKey.get(fieldKey)
      if (!filterId) continue

      attributeConditions.push({
        attributes: {
          some: {
            filterId,
            value: values.length === 1 ? values[0] : { in: values },
          },
        },
      })
    }

    const minPrice = searchParams.get('min_price')
    const maxPrice = searchParams.get('max_price')
    const isActive = searchParams.get('is_active')
    const sortParam = searchParams.get('sort') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0)

    const parsedSort = sortEnum.safeParse(sortParam)
    const sortValue = parsedSort.success ? parsedSort.data : undefined

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortValue === 'price_asc'
        ? { price: 'asc' }
        : sortValue === 'price_desc'
          ? { price: 'desc' }
          : sortValue === 'name_asc'
            ? { name: 'asc' }
            : sortValue === 'stock_desc'
              ? { stock: 'desc' }
              : { createdAt: 'desc' }

    const sortApplied = sortValue ?? 'createdAt_desc'

    const baseWhere: Prisma.ProductWhereInput = {
      equipmentModelId: modelId,
      ...(isActive === 'true' ? { isActive: true } : {}),
      ...(isActive === 'false' ? { isActive: false } : {}),
      ...(minPrice || maxPrice
        ? {
            price: {
              ...(minPrice ? { gte: minPrice } : {}),
              ...(maxPrice ? { lte: maxPrice } : {}),
            },
          }
        : {}),
    }

    const where: Prisma.ProductWhereInput = {
      ...baseWhere,
      ...(attributeConditions.length > 0 ? { AND: attributeConditions } : {}),
    }

    const facets: FacetsMap = {}

    for (const filter of knownFilters) {
      const optionLabelByValue = new Map(
        filter.options.map((option) => [option.value, option.label]),
      )

      const otherConditions: Prisma.ProductWhereInput[] = []
      for (const [fieldKey, values] of attributeValuesByKey.entries()) {
        if (fieldKey === filter.fieldKey) continue

        const otherFilterId = filterIdByKey.get(fieldKey)
        if (!otherFilterId) continue

        otherConditions.push({
          attributes: {
            some: {
              filterId: otherFilterId,
              value: values.length === 1 ? values[0] : { in: values },
            },
          },
        })
      }

      const facetProductWhere: Prisma.ProductWhereInput = {
        ...baseWhere,
        ...(otherConditions.length > 0 ? { AND: otherConditions } : {}),
      }

      const facetProductIds = await prisma.product.findMany({
        where: facetProductWhere,
        select: { id: true },
      })

      if (facetProductIds.length === 0) {
        facets[filter.fieldKey] = []
        continue
      }

      const grouped = await prisma.productAttribute.groupBy({
        by: ['value'],
        where: {
          filterId: filter.id,
          productId: { in: facetProductIds.map((product) => product.id) },
        },
        _count: {
          value: true,
        },
      })

      facets[filter.fieldKey] = grouped
        .map((entry) => ({
          value: entry.value,
          label: optionLabelByValue.get(entry.value) ?? entry.value,
          count: entry._count.value,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: offset,
        take: Number.isNaN(limit) ? 50 : limit,
        include: {
          equipmentModel: {
            select: {
              id: true,
              name: true,
              reference: true,
            },
          },
          attributes: {
            include: {
              filter: {
                select: {
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
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      total,
      count: items.length,
      sort_applied: sortApplied,
      filters_applied: Object.fromEntries(attributeValuesByKey.entries()),
      facets,
      products: items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        price: Number(item.price),
        condition: item.condition,
        stock: item.stock,
        is_active: item.isActive,
        model: item.equipmentModel,
        attributes: item.attributes.map((attribute) => ({
          filter_id: attribute.filterId,
          field_key: attribute.filter.fieldKey,
          label: attribute.filter.label,
          field_type: attribute.filter.fieldType.toLowerCase(),
          unit: attribute.filter.unit,
          value: attribute.value,
        })),
      })),
    })
  } catch (error) {
    console.error('GET /api/products error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
