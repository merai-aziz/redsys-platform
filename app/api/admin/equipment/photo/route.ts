import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('access_token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { payload } = await jwtVerify(token, accessSecret)
    if (payload.role !== 'ADMIN') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('photo') as File
    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporte (jpg, png, webp)' }, { status: 400 })
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop lourd (max 4MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'equipment')
    await mkdir(uploadDir, { recursive: true })

    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `equipment-${Date.now()}.${ext}`
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    return NextResponse.json({ photo: `/uploads/equipment/${filename}` })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
