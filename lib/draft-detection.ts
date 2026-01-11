/**
 * Detecta si la intención del usuario es generar un documento legal (borrador).
 * Usa heurística local rápida para detección inicial.
 */
export function detectDraftIntent(message: string): { isDraft: boolean; confidence: number; type?: string } {
    const normalizedMessage = message.toLowerCase()

    // Palabras clave fuertes (alta probabilidad)
    const draftKeywords = [
        "minuta", "contrato", "tutela", "derecho de petición", "memorial",
        "comunicado", "carta", "oficio", "recurso", "apelación",
        "contestación", "demanda", "denuncia", "poder", "acta",
        "cláusulas", "formato", "plantilla", "borrador",
        "redacta", "redacción", "escribe un", "generar un", "crear un",
        "necesito un", "quiero un", "hazme un", "prepárame un",
        "elabora", "prepara", "diseña", "estructura",
        "accion de tutela", "acción de tutela", "derecho de peticion",
        "escrito", "documento legal", "documento jurídico",
        // Nuevos tipos
        "incapacidad", "excusa", "permiso", "solicitud", "certificación",
        "constancia", "autorización", "renuncia", "retiro", "queja", "reclamo"
    ]

    // Tipos de documentos mapeables
    const docTypes: Record<string, string> = {
        "contrato": "contrato",
        "acuerdo": "contrato",
        "convenio": "contrato",
        "minuta": "minuta",
        "tutela": "tutela",
        "accion de tutela": "tutela",
        "acción de tutela": "tutela",
        "petición": "derecho_de_peticion",
        "derecho de petición": "derecho_de_peticion",
        "derecho de peticion": "derecho_de_peticion",
        "memorial": "memorial",
        "comunicado": "comunicado",
        "correo": "correo",
        "email": "correo",
        "e-mail": "correo",
        "carta": "comunicado",
        "oficio": "comunicado",
        "incapacidad": "incapacidad",
        "excusa": "excusa",
        "renuncia": "renuncia",
        "queja": "reclamo",
        "reclamo": "reclamo"
    }

    // Verbos de acción explícita (intención de crear o editar)
    const draftingVerbs = [
        "redacta", "escribe", "genera", "crea", "prepara", "hazme", "elabora",
        "necesito un", "quiero un", "diseña", "estructura", "borrador de",
        "modifica", "corrige", "ajusta", "cambia", "actualiza", "mejora", "reformula"
    ]

    // 1. Detección por palabras clave (requiere verbo + tipo)
    const hasVerb = draftingVerbs.some(verb => normalizedMessage.includes(verb))

    // Verificar si contiene algún tipo de documento
    let hasDocType = false
    let inferredType = "otro"

    for (const [key, value] of Object.entries(docTypes)) {
        if (normalizedMessage.includes(key)) {
            hasDocType = true
            inferredType = value
            break
        }
    }

    // Regla estricta: Debe tener verbo de acción Y tipo de documento
    // O ser una frase muy específica como "minuta de contrato"
    const isExplicitDraftRequest = hasVerb && hasDocType

    // Excepciones para frases muy fuertes sin verbo explícito
    const strongPhrases = ["minuta de", "modelo de", "formato de", "plantilla de"]
    const hasStrongPhrase = strongPhrases.some(phrase => normalizedMessage.includes(phrase))

    const isDraft = isExplicitDraftRequest || (hasStrongPhrase && hasDocType)

    // 3. Calcular confianza
    let confidence = 0.1
    if (isDraft) {
        confidence = 0.8
        // Aumentar si es muy explícito
        if (hasVerb && hasDocType) confidence = 0.9
    }

    return { isDraft, confidence, type: inferredType }
}
