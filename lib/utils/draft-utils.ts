/**
 * Utilidades para manejo de drafts legales: descarga, copia, email, placeholders, validación.
 */

import { LegalDraft, draftSchema } from "@/types/draft"

const MAILTO_MAX_LENGTH = 1500 // Límite aproximado para URLs mailto

/**
 * Descarga un archivo con el contenido especificado.
 * @param content Contenido del archivo
 * @param filename Nombre base del archivo (sin extensión)
 * @param extension Extensión del archivo ('md' o 'txt')
 */
export function downloadFile(content: string, filename: string, extension: 'md' | 'txt'): void {
    const mimeType = extension === 'md'
        ? 'text/markdown;charset=utf-8'
        : 'text/plain;charset=utf-8'

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * Copia texto al portapapeles.
 * @param text Texto a copiar
 * @returns Promise que resuelve a true si fue exitoso, false en caso contrario
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        } else {
            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea')
            textArea.value = text
            textArea.style.position = 'fixed'
            textArea.style.left = '-999999px'
            textArea.style.top = '-999999px'
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            const success = document.execCommand('copy')
            document.body.removeChild(textArea)
            return success
        }
    } catch (error) {
        console.error('Error copiando al portapapeles:', error)
        return false
    }
}

/**
 * Construye una URL mailto con los parámetros especificados.
 * @param subject Asunto del email
 * @param body Cuerpo del email
 * @param to Destinatario (opcional)
 * @param cc Copia (opcional)
 * @returns URL mailto o null si excede el límite de longitud
 */
export function buildMailto(
    subject: string,
    body: string,
    to?: string,
    cc?: string
): string | null {
    const params = new URLSearchParams()

    if (subject) {
        params.append('subject', subject)
    }

    if (body) {
        params.append('body', body)
    }

    if (cc) {
        params.append('cc', cc)
    }

    const queryString = params.toString()
    const mailtoUrl = `mailto:${to || ''}${queryString ? '?' + queryString : ''}`

    // Verificar longitud (aproximada, ya que la codificación puede variar)
    if (mailtoUrl.length > MAILTO_MAX_LENGTH) {
        return null
    }

    return mailtoUrl
}

/**
 * Reemplaza placeholders en el contenido usando el formato {{KEY}}.
 * @param content Contenido con placeholders
 * @param placeholders Objeto con key-value para reemplazar
 * @returns Contenido con placeholders reemplazados
 */
export function replacePlaceholders(
    content: string,
    placeholders: Record<string, string>
): string {
    let result = content

    for (const [key, value] of Object.entries(placeholders)) {
        // Reemplazar {{KEY}} y {{ KEY }} (con espacios opcionales)
        const regex = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g')
        result = result.replace(regex, value)
    }

    return result
}

/**
 * Valida si el contenido es un draft legal válido.
 * @param content Contenido a validar (puede ser JSON string o objeto)
 * @returns Objeto con valid, draft (si es válido) y error (si hay error)
 */
export function validateDraftContent(
    content: string | object
): { valid: boolean; draft?: LegalDraft; error?: string } {
    try {
        // Si es string, intentar parsear JSON
        let parsed: unknown
        if (typeof content === 'string') {
            // Intentar extraer JSON si está envuelto en markdown code fences
            const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/
            const match = content.match(jsonBlockRegex)
            if (match) {
                parsed = JSON.parse(match[1])
            } else if (content.trim().startsWith('{')) {
                parsed = JSON.parse(content)
            } else {
                return { valid: false, error: 'El contenido no es un JSON válido' }
            }
        } else {
            parsed = content
        }

        // Validar con Zod
        const draft = draftSchema.parse(parsed)

        return { valid: true, draft }
    } catch (error) {
        if (error instanceof Error) {
            return { valid: false, error: error.message }
        }
        return { valid: false, error: 'Error desconocido al validar el draft' }
    }
}

/**
 * Extrae placeholders del contenido usando el formato {{KEY}}.
 * @param content Contenido a analizar
 * @returns Array de keys de placeholders encontrados
 */
export function extractPlaceholderKeys(content: string): string[] {
    const regex = /\{\{\s*([A-Z_][A-Z0-9_]*)\s*\}\}/g
    const matches = content.matchAll(regex)
    const keys = new Set<string>()

    for (const match of matches) {
        if (match[1]) {
            keys.add(match[1])
        }
    }

    return Array.from(keys)
}

/**
 * Verifica si el contenido de un email excede el límite para mailto.
 * @param subject Asunto
 * @param body Cuerpo
 * @param to Destinatario
 * @param cc Copia
 * @returns true si excede el límite
 */
export function exceedsMailtoLimit(
    subject: string,
    body: string,
    to?: string,
    cc?: string
): boolean {
    const mailto = buildMailto(subject, body, to, cc)
    return mailto === null
}

/**
 * Abre la ventana de composición de Gmail.
 */
export function openGmail(subject: string, body: string, to: string = "") {
    const params = new URLSearchParams()
    params.append('view', 'cm')
    params.append('fs', '1')
    if (to) params.append('to', to)
    if (subject) params.append('su', subject)
    if (body) params.append('body', body)

    window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank')
}

/**
 * Abre la ventana de composición de Outlook.
 */
export function openOutlook(subject: string, body: string, to: string = "") {
    const params = new URLSearchParams()
    if (to) params.append('to', to)
    if (subject) params.append('subject', subject)
    if (body) params.append('body', body)

    window.open(`https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`, '_blank')
}

/**
 * Genera y descarga un PDF del contenido.
 */
export async function downloadAsPDF(content: string, title: string) {
    try {
        // Importación dinámica para evitar problemas en SSR
        const { jsPDF } = await import('jspdf')

        const doc = new jsPDF()

        // Configuración básica
        doc.setFontSize(16)
        doc.text(title, 20, 20)

        doc.setFontSize(12)
        const splitText = doc.splitTextToSize(content, 170)

        // Manejo básico de paginación
        let y = 40
        for (let i = 0; i < splitText.length; i++) {
            if (y > 280) {
                doc.addPage()
                y = 20
            }
            doc.text(splitText[i], 20, y)
            y += 7
        }

        doc.save(`${title}.pdf`)
        return true
    } catch (error) {
        console.error('Error generando PDF:', error)
        return false
    }
}

/**
 * Genera y descarga un archivo Word (.docx).
 */
export async function downloadAsWord(content: string, title: string) {
    try {
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')
        const { saveAs } = await import('file-saver')

        // Separar párrafos
        const paragraphs = content.split('\n').map(line => {
            // Detectar títulos markdown simples
            if (line.startsWith('# ')) {
                return new Paragraph({
                    text: line.replace('# ', ''),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 200, before: 200 }
                })
            }
            if (line.startsWith('## ')) {
                return new Paragraph({
                    text: line.replace('## ', ''),
                    heading: HeadingLevel.HEADING_2,
                    spacing: { after: 150, before: 150 }
                })
            }

            return new Paragraph({
                children: [new TextRun(line)],
                spacing: { after: 120 }
            })
        })

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: title,
                        heading: HeadingLevel.TITLE,
                        spacing: { after: 400 }
                    }),
                    ...paragraphs
                ],
            }],
        })

        const blob = await Packer.toBlob(doc)
        saveAs(blob, `${title}.docx`)
        return true
    } catch (error) {
        console.error('Error generando DOCX:', error)
        return false
    }
}





