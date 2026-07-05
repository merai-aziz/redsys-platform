import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

// GET — liste tous les contrats
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''

    const contracts = await prisma.contract.findMany({
      where: search ? {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { clientFirstName: { contains: search, mode: 'insensitive' } },
          { clientLastName: { contains: search, mode: 'insensitive' } },
          { clientEmail: { contains: search, mode: 'insensitive' } },
        ],
      } : undefined,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, companyName: true } },
        order: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            items: {
              include: { product: { select: { name: true, image_url: true } } },
            },
          },
        },
        contractItems: {
          include: {
            product: { select: { name: true, image_url: true, type: true } },
            selectedOptions: {
              include: {
                configurationValue: {
                  include: {
                    configuration_option: { select: { name: true } },
                    standard_product: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        tickets: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ─── Formatage : même transformation que /api/orders et /api/admin/orders,
    // pour que le front reçoive optionName / valueName / groupName / price ─────
    const formattedContracts = contracts.map((contract) => ({
      ...contract,
      contractItems: contract.contractItems.map((item) => ({
        ...item,
        product: item.product
          ? { name: item.product.name, image_url: item.product.image_url, type: item.product.type }
          : undefined,
        selectedOptions: item.selectedOptions.map((so) => ({
          id: so.id,
          configurationValueId: so.configurationValueId,
          optionName: so.configurationValue.configuration_option.name,
          valueName: so.configurationValue.standard_product.name,
          groupName: so.configurationValue.group_name,
          price: so.configurationValue.price,
        })),
      })),
    }))

    return NextResponse.json({ contracts: formattedContracts })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── Types du payload entrant ───────────────────────────────────────────────
type IncomingSelectedOption = {
  configurationValueId?: number
  quantity?: number
}

type IncomingContractItem = {
  productId?: number
  name: string
  description?: string
  quantity?: number
  selectedOptions?: IncomingSelectedOption[]
}

// POST — créer un contrat
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const body = await req.json()
    const {
      userId,
      orderId,
      companyName,
      clientFirstName,
      clientLastName,
      clientEmail,
      clientPhone,
      description,
      fileUrl,
      warrantyMonths,
      warrantyStart,
      items,
    } = body

    if (!userId || !companyName || !clientFirstName || !clientLastName || !clientEmail || !warrantyStart) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est bien un CLIENT
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userRole: true }
    })

    if (!user || user.userRole !== 'CLIENT') {
      return NextResponse.json({ 
        error: 'Seuls les clients peuvent avoir des contrats de garantie' 
      }, { status: 400 })
    }

    const start = new Date(warrantyStart)
    const months = warrantyMonths ?? 12
    const end = new Date(start)
    end.setMonth(end.getMonth() + months)

    const rawItems = (items ?? []) as IncomingContractItem[]

    const contract = await prisma.$transaction(async (tx) => {
      const newContract = await tx.contract.create({
        data: {
          userId,
          orderId: orderId ?? null,
          companyName,
          clientFirstName,
          clientLastName,
          clientEmail,
          clientPhone: clientPhone ?? null,
          description: description ?? null,
          fileUrl: fileUrl ?? null,
          warrantyMonths: months,
          warrantyStart: start,
          warrantyEnd: end,
          contractItems: rawItems.length > 0 ? {
            create: rawItems.map((item) => {
              const validOptions = (item.selectedOptions ?? []).filter(
                (o): o is Required<Pick<IncomingSelectedOption, 'configurationValueId'>> & IncomingSelectedOption =>
                  typeof o.configurationValueId === 'number',
              )

              return {
                productId: item.productId ?? null,
                name: item.name,
                description: item.description ?? null,
                quantity: item.quantity ?? 1,
                ...(validOptions.length > 0 ? {
                  selectedOptions: {
                    create: validOptions.map((o) => ({
                      configurationValueId: o.configurationValueId!,
                      quantity: Math.max(1, Math.floor(o.quantity ?? 1)),
                    })),
                  },
                } : {}),
              }
            }),
          } : undefined,
        },
        include: {
          contractItems: {
            include: {
              product: { select: { name: true, image_url: true, type: true } },
              selectedOptions: {
                include: {
                  configurationValue: {
                    include: {
                      configuration_option: { select: { name: true } },
                      standard_product: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })

      // Notifier le client
      await tx.notification.create({
        data: {
          userId,
          title: 'Nouveau contrat de garantie',
          message: `Un contrat de garantie de ${months} mois a été créé pour votre compte. Validité jusqu'au ${end.toLocaleDateString('fr-FR')}.`,
          type: 'SYSTEM',
          referenceType: 'CONTRACT',
          referenceId: newContract.id,
        },
      })

      return newContract
    })

    // ─── Formatage identique au GET, pour que le front puisse afficher
    // directement les options du contrat fraîchement créé ──────────────────────
    const formattedContract = {
      ...contract,
      contractItems: contract.contractItems.map((item) => ({
        ...item,
        product: item.product
          ? { name: item.product.name, image_url: item.product.image_url, type: item.product.type }
          : undefined,
        selectedOptions: item.selectedOptions.map((so) => ({
          id: so.id,
          configurationValueId: so.configurationValueId,
          optionName: so.configurationValue.configuration_option.name,
          valueName: so.configurationValue.standard_product.name,
          groupName: so.configurationValue.group_name,
          price: so.configurationValue.price,
        })),
      })),
    }

    return NextResponse.json({ contract: formattedContract }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('POST /api/admin/contracts error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création du contrat' }, { status: 500 })
  }
}