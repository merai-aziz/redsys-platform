import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { payload } = await jwtVerify(token, accessSecret)
    const userId = payload.userId as string

    const formData = await req.formData()
    const file = formData.get('photo') as File
    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

    // Vérification type
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté (jpg, png, webp)' }, { status: 400 })
    }

    // Vérification taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop lourd (max 2MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Créer le dossier si inexistant
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    await mkdir(uploadDir, { recursive: true })

    // Nom unique
    const ext = file.name.split('.').pop()
    const filename = `${userId}-${Date.now()}.${ext}`
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    const photoUrl = `/uploads/avatars/${filename}`

    await prisma.user.update({
      where: { id: userId },
      data: { photo: photoUrl }
    })

    return NextResponse.json({ photo: photoUrl })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}