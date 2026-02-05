import { es } from "@/lib/i18n/es"
import type { ProcessInsights } from "@/lib/types"

export const buildChatSuggestions = (insights?: Partial<ProcessInsights>) => {
  const contradictionsCount =
    typeof insights?.contradictions === "number" ? insights.contradictions : null
  const normsCount = typeof insights?.norms === "number" ? insights.norms : null
  const factsCount = typeof insights?.facts === "number" ? insights.facts : null

  // Generar sugerencias contextuales basadas en los insights disponibles
  const suggestions: string[] = []

  // Prioridad 1: Si hay hechos detectados, sugerir análisis de hechos
  if (factsCount && factsCount > 0) {
    suggestions.push(`Analiza los ${factsCount} hechos identificados en el proceso`)
  } else {
    suggestions.push("Resume los hechos principales del proceso")
  }

  // Prioridad 2: Si hay contradicciones, sugerir revisarlas
  if (contradictionsCount && contradictionsCount > 0) {
    suggestions.push(`Revisa las ${contradictionsCount} contradicciones detectadas`)
  } else if (normsCount && normsCount > 0) {
    suggestions.push(`Explora las ${normsCount} normas aplicables`)
  } else {
    suggestions.push("¿Qué riesgos tiene este proceso?")
  }

  // Máximo 2 sugerencias
  return suggestions.slice(0, 2)
}
