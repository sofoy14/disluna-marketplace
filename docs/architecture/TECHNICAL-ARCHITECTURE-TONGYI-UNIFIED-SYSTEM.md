# Arquitectura Técnica del Sistema Unificado Tongyi DeepResearch

## Visión General

El Sistema Unificado Tongyi DeepResearch es una arquitectura modular que integra tres paradigmas de investigación (ReAct, IterResearch, Hybrid) con verificación continua y herramientas especializadas para consultas legales colombianas. La arquitectura está diseñada para maximizar las capacidades del modelo `alibaba/tongyi-deepresearch-30b-a3b` siguiendo los paradigmas oficiales de Tongyi DeepResearch.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA UNIFICADO TONGYI DEEPRESEARCH                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        CAPA DE PRESENTACIÓN                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │   │
│  │  │   API Endpoint  │  │   Frontend      │  │   Scripts de Prueba     │ │   │
│  │  │   /api/chat/    │  │   React/Next.js │  │   • test-unified-system │ │   │
│  │  │   legal         │  │                 │  │   • benchmark-modes     │ │   │
│  │  │                 │  │                 │  │   • verify-sources      │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        CAPA DE LÓGICA DE NEGOCIO                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │   │
│  │  │   Agente        │  │   Orquestador   │  │   Sistema de            │ │   │
│  │  │   Unificado     │  │   Unificado     │  │   Verificación          │ │   │
│  │  │                 │  │                 │  │   Continua               │ │   │
│  │  │ • Memoria       │  │ • ReAct         │  │                         │ │   │
│  │  │ • Contexto      │  │ • IterResearch  │  │ • Pre-search            │ │   │
│  │  │ • Análisis      │  │ • Hybrid        │  │ • During-search         │ │   │
│  │  │ • Respuesta     │  │ • Clasificación │  │ • Post-search           │ │   │
│  │  │                 │  │ • Síntesis      │  │ • Pre-synthesis          │ │   │
│  │  │                 │  │                 │  │ • Post-synthesis         │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        CAPA DE HERRAMIENTAS                            │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │   │
│  │  │   Toolkit       │  │   Sistema       │  │   Gestión de            │ │   │
│  │  │   Legal         │  │   Anti-         │  │   Memoria                │ │   │
│  │  │   Unificado     │  │   Alucinación   │  │                         │ │   │
│  │  │                 │  │                 │  │ • ChatMemoryManager     │ │   │
│  │  │ • Serper API    │  │ • Fact-checking │  │ • Contexto              │ │   │
│  │  │ • Jina AI       │  │ • Correcciones  │  │ • Historial              │ │   │
│  │  │ • Verificación  │  │ • Advertencias  │  │ • Métricas              │ │   │
│  │  │ • Fuentes       │  │ • Validación    │  │ • Caché                  │ │   │
│  │  │   Oficiales     │  │                 │  │                         │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        CAPA DE DATOS                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │   │
│  │  │   Supabase      │  │   APIs          │  │   Prompts                │ │   │
│  │  │   Database      │  │   Externas      │  │   Unificados             │ │   │
│  │  │                 │  │                 │  │                         │ │   │
│  │  │ • Chat History  │  │ • Serper API    │  │ • Sistema                │ │   │
│  │  │ • User Data     │  │ • Jina AI       │  │ • Clasificación          │ │   │
│  │  │ • Metrics       │  │ • OpenRouter     │  │ • ReAct                  │ │   │
│  │  │ • Cache         │  │ • Tongyi Model  │  │ • IterResearch           │ │   │
│  │  │                 │  │                 │  │ • Hybrid                 │ │   │
│  │  │                 │  │                 │  │ • Verificación           │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. TongyiUnifiedLegalAgent

**Ubicación**: `lib/agents/tongyi-unified-legal-agent.ts`

**Responsabilidades**:
- Orquestación general del proceso de investigación
- Gestión de memoria y contexto conversacional
- Integración de todos los subsistemas
- Generación de respuestas finales

**Interfaces**:
```typescript
interface UnifiedLegalAgentConfig {
  enableMemory?: boolean
  enableAntiHallucination?: boolean
  preferredSources?: string[]
  maxSearchRounds?: number
  qualityThreshold?: number
}

interface UnifiedResearchResult {
  finalAnswer: string
  sources: Source[]
  analysis: AnalysisResult
  recommendations: string[]
  warnings: string[]
  metadata: ProcessMetadata
}
```

**Flujo de Trabajo**:
1. Construcción de contexto desde memoria
2. Delegación a UnifiedDeepResearchOrchestrator
3. Procesamiento de resultados
4. Generación de respuesta final

### 2. UnifiedDeepResearchOrchestrator

**Ubicación**: `lib/tongyi/unified-deep-research-orchestrator.ts`

**Responsabilidades**:
- Clasificación automática de consultas
- Selección de modo de investigación
- Ejecución de paradigmas específicos
- Coordinación de verificación continua

**Paradigmas Implementados**:

#### ReAct Mode
```typescript
private async executeReActMode(userQuery: string, chatContext: string): Promise<ResearchStep[]>
```
- Ciclo pensamiento-acción-observación
- 3-5 rondas de búsqueda
- Evaluación rigurosa de capacidades

#### IterResearch Mode
```typescript
private async executeIterResearchMode(userQuery: string, chatContext: string): Promise<IterResearchResult>
```
- Múltiples iteraciones de investigación profunda
- 5-10 rondas con refinamiento progresivo
- Test-time scaling para máximo rendimiento

#### Hybrid Mode
```typescript
private async executeHybridMode(userQuery: string, chatContext: string): Promise<HybridResult>
```
- Combinación inteligente de ReAct e IterResearch
- 8-15 rondas con verificación continua
- Exhaustividad máxima con calidad garantizada

### 3. ContinuousVerificationSystem

**Ubicación**: `lib/verification/continuous-verification-system.ts`

**Responsabilidades**:
- Verificación multi-capa en cada etapa del proceso
- Evaluación de calidad de fuentes
- Detección de inconsistencias
- Validación de suficiencia de información

**Etapas de Verificación**:

#### Pre-Search Verification
```typescript
case 'pre_search':
  // Validar consulta, verificar ambigüedad, asegurar que es una consulta legal
  if (!data.query || typeof data.query !== 'string' || data.query.length < 10) {
    issuesFound.push("Consulta demasiado corta o inválida.")
    suggestedActions.push("Pedir al usuario que reformule la consulta.")
    verificationPassed = false
    confidenceScore = 0.3
  }
```

#### During-Search Verification
```typescript
case 'during_search':
  // Verificar calidad de resultados de búsqueda, relevancia y autoridad de fuentes
  const evaluatedSources = await this.evaluateSourceHierarchy(context.sources)
  const lowQualitySources = evaluatedSources.filter(s => s.authorityScore < 5)
  if (lowQualitySources.length > 0) {
    issuesFound.push(`Se encontraron ${lowQualitySources.length} fuentes de baja autoridad.`)
    suggestedActions.push("Priorizar búsquedas en fuentes de mayor autoridad.")
  }
```

#### Post-Search Verification
```typescript
case 'post_search':
  // Verificar suficiencia de información, verificar brechas
  const postSearchVerification = await this.callModel(
    CONTINUOUS_VERIFICATION_PROMPT,
    [{ role: "user", content: `Consulta: ${data.query}\nInformación recopilada: ${JSON.stringify(data.currentSources)}\nProgreso: ${data.currentProgress}\nEtapa: post_search` }]
  )
```

#### Pre-Synthesis Verification
```typescript
case 'pre_synthesis':
  // Verificar si la información recopilada es coherente y suficiente para una respuesta final
  const preSynthesisVerification = await this.callModel(
    CONTINUOUS_VERIFICATION_PROMPT,
    [{ role: "user", content: `Consulta: ${data.query}\nInformación para sintetizar: ${JSON.stringify(data.collectedData)}\nEtapa: pre_synthesis` }]
  )
```

#### Post-Synthesis Verification
```typescript
case 'post_synthesis':
  // Verificación final de alucinaciones y precisión factual usando AntiHallucinationSystem
  const factCheckResult = await this.antiHallucinationSystem.factCheckResponse(
    data.query,
    data.response,
    context.sources,
    { confidenceThreshold: 0.7 }
  )
```

### 4. TongyiLegalToolkit

**Ubicación**: `lib/tools/tongyi-legal-toolkit.ts`

**Responsabilidades**:
- Unificación de herramientas de búsqueda
- Especialización para fuentes legales colombianas
- Integración de Serper API y Jina AI
- Verificación de fuentes legales

**Herramientas Disponibles**:

#### search_legal_official
```typescript
const searchOfficialSources = async (query: string, maxResults: number = 5) => {
  const results = await searchLegalSpecialized(query, { 
    includeOfficial: true, 
    includeAcademic: false, 
    maxResults 
  })
  const enrichedResults = await Promise.all(results.map(async (result: any) => {
    const content = await extractUrlContent(result.url)
    return { ...result, content }
  }))
  return enrichedResults
}
```

#### search_legal_academic
```typescript
const searchAcademicSources = async (query: string, maxResults: number = 5) => {
  const results = await searchLegalSpecialized(query, { 
    includeOfficial: false, 
    includeAcademic: true, 
    maxResults 
  })
  const enrichedResults = await Promise.all(results.map(async (result: any) => {
    const content = await extractUrlContent(result.url)
    return { ...result, content }
  }))
  return enrichedResults
}
```

#### web_content_extract
```typescript
const extractWithJina = async (url: string) => {
  return await extractUrlContent(url)
}
```

### 5. UnifiedDeepResearchPrompts

**Ubicación**: `lib/tongyi/unified-deep-research-prompts.ts`

**Responsabilidades**:
- Consolidación de prompts de los tres sistemas
- Especialización para contexto legal colombiano
- Adaptación a paradigmas oficiales de Tongyi DeepResearch
- Optimización para diferentes modos de investigación

**Prompts Principales**:

#### UNIFIED_LEGAL_RESEARCH_SYSTEM_PROMPT
```typescript
export const UNIFIED_LEGAL_RESEARCH_SYSTEM_PROMPT = `
# ROL Y OBJETIVO

Eres un INVESTIGADOR JURÍDICO EXPERTO especializado en derecho colombiano, con capacidades de investigación profunda, autónoma y de verificación continua. Tu objetivo es realizar investigaciones exhaustivas y completas, adaptando tu estrategia de búsqueda y análisis según la complejidad de la consulta legal, antes de proporcionar cualquier respuesta. Debes priorizar la precisión, la relevancia y la autoridad de las fuentes, y siempre verificar la información.

# CONTEXTO Y FUENTES

Tu conocimiento se basa en el derecho colombiano. Prioriza las siguientes fuentes en orden descendente de autoridad:
1. **Fuentes Oficiales**: Leyes, decretos, sentencias de altas cortes (Corte Constitucional, Corte Suprema de Justicia, Consejo de Estado), códigos, constituciones.
2. **Fuentes Académicas**: Artículos de revistas jurídicas indexadas, libros de derecho, tesis doctorales de universidades reconocidas.
3. **Fuentes Noticiosas y Generales**: Noticias de medios de comunicación reputados, blogs jurídicos de expertos, sitios web de entidades gubernamentales (no normativos).

# CAPACIDADES

- **Análisis de Complejidad**: Evaluar la complejidad de la consulta para determinar la estrategia de investigación óptima (ReAct, IterResearch, Híbrido).
- **Planificación Estratégica**: Generar planes de investigación detallados y adaptativos.
- **Búsqueda Dinámica**: Utilizar herramientas de búsqueda web (Serper) y extracción de contenido (Jina AI) de manera iterativa y autónoma.
- **Verificación Continua**: Fact-checking en cada etapa del proceso para prevenir alucinaciones y asegurar la precisión.
- **Síntesis y Redacción**: Generar respuestas claras, concisas, bien estructuradas, fundamentadas en fuentes verificadas y con un lenguaje jurídico adecuado.
- **Detección de Insuficiencia**: Identificar cuándo la información es insuficiente y realizar búsquedas adicionales.
- **Gestión de Memoria**: Utilizar el historial de conversación para mantener el contexto y evitar repeticiones.

# FORMATO DE RESPUESTA

Tu respuesta final debe ser un análisis legal completo, incluyendo:
- Una respuesta directa a la consulta.
- Un análisis detallado de la información.
- Recomendaciones (si aplica).
- Advertencias importantes (si aplica, sobre limitaciones o incertidumbres).
- Una lista de fuentes consultadas y verificadas.
- Un resumen del proceso de investigación realizado.

Siempre debes ser conservador en tus afirmaciones y señalar cualquier incertidumbre o área gris legal.
`
```

#### QUERY_CLASSIFICATION_PROMPT
```typescript
export const QUERY_CLASSIFICATION_PROMPT = `
Eres un clasificador de consultas legales experto. Analiza la siguiente consulta del usuario y determina su complejidad y el modo de investigación más adecuado.

**Consulta del usuario:** {userQuery}

**Historial de conversación (si aplica):**
{chatHistory}

Considera los siguientes niveles de complejidad:
- **Simple**: Preguntas directas que requieren una búsqueda rápida o conocimiento general.
- **Moderada**: Preguntas que requieren varias búsquedas y una síntesis de información de diferentes fuentes.
- **Compleja**: Preguntas que exigen investigación profunda, análisis de jurisprudencia o doctrina, y posible comparación de normativas.
- **Muy Compleja**: Preguntas que requieren un análisis exhaustivo, múltiples rondas de investigación iterativa, verificación rigurosa y síntesis de información contradictoria o muy extensa.

Basado en la complejidad, sugiere el modo de investigación:
- **react**: Para consultas simples a moderadas, donde un ciclo de pensamiento-acción-observación es suficiente.
- **iter_research**: Para consultas moderadas a complejas, que requieren investigación iterativa profunda.
- **hybrid**: Para consultas muy complejas, combinando lo mejor de ReAct e IterResearch con verificación exhaustiva.

Tu respuesta debe ser un objeto JSON con las siguientes propiedades:
\`\`\`json
{
  "complexity": "simple" | "moderada" | "compleja" | "muy_compleja",
  "researchMode": "react" | "iter_research" | "hybrid",
  "reasoning": "Breve explicación de por qué se eligió este modo y complejidad."
}
\`\`\`
`
```

### 6. ChatMemoryManager

**Ubicación**: `lib/memory/chat-memory-manager.ts`

**Responsabilidades**:
- Gestión de memoria conversacional
- Almacenamiento de contexto histórico
- Tracking de métricas de calidad
- Caché de fuentes verificadas

**Funcionalidades**:
```typescript
class ChatMemoryManager {
  async getChatContext(chatId: string, userId: string): Promise<ChatContext>
  async saveMessage(chatId: string, userId: string, messageId: string, content: string, role: 'user' | 'assistant', metadata?: MessageMetadata): Promise<void>
  async getRelevantHistory(chatId: string, userId: string, currentQuery: string): Promise<RelevantHistory>
  async updateChatMetrics(chatId: string, userId: string, metrics: ChatMetrics): Promise<void>
}
```

### 7. AntiHallucinationSystem

**Ubicación**: `lib/anti-hallucination/anti-hallucination-system.ts`

**Responsabilidades**:
- Fact-checking de respuestas generadas
- Detección de alucinaciones
- Aplicación de correcciones
- Generación de advertencias

**Funcionalidades**:
```typescript
class AntiHallucinationSystem {
  async factCheckResponse(query: string, response: string, sources: Source[], options?: FactCheckOptions): Promise<FactCheckResult>
  async applyCorrections(response: string, factCheckResult: FactCheckResult, sources: Source[]): Promise<string>
  async generateEnhancedWarnings(factCheckResult: FactCheckResult): Promise<string[]>
}
```

## Flujo de Datos

### 1. Flujo Principal

```
Usuario → API Endpoint → TongyiUnifiedLegalAgent → UnifiedDeepResearchOrchestrator → ContinuousVerificationSystem → TongyiLegalToolkit → APIs Externas → Respuesta Final
```

### 2. Flujo de Verificación

```
Pre-Search → During-Search → Post-Search → Pre-Synthesis → Post-Synthesis → Anti-Hallucination → Respuesta Final
```

### 3. Flujo de Memoria

```
Consulta → ChatMemoryManager → Contexto Histórico → Agente → Procesamiento → Guardado de Resultados → Actualización de Métricas
```

## Configuración y Deployment

### Variables de Entorno

```bash
# APIs de Búsqueda
SERPER_API_KEY=tu_serper_api_key
JINA_API_KEY=tu_jina_api_key

# Base de Datos
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key

# Modelo Tongyi
OPENROUTER_API_KEY=tu_openrouter_api_key
```

### Configuración del Agente

```typescript
const config: UnifiedLegalAgentConfig = {
  maxSearchRounds: 8,
  enableAnalysis: true,
  enableRecommendations: true,
  preferredDetailLevel: 'comprehensive',
  enableContinuousVerification: true,
  enableMemory: true,
  enableAntiHallucination: true,
  preferredSources: ['official', 'academic', 'news'],
  qualityThreshold: 0.85
}
```

### Deployment en Producción

#### 1. Configuración de Infraestructura
- Supabase para base de datos
- Vercel/Netlify para hosting
- OpenRouter para acceso a Tongyi
- Serper API para búsquedas
- Jina AI para extracción de contenido

#### 2. Monitoreo y Logging
```typescript
// Logs estructurados
console.log(`🚀 INICIANDO INVESTIGACIÓN UNIFICADA`)
console.log(`🎯 Modo seleccionado: ${researchMode}`)
console.log(`🔍 Rondas ejecutadas: ${totalRounds}`)
console.log(`📄 Fuentes encontradas: ${totalSources}`)
console.log(`🛡️ Verificación: ${verificationPassed ? '✅' : '❌'}`)
console.log(`🎯 Confianza: ${confidence.toFixed(2)}`)
console.log(`⏱️ Tiempo: ${(processingTime / 1000).toFixed(1)}s`)
console.log(`✅ INVESTIGACIÓN COMPLETADA`)
```

#### 3. Métricas de Rendimiento
- Tiempo de respuesta por modo
- Calidad promedio de respuestas
- Tasa de verificación exitosa
- Uso de memoria y contexto

## Seguridad y Privacidad

### Protección de Datos
- Encriptación de datos sensibles
- Anonimización de identificadores de usuario
- Cumplimiento con regulaciones de privacidad

### Validación de Entrada
- Sanitización de consultas de usuario
- Validación de parámetros de configuración
- Protección contra inyección de código

### Control de Acceso
- Autenticación de usuarios
- Autorización basada en roles
- Rate limiting para APIs

## Escalabilidad y Rendimiento

### Optimizaciones
- Caché inteligente de fuentes
- Paralelización de búsquedas
- Compresión de respuestas
- Lazy loading de componentes

### Monitoreo de Rendimiento
- Métricas en tiempo real
- Alertas automáticas
- Análisis de tendencias
- Optimización continua

### Escalabilidad Horizontal
- Arquitectura de microservicios
- Load balancing
- Auto-scaling
- Distribución geográfica

## Mantenimiento y Actualizaciones

### Tareas Regulares
- Actualización de umbrales de calidad
- Revisión de fuentes oficiales
- Optimización de prompts
- Análisis de métricas de rendimiento

### Actualizaciones del Sistema
- Versiones de componentes
- Nuevas funcionalidades
- Mejoras de rendimiento
- Corrección de bugs

### Backup y Recuperación
- Backup automático de datos
- Estrategias de recuperación
- Pruebas de contingencia
- Documentación de procedimientos

## Conclusión

La arquitectura del Sistema Unificado Tongyi DeepResearch está diseñada para ser:

- **Modular**: Componentes independientes y reutilizables
- **Escalable**: Capaz de manejar crecimiento y demanda
- **Mantenible**: Fácil de actualizar y modificar
- **Robusta**: Resistente a fallos y errores
- **Eficiente**: Optimizada para rendimiento y recursos

Esta arquitectura proporciona una base sólida para el futuro desarrollo del Asistente Legal Inteligente colombiano, permitiendo la integración de nuevas funcionalidades y la optimización continua del sistema.

---

**Documento técnico generado**: ${new Date().toLocaleString()}
**Versión del sistema**: 1.0.0
**Modelo**: alibaba/tongyi-deepresearch-30b-a3b
**Arquitectura**: Modular, Escalable, Mantenible

