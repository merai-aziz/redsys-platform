import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function saveContractPdf(contractId: string, buffer: Buffer): Promise<string> {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'contracts')
  await mkdir(dir, { recursive: true })
  const filename = `contrat-${contractId}.pdf`
  await writeFile(path.join(dir, filename), buffer)
  return `/uploads/contracts/${filename}`
}