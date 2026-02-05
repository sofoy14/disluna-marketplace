import { es } from "@/lib/i18n/es"
import type { ProcessDocument } from "@/lib/types"

export interface DocumentBadge {
  label: string
  variant?: "default" | "subtle" | "success" | "warning" | "danger" | "info"
  className?: string
}

const TYPE_RULES = [
  {
    test: /(ley|decreto|resoluci[oó]n|c[oó]digo|constituci[oó]n|norma|art[ií]culo)/i,
    badge: { label: es.documents.badges.normative, variant: "info" }
  },
  {
    test: /(contrato|factura|recibo|correo|email|whatsapp|chat|foto|imagen|video|audio|testimonio|declaraci[oó]n|peritaje|prueba|evidencia)/i,
    badge: { label: es.documents.badges.evidence, variant: "success" }
  },
  {
    test: /(demanda|escrito|alegato|solicitud|memorial|recurso|tutela)/i,
    badge: { label: es.documents.badges.generatesFacts, variant: "warning" }
  }
]

export const getDocumentBadges = (doc: ProcessDocument): DocumentBadge[] => {
  const badges: DocumentBadge[] = []
  const name = doc.file_name?.toLowerCase() || ""

  TYPE_RULES.forEach((rule) => {
    if (rule.test.test(name)) {
      badges.push(rule.badge)
    }
  })

  const isHighRelevance =
    doc.size_bytes > 1024 * 1024 || /(principal|clave|evidencia|prueba)/i.test(name)
  const isLowRelevance = doc.size_bytes > 0 && doc.size_bytes < 200 * 1024

  if (isHighRelevance) {
    badges.push({
      label: es.documents.badges.highRelevance,
      className: "border-primary/40 text-primary"
    })
  } else if (isLowRelevance) {
    badges.push({
      label: es.documents.badges.lowRelevance,
      variant: "subtle"
    })
  }

  return badges.slice(0, 4)
}
