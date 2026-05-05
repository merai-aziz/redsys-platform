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
          include: { product: { select: { name: true } } },
        },
        tickets: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ contracts })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
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
          contractItems: items?.length > 0 ? {
            create: items.map((item: { productId?: number; name: string; description?: string; quantity?: number }) => ({
              productId: item.productId ?? null,
              name: item.name,
              description: item.description ?? null,
              quantity: item.quantity ?? 1,
            })),
          } : undefined,
        },
        include: {
          contractItems: true,
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

    return NextResponse.json({ contract }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('POST /api/admin/contracts error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création du contrat' }, { status: 500 })
  }
}