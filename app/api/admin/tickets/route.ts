import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search') ?? ''

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { user: { firstName: { contains: search, mode: 'insensitive' } } },
            { user: { lastName: { contains: search, mode: 'insensitive' } } },
            { user: { companyName: { contains: search, mode: 'insensitive' } } },
          ],
        } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, companyName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, departement: true } },
        contract: {
          select: {
            id: true,
            companyName: true,
            warrantyEnd: true,
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
          },
        },
        comments: {
          include: { author: { select: { id: true, firstName: true, lastName: true, userRole: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ─── Formatage : même transformation que pour commandes/contrats, pour que
    // le front reçoive optionName / valueName / groupName / price exploitables ──
    const formattedTickets = tickets.map((ticket) => ({
      ...ticket,
      contract: ticket.contract ? {
        ...ticket.contract,
        contractItems: ticket.contract.contractItems.map((item) => ({
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
      } : null,
    }))

    return NextResponse.json({ tickets: formattedTickets })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}