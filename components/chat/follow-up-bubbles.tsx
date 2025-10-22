"use client"

import { FC, useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { MessageCircle, Sparkles } from "lucide-react"

// Interfaces
export interface FollowUpBubblesProps {
  lastBotQuestion: string
  jurisdiction?: string
  practiceArea?: string
  onSelect: (text: string) => void
  className?: string
}

export interface FollowUpGenerationOptions {
  jurisdiction?: string
  practiceArea?: string
}

// Tipos de práctica jurídica para contextualización
type PracticeArea = 
  | "laboral" 
  | "civil" 
  | "penal" 
  | "familia" 
  | "comercial" 
  | "administrativo" 
  | "constitucional"

// Plantillas de preguntas por área práctica
const PRACTICE_AREA_TEMPLATES: Record<PracticeArea, string[]> = {
  laboral: [
    "¿Cuál es tu cargo y antigüedad en la empresa?",
    "¿Tienes contrato escrito y qué tipo es?",
    "¿Recibiste preaviso o indemnización?",
    "¿Existen pruebas de tus condiciones laborales?",
    "¿Has presentado quejas formales previas?",
    "¿Hay testigos de los hechos laborales?"
  ],
  civil: [
    "¿Existe contrato o documento que respalde?",
    "¿Hay plazos establecidos en el acuerdo?",
    "¿Cuentas con pruebas escritas o testigos?",
    "¿Se ha enviado requerimiento formal?",
    "¿Existe garantía o respaldo financiero?",
    "¿Hay correspondencia previa sobre el tema?"
  ],
  penal: [
    "¿Hubo intervención policial o denuncia?",
    "¿Existen testigos o cámaras de seguridad?",
    "¿Se conservaron pruebas del hecho?",
    "¿Hay lesiones o daños documentados?",
    "¿Se identificó a los involucrados?",
    "¿Hay antecedentes o situaciones similares?"
  ],
  familia: [
    "¿Existen hijos menores o dependientes?",
    "¿Hay bienes en común por dividir?",
    "¿Hay acuerdo previo sobre custodia?",
    "¿Existe violencia o riesgo documentado?",
    "¿Hay capitulaciones matrimoniales?",
    "¿Cuentan con mediación previa?"
  ],
  comercial: [
    "¿Hay contrato firmado y registrado?",
    "¿Existen cláusulas de incumplimiento?",
    "¿Hay correspondencia comercial previa?",
    "¿Se han enviado requerimientos formales?",
    "¿Existen garantías o avales?",
    "¿Hay historial de transacciones similares?"
  ],
  administrativo: [
    "¿Hay acto administrativo notificado?",
    "¿Se agotaron recursos internos?",
    "¿Existen plazos legales vencidos?",
    "¿Hay pruebas del procedimiento?",
    "¿Se solicitó información oficial?",
    "¿Hay precedentes administrativos?"
  ],
  constitucional: [
    "¿Se violó derecho fundamental?",
    "¿Hay afectación directa y personal?",
    "¿Se agotaron vías ordinarias?",
    "¿Existe amenaza inminente?",
    "¿Hay pruebas de la vulneración?",
    "¿Hay jurisprudencia sobre el caso?"
  ]
}

// Plantillas genéricas para fallback
const GENERIC_TEMPLATES = [
  "¿Puedes proporcionar más detalles sobre los hechos?",
  "¿Existen documentos que respalden tu situación?",
  "¿Hay plazos importantes que considerar?",
  "¿Hay testigos o pruebas adicionales?",
  "¿Cuál es el resultado que buscas obtener?",
  "¿Has consultado previamente sobre este tema?"
]

// Función para normalizar texto
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[¿?¡!.,;:]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Función para detectar intención de la pregunta
function detectIntent(question: string): {
  isQuestioning: boolean
  isAboutTime: boolean
  isAboutPlace: boolean
  isAboutValue: boolean
  isAboutPerson: boolean
  isAboutDocument: boolean
  isAboutAction: boolean
} {
  const normalized = normalizeText(question)
  
  return {
    isQuestioning: normalized.includes('cuand') || normalized.includes('dond') || normalized.includes('com') || normalized.includes('por qu') || normalized.includes('para qu'),
    isAboutTime: normalized.includes('cuand') || normalized.includes('tiemp') || normalized.includes('fech') || normalized.includes('hor') || normalized.includes('plaz'),
    isAboutPlace: normalized.includes('dond') || normalized.includes('lugar') || normalized.includes('ciudad') || normalized.includes('ubicaci') || normalized.includes('direcci'),
    isAboutValue: normalized.includes('cuant') || normalized.includes('valor') || normalized.includes('mont') || normalized.includes('preci') || normalized.includes('deud'),
    isAboutPerson: normalized.includes('quien') || normalized.includes('persona') || normalized.includes('part') || normalized.includes('involucr') || normalized.includes('testig'),
    isAboutDocument: normalized.includes('document') || normalized.includes('contrat') || normalized.includes('escritur') || normalized.includes('prueb') || normalized.includes('escrit'),
    isAboutAction: normalized.includes('hic') || normalized.includes('realiz') || normalized.includes('ocurr') || normalized.includes('suced') || normalized.includes('pas')
  }
}

// Función principal para generar preguntas de seguimiento
export function generateSimilarFollowUps(
  lastBotQuestion: string,
  options: FollowUpGenerationOptions = {}
): string[] {
  const { jurisdiction, practiceArea } = options
  
  // Validación de entrada
  if (!lastBotQuestion || lastBotQuestion.trim().length < 5) {
    return GENERIC_TEMPLATES.slice(0, 3)
  }

  const intent = detectIntent(lastBotQuestion)
  const templates = practiceArea && PRACTICE_AREA_TEMPLATES[practiceArea as PracticeArea]
    ? PRACTICE_AREA_TEMPLATES[practiceArea as PracticeArea]
    : GENERIC_TEMPLATES

  // Estrategias de generación basadas en intención
  let candidates: string[] = []

  // 1. Paráfrasis directa
  if (intent.isQuestioning) {
    const paraphrases = [
      "¿Podrías dar más detalles sobre eso?",
      "¿Puedes especificar mejor esa información?",
      "¿Me puedes ampliar esa información?"
    ]
    candidates.push(...paraphrases)
  }

  // 2. Profundización según tipo
  if (intent.isAboutTime) {
    candidates.push(
      "¿A qué hora aproximadamente ocurrió?",
      "¿Cuánto tiempo ha pasado desde entonces?",
      "¿Hay fechas importantes relacionadas?"
    )
  }

  if (intent.isAboutPlace) {
    candidates.push(
      "¿Hay dirección específica del lugar?",
      "¿Fue en lugar público o privado?",
      "¿Hay referencias cercanas importantes?"
    )
  }

  if (intent.isAboutValue) {
    candidates.push(
      "¿Hay moneda específica de referencia?",
      "¿Incluye intereses o recargos?",
      "¿Hay forma de cálculo establecida?"
    )
  }

  if (intent.isAboutPerson) {
    candidates.push(
      "¿Hay datos de identificación relevantes?",
      "¿Qué relación tienes con esa persona?",
      "¿Hay contacto o ubicación conocida?"
    )
  }

  if (intent.isAboutDocument) {
    candidates.push(
      "¿Tienes copias o fotos del documento?",
      "¿Dónde se encuentra el original?",
      "¿Hay sellos o firmas visibles?"
    )
  }

  // 3. Contextualización por área práctica
  if (practiceArea && templates.length > 0) {
    // Tomar las más relevantes del área
    const relevantFromArea = templates.slice(0, 2)
    candidates.push(...relevantFromArea)
  }

  // 4. Ángulo complementario genérico
  const complementary = [
    "¿Hay algo más importante que deba saber?",
    "¿Qué resultado esperas conseguir?",
    "¿Hay urgencia en esta situación?"
  ]
  candidates.push(...complementary)

  // 5. Añadir templates del área si no hay suficientes
  if (candidates.length < 6 && templates.length > 0) {
    candidates.push(...templates.slice(0, 6 - candidates.length))
  }

  // Filtrado y validación final
  const filtered = candidates
    .filter(q => q.length <= 90)
    .filter(q => normalizeText(q) !== normalizeText(lastBotQuestion))
    .filter(q => !q.toLowerCase().includes('sugerencia'))
    .filter(q => !q.toLowerCase().includes('recomendación'))
    .map(q => q.charAt(0).toUpperCase() + q.slice(1).toLowerCase())

  // Eliminar duplicados semánticos
  const unique = filtered.filter((question, index) => {
    const normalized = normalizeText(question)
    return filtered.findIndex(q => normalizeText(q) === normalized) === index
  })

  // Retornar exactamente 3 preguntas
  const result = unique.slice(0, 3)
  
  // Si no hay suficientes, completar con genéricas
  if (result.length < 3) {
    const remaining = GENERIC_TEMPLATES
      .filter(q => !result.some(r => normalizeText(r) === normalizeText(q)))
      .slice(0, 3 - result.length)
    result.push(...remaining)
  }

  return result.slice(0, 3)
}

// Componente principal
export const FollowUpBubbles: FC<FollowUpBubblesProps> = ({
  lastBotQuestion,
  jurisdiction,
  practiceArea,
  onSelect,
  className
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Generar preguntas de seguimiento
  const followUpQuestions = useMemo(() => {
    return generateSimilarFollowUps(lastBotQuestion, { jurisdiction, practiceArea })
  }, [lastBotQuestion, jurisdiction, practiceArea])

  // Manejar selección de pregunta
  const handleSelect = useCallback((question: string) => {
    onSelect(question)
  }, [onSelect])

  // No renderizar si no hay preguntas
  if (followUpQuestions.length === 0) {
    return null
  }

  // Variantes de animación
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25
      }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("w-full mt-4", className)}
    >
      {/* Título opcional */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex items-center gap-2 mb-3 px-2"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
          <MessageCircle className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium text-foreground/80">
          Sigue con una de estas preguntas
        </span>
      </motion.div>

      {/* Contenedor de burbujas */}
      <motion.div
        variants={containerVariants}
        className="flex flex-wrap gap-2 px-2"
      >
        <AnimatePresence>
          {followUpQuestions.map((question, index) => (
            <motion.button
              key={`${question}-${index}`}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05,
                y: -2,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleSelect(question)}
              className={cn(
                "group relative px-4 py-2.5 rounded-full text-sm font-medium",
                "bg-muted/50 border border-border/50 hover:border-primary/30",
                "text-foreground/90 hover:text-foreground hover:bg-primary/5",
                "transition-all duration-200",
                "hover:shadow-md hover:shadow-primary/10",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1",
                "max-w-full",
                hoveredIndex === index && [
                  "bg-primary/10 border-primary/40",
                  "shadow-lg shadow-primary/15"
                ]
              )}
              aria-label={`Sugerencia: ${question}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelect(question)
                }
              }}
            >
              {/* Efecto de brillo sutil en hover */}
              <div className={cn(
                "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                "bg-gradient-to-r from-primary/5 via-transparent to-primary/5"
              )} />

              {/* Contenido */}
              <div className="relative z-10 flex items-center gap-2">
                <Sparkles className={cn(
                  "w-3.5 h-3.5 transition-colors duration-200",
                  "text-muted-foreground/60 group-hover:text-primary/60",
                  hoveredIndex === index && "text-primary/80"
                )} />
                <span className="truncate text-left leading-relaxed">
                  {question}
                </span>
              </div>

              {/* Indicador visual de hover */}
              {hoveredIndex === index && (
                <motion.div
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

export default FollowUpBubbles
