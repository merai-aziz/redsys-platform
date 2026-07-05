import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

// ─── Helpers ──────────────────────────────────────────────────────────────

function calculateWarrantyEnd(start: Date, months: number): Date {
  const end = new Date(start)
  end.setMonth(end.getMonth() + months)
  return end
}

function formatContract(contract: any) {
  return {
    ...contract,
    contractItems: contract.contractItems.map((item: any) => ({
      ...item,
      product: item.product
        ? {
            name: item.product.name,
            image_url: item.product.image_url,
            type: item.product.type,
          }
        : undefined,
      selectedOptions: item.selectedOptions.map((so: any) => ({
        id: so.id,
        configurationValueId: so.configurationValueId,
        optionName: so.configurationValue.configuration_option.name,
        valueName: so.configurationValue.standard_product.name,
        groupName: so.configurationValue.group_name,
        price: so.configurationValue.price,
      })),
    })),
  }
}

function buildUpdateData(
  body: any,
  existing: any
): {
  data: any
  warrantyStart: Date
  warrantyMonths: number
} {
  const {
    companyName,
    clientPhone,
    description,
    fileUrl,
    warrantyMonths,
    warrantyStart,
  } = body

  const start = warrantyStart ? new Date(warrantyStart) : existing.warrantyStart
  const months = warrantyMonths ?? existing.warrantyMonths
  const end = calculateWarrantyEnd(start, months)

  const data = {
    ...(companyName !== undefined ? { companyName } : {}),
    ...(clientPhone !== undefined ? { clientPhone: clientPhone || null } : {}),
    ...(description !== undefined ? { description: description || null } : {}),
    ...(fileUrl !== undefined ? { fileUrl: fileUrl || null } : {}),
    warrantyMonths: months,
    warrantyStart: start,
    warrantyEnd: end,
  }

  return { data, warrantyStart: start, warrantyMonths: months }
}

// ─── Route Handler ────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req)

    const { id } = params

    // ── Vérification de l'existence ──
    const existing = await prisma.contract.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Contrat introuvable' },
        { status: 404 }
      )
    }

    // ── Construction des données ──
    const body = await req.json()
    const { data } = buildUpdateData(body, existing)

    // ── Mise à jour ──
    const updated = await prisma.contract.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
          },
        },
        contractItems: {
          include: {
            product: {
              select: {
                name: true,
                image_url: true,
                type: true,
              },
            },
            selectedOptions: {
              include: {
                configurationValue: {
                  include: {
                    configuration_option: {
                      select: { name: true },
                    },
                    standard_product: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
        tickets: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    // ── Formatage de la réponse ──
    const formattedContract = formatContract(updated)

    return NextResponse.json({ contract: formattedContract })
  } catch (err) {
    if (err instanceof Response) return err

    console.error('PATCH /api/admin/contracts/[id] error:', err)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du contrat' },
      { status: 500 }
    )
  }
}