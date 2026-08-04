import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'

interface ContractPdfOption {
  optionName: string
  valueName: string
  groupName?: string | null
  price?: number | string | null
}

interface ContractPdfItem {
  name: string
  description?: string | null
  quantity: number
  selectedOptions?: ContractPdfOption[]
}

export interface ContractPdfData {
  id: string
  companyName: string
  clientFirstName: string
  clientLastName: string
  clientEmail: string
  clientPhone?: string | null
  description?: string | null
  warrantyMonths: number
  warrantyStart: Date | string
  warrantyEnd: Date | string
  createdAt: Date | string
  contractItems: ContractPdfItem[]
  order?: {
    id: string
    total: number
    createdAt: Date | string
    paymentMethod?: string | null
  } | null
}

// ─── Palette de couleurs ────────────────────────────────────────────────────
const COLORS = {
  primary: '#0f172a',
  accent: '#0284c7',
  accentDark: '#075985',
  text: '#334155',
  textMuted: '#64748b',
  border: '#e2e8f0',
  bgAlt: '#f8fafc',
  success: '#0f6e56',
  white: '#ffffff',
}

const MARGIN = 40
const FOOTER_RESERVED = 40 // espace réservé en bas de page pour le pied de page

function formatDateFr(d: Date | string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Formatage manuel de la devise ──────────────────────────────────────────
// On évite Intl/toLocaleString('fr-FR') car il insère un espace insécable fin
// (U+202F) comme séparateur de milliers, glyphe absent des polices AFM
// standard de PDFKit (Helvetica) → s'affichait comme "/". On utilise ici un
// espace normal (U+0020), toujours supporté.
function formatCurrencyFr(v: number | string) {
  const num = Number(v)
  const fixed = num.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const intWithSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${intWithSpaces},${decPart} €`
}

// ─── Vérifie l'espace restant ; ajoute une nouvelle page si nécessaire ─────
function ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number) {
  const bottomLimit = doc.page.height - FOOTER_RESERVED
  if (doc.y + neededHeight > bottomLimit) {
    doc.addPage()
    doc.y = MARGIN
  }
}

// ─── En-tête ─────────────────────────────────────────────────────────────
function drawHeader(doc: PDFKit.PDFDocument, data: ContractPdfData) {
  const pageWidth = doc.page.width
  const headerHeight = 90

  // Bandeau coloré
  doc.rect(0, 0, pageWidth, headerHeight).fill(COLORS.primary)
  doc.rect(0, headerHeight - 4, pageWidth, 4).fill(COLORS.accent)

  // Logo : tente de charger public/logo-redsys.png, sinon logo texte
  const logoPath = path.join(process.cwd(), 'public', 'redsys-logo.png')
  let logoDrawn = false
  try {
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 20, { fit: [120, 50] })
      logoDrawn = true
    }
  } catch {
    logoDrawn = false
  }

  if (!logoDrawn) {
    // Logo texte de secours : pastille + "REDSYS"
    doc.circle(66, 45, 16).fill(COLORS.accent)
    doc.fontSize(14).fillColor(COLORS.white).font('Helvetica-Bold')
      .text('R', 60, 37)
    doc.fontSize(20).fillColor(COLORS.white).font('Helvetica-Bold')
      .text('REDSYS', 92, 35)
  }

  // Titre document, aligné à droite
  doc.fontSize(16).fillColor(COLORS.white).font('Helvetica-Bold')
    .text('CONTRAT DE GARANTIE', 0, 28, { align: 'right', width: pageWidth - 50 })
  doc.fontSize(9).fillColor('#cbd5e1').font('Helvetica')
    .text(`Réf. ${data.id}`, 0, 50, { align: 'right', width: pageWidth - 50 })
  doc.fontSize(9).fillColor('#cbd5e1')
    .text(`Émis le ${formatDateFr(data.createdAt)}`, 0, 63, { align: 'right', width: pageWidth - 50 })

  doc.y = headerHeight + 25
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 30)
  const y = doc.y
  doc.rect(MARGIN, y, 3, 11).fill(COLORS.accent)
  doc.fontSize(10).fillColor(COLORS.primary).font('Helvetica-Bold').text(title, MARGIN + 8, y - 1)
  doc.y = y + 15
}

function infoCard(
  doc: PDFKit.PDFDocument,
  rows: Array<{ label: string; value: string }>,
  options?: { columns?: number }
) {
  const pageWidth = doc.page.width - MARGIN * 2
  const columns = options?.columns ?? 2
  const colWidth = pageWidth / columns
  const rowHeight = 26
  const rowsCount = Math.ceil(rows.length / columns)
  const cardHeight = rowsCount * rowHeight + 10

  ensureSpace(doc, cardHeight + 12)
  const startY = doc.y

  doc.roundedRect(MARGIN, startY, pageWidth, cardHeight, 5).fill(COLORS.bgAlt)
  doc.roundedRect(MARGIN, startY, pageWidth, cardHeight, 5).stroke(COLORS.border)

  rows.forEach((row, idx) => {
    const col = idx % columns
    const line = Math.floor(idx / columns)
    const x = MARGIN + col * colWidth + 12
    const y = startY + 7 + line * rowHeight

    doc.fontSize(6.5).fillColor(COLORS.textMuted).font('Helvetica-Bold')
      .text(row.label.toUpperCase(), x, y)
    doc.fontSize(9).fillColor(COLORS.primary).font('Helvetica-Bold')
      .text(row.value, x, y + 9.5, { width: colWidth - 20 })
  })

  doc.y = startY + cardHeight + 12
}

// ─── Bloc de signature avec images ─────────────────────────────────────────
function drawSignatures(doc: PDFKit.PDFDocument, redsysName: string, clientCompanyName: string) {
  const boxHeight = 90
  ensureSpace(doc, boxHeight + 30)

  sectionTitle(doc, 'Signatures')

  const pageWidth = doc.page.width - MARGIN * 2
  const boxWidth = (pageWidth - 16) / 2
  const startY = doc.y

  const boxes = [
    { x: MARGIN, label: 'Pour REDSYS', company: redsysName, imgFile: 'signature-redsys.png' },
    { x: MARGIN + boxWidth + 16, label: 'Pour le client', company: clientCompanyName, imgFile: 'signature-client.png' },
  ]

  boxes.forEach((box) => {
    doc.roundedRect(box.x, startY, boxWidth, boxHeight, 5).stroke(COLORS.border)

    doc.fontSize(6.5).fillColor(COLORS.textMuted).font('Helvetica-Bold')
      .text(box.label.toUpperCase(), box.x + 12, startY + 8)

    doc.fontSize(8.5).fillColor(COLORS.primary).font('Helvetica-Bold')
      .text(box.company, box.x + 12, startY + 18, { width: boxWidth - 24 })

    const imgPath = path.join(process.cwd(), 'public', box.imgFile)
    try {
      if (fs.existsSync(imgPath)) {
        doc.image(imgPath, box.x + 14, startY + 32, { fit: [boxWidth - 28, 34] })
      } else {
        doc.fontSize(6.5).fillColor(COLORS.textMuted).font('Helvetica-Oblique')
          .text('(signature non fournie)', box.x + 14, startY + 44)
      }
    } catch {
      doc.fontSize(6.5).fillColor(COLORS.textMuted).font('Helvetica-Oblique')
        .text('(signature non fournie)', box.x + 14, startY + 44)
    }

    doc.moveTo(box.x + 12, startY + boxHeight - 16)
      .lineTo(box.x + boxWidth - 12, startY + boxHeight - 16)
      .strokeColor(COLORS.border).stroke()

    doc.fontSize(6.5).fillColor(COLORS.textMuted).font('Helvetica')
      .text(`Signé le ${formatDateFr(new Date())}`, box.x + 12, startY + boxHeight - 11)
  })

  doc.y = startY + boxHeight + 10
}

// ─── Pied de page sur toutes les pages générées ─────────────────────────────
function drawFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    const pageWidth = doc.page.width
    const bottom = doc.page.height - 32

    doc.moveTo(MARGIN, bottom).lineTo(pageWidth - MARGIN, bottom).strokeColor(COLORS.border).stroke()
    doc.fontSize(7).fillColor(COLORS.textMuted).font('Helvetica')
      .text('REDSYS — Contrat de garantie', MARGIN, bottom + 6, { width: pageWidth - MARGIN * 2 - 60 })
    doc.fontSize(7).fillColor(COLORS.textMuted)
      .text(`Page ${i - range.start + 1} / ${range.count}`, 0, bottom + 6, {
        align: 'right',
        width: pageWidth - MARGIN,
      })
  }
}

export async function generateContractPdfBuffer(data: ContractPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    drawHeader(doc, data)

    sectionTitle(doc, 'Informations client')
    infoCard(doc, [
      { label: 'Société', value: data.companyName },
      { label: 'Client', value: `${data.clientFirstName} ${data.clientLastName}` },
      { label: 'Email', value: data.clientEmail },
      { label: 'Téléphone', value: data.clientPhone || '—' },
    ])

    sectionTitle(doc, 'Garantie')
    infoCard(doc, [
      { label: 'Durée', value: `${data.warrantyMonths} mois` },
      { label: 'Début', value: formatDateFr(data.warrantyStart) },
      { label: 'Fin', value: formatDateFr(data.warrantyEnd) },
      { label: 'Statut', value: new Date(data.warrantyEnd) > new Date() ? 'Active' : 'Expirée' },
    ], { columns: 4 })

    if (data.order) {
      sectionTitle(doc, 'Commande liée')
      infoCard(doc, [
        { label: 'Numéro', value: `#${data.order.id.slice(0, 8).toUpperCase()}` },
        { label: 'Date', value: formatDateFr(data.order.createdAt) },
        { label: 'Montant total', value: formatCurrencyFr(data.order.total) },
        { label: 'Paiement', value: data.order.paymentMethod || '—' },
      ], { columns: 4 })
    }

    if (data.description) {
      sectionTitle(doc, 'Notes')
      const textHeight = doc.heightOfString(data.description, { width: doc.page.width - MARGIN * 2 })
      ensureSpace(doc, textHeight + 10)
      doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica')
        .text(data.description, MARGIN, doc.y, { width: doc.page.width - MARGIN * 2 })
      doc.y += 8
    }

    // ── Produits couverts ────────────────────────────────────────────────
    sectionTitle(doc, 'Produits couverts')

    const pageWidth = doc.page.width - MARGIN * 2
    data.contractItems.forEach((item, idx) => {
      const options = item.selectedOptions ?? []
      // Hauteur estimée du bloc produit (ligne titre + options), pour décider
      // s'il faut sauter de page AVANT de commencer à le dessiner (évite les coupures au milieu)
      const estimatedHeight = 18 + options.length * 10 + 3
      ensureSpace(doc, estimatedHeight)

      const rowStartY = doc.y
      const rowBg = idx % 2 === 0 ? COLORS.bgAlt : COLORS.white
      doc.rect(MARGIN, rowStartY, pageWidth, 18).fill(rowBg)

      doc.fontSize(8.5).fillColor(COLORS.primary).font('Helvetica-Bold')
        .text(`${idx + 1}. ${item.name}`, MARGIN + 6, rowStartY + 5, { width: pageWidth - 80 })
      doc.fontSize(8).fillColor(COLORS.accentDark).font('Helvetica-Bold')
        .text(`×${item.quantity}`, 0, rowStartY + 5, { align: 'right', width: pageWidth + MARGIN - 10 })

      doc.y = rowStartY + 18

      if (options.length > 0) {
        options.forEach((opt) => {
          // Vérifie l'espace ligne par ligne aussi, au cas où un item aurait beaucoup d'options
          ensureSpace(doc, 12)
          const priceStr = Number(opt.price) > 0 ? `  +${formatCurrencyFr(opt.price!)}` : ''
          const yLine = doc.y + 1
          doc.circle(MARGIN + 12, yLine + 4, 1.4).fill(COLORS.accent)
          doc.fontSize(7.5).fillColor(COLORS.text).font('Helvetica')
            .text(`${opt.optionName} : ${opt.valueName}`, MARGIN + 18, yLine, { continued: priceStr !== '' })
          if (priceStr) {
            doc.fillColor(COLORS.success).font('Helvetica-Bold').text(priceStr)
          }
          doc.y = yLine + 10
        })
      }
      doc.y += 3
    })

    doc.y += 6

    // ── Signatures ───────────────────────────────────────────────────────
    drawSignatures(doc, 'REDSYS', data.companyName)

    // ── Pieds de page (numérotés, sur toutes les pages) ──────────────────
    drawFooters(doc)

    doc.end()
  })
}