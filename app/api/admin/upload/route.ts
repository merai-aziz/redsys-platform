import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { requireAdmin } from '@/lib/auth'

type UploadContext = 'contracts' | 'products'

const ALLOWED_TYPES: Record<UploadContext, string[]> = {
  contracts: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  products: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ],
}

const MAX_SIZE: Record<UploadContext, number> = {
  contracts: 10 * 1024 * 1024, // 10 Mo
  products: 5 * 1024 * 1024,   // 5 Mo
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    // context = 'contracts' | 'products' — défaut: contracts (rétro-compat)
    const rawContext = (formData.get('context') as string | null) ?? 'contracts'
    const context: UploadContext = rawContext === 'products' ? 'products' : 'contracts'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    if (!ALLOWED_TYPES[context].includes(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non supporté pour le contexte "${context}"` },
        { status: 400 },
      )
    }

    if (file.size > MAX_SIZE[context]) {
      const maxMb = MAX_SIZE[context] / (1024 * 1024)
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${maxMb} Mo)` },
        { status: 400 },
      )
    }

    const timestamp = Date.now()
    const safeName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', context)
    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, safeName), buffer)

    const fileUrl = `/uploads/${context}/${safeName}`
    return NextResponse.json({ fileUrl })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 })
  }
}