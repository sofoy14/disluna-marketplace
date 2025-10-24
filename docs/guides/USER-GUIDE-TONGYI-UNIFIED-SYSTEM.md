# Guía de Uso del Sistema Unificado Tongyi DeepResearch

## Introducción

Esta guía proporciona instrucciones detalladas para usar el Sistema Unificado Tongyi DeepResearch en el Asistente Legal Inteligente colombiano. El sistema integra tres paradigmas de investigación (ReAct, IterResearch, Hybrid) con verificación continua y herramientas especializadas para consultas legales.

## Configuración Inicial

### Variables de Entorno Requeridas

```bash
# APIs de Búsqueda
SERPER_API_KEY=tu_serper_api_key
JINA_API_KEY=tu_jina_api_key

# Base de Datos (Supabase)
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key

# Modelo Tongyi
OPENROUTER_API_KEY=tu_openrouter_api_key
```

### Instalación de Dependencias

```bash
npm install openai @supabase/supabase-js node-fetch dotenv
```

## Uso Básico

### 1. Crear Agente Unificado

```typescript
import { createTongyiUnifiedLegalAgent } from "@/lib/agents/tongyi-unified-legal-agent"

const apiKey = process.env.OPENROUTER_API_KEY!
const unifiedAgent = createTongyiUnifiedLegalAgent(apiKey, {
  maxSearchRounds: 8,
  enableAnalysis: true,
  enableRecommendations: true,
  preferredDetailLevel: 'comprehensive',
  enableContinuousVerification: true,
  enableMemory: true,
  enableAntiHallucination: true,
  preferredSources: ['official', 'academic', 'news'],
  qualityThreshold: 0.85
})
```

### 2. Procesar Consulta Legal

```typescript
const response = await unifiedAgent.processLegalQuery(
  "¿Las cuentas en participación son valor financiero?",
  chatId,
  userId
)
```

### 3. Interpretar Respuesta

```typescript
console.log("Modo de investigación:", response.analysis.researchMode)
console.log("Calidad:", response.analysis.qualityScore)
console.log("Confianza:", response.analysis.confidence)
console.log("Verificación:", response.analysis.verificationPassed ? "APROBADA" : "FALLIDA")
console.log("Fuentes:", response.sources.length)
console.log("Recomendaciones:", response.recommendations)
console.log("Advertencias:", response.warnings)
```

## Modos de Investigación

### ReAct Mode (Consultas Simples-Moderadas)

**Características:**
- Ciclo pensamiento-acción-observación
- 3-5 rondas de búsqueda
- Evaluación rigurosa de capacidades

**Uso Recomendado:**
- Preguntas directas sobre leyes
- Consultas sobre procedimientos básicos
- Definiciones legales simples

**Ejemplo:**
```typescript
const response = await unifiedAgent.processLegalQuery(
  "¿Cuáles son los requisitos para constituir una SAS?",
  chatId,
  userId
)
// El sistema automáticamente seleccionará ReAct para esta consulta simple
```

### IterResearch Mode (Consultas Complejas)

**Características:**
- Múltiples iteraciones de investigación profunda
- 5-10 rondas con refinamiento progresivo
- Test-time scaling para máximo rendimiento

**Uso Recomendado:**
- Análisis de jurisprudencia
- Comparación de normativas
- Investigación de temas complejos

**Ejemplo:**
```typescript
const response = await unifiedAgent.processLegalQuery(
  "Analiza la evolución de la regulación de criptomonedas en Colombia desde 2018",
  chatId,
  userId
)
// El sistema automáticamente seleccionará IterResearch para esta consulta compleja
```

### Hybrid Mode (Consultas Muy Complejas)

**Características:**
- Combina ReAct e IterResearch
- 8-15 rondas con verificación continua
- Exhaustividad máxima con calidad garantizada

**Uso Recomendado:**
- Investigaciones multidisciplinarias
- Análisis comparativo internacional
- Temas emergentes o controversiales

**Ejemplo:**
```typescript
const response = await unifiedAgent.processLegalQuery(
  "Realiza un análisis exhaustivo del impacto de la IA en el derecho laboral colombiano, incluyendo desafíos regulatorios y comparación con la UE",
  chatId,
  userId
)
// El sistema automáticamente seleccionará Hybrid para esta consulta muy compleja
```

## Configuración Avanzada

### Personalización de Modo

```typescript
// Forzar un modo específico
const response = await unifiedAgent.processLegalQuery(
  query,
  chatId,
  userId,
  { mode: 'iter_research' } // Forzar IterResearch
)
```

### Configuración de Calidad

```typescript
const agent = createTongyiUnifiedLegalAgent(apiKey, {
  qualityThreshold: 0.9, // Umbral más estricto
  maxSearchRounds: 12,     // Más rondas para mayor exhaustividad
  enableContinuousVerification: true,
  preferredSources: ['official', 'academic'] // Solo fuentes de alta autoridad
})
```

### Configuración de Memoria

```typescript
const agent = createTongyiUnifiedLegalAgent(apiKey, {
  enableMemory: true,
  enableContextRetrieval: true,
  maxContextLength: 4000 // Límite de contexto conversacional
})
```

## Interpretación de Resultados

### Análisis de Calidad

```typescript
const analysis = response.analysis

// Modo de investigación utilizado
console.log("Modo:", analysis.researchMode) // 'react', 'iter_research', 'hybrid'

// Calidad general (0.0 - 1.0)
console.log("Calidad:", analysis.qualityScore) // Ej: 0.92

// Confianza del sistema (0.0 - 1.0)
console.log("Confianza:", analysis.confidence) // Ej: 0.89

// Verificación pasó
console.log("Verificación:", analysis.verificationPassed) // true/false

// Tiempo de procesamiento
console.log("Tiempo:", analysis.processingTime) // milisegundos
```

### Fuentes y Verificación

```typescript
const sources = response.sources

sources.forEach((source, index) => {
  console.log(`${index + 1}. ${source.title}`)
  console.log(`   Tipo: ${source.type}`) // 'oficial', 'académica', 'general'
  console.log(`   Autoridad: ${source.authorityScore}/10`)
  console.log(`   URL: ${source.url}`)
  console.log(`   Verificada: ${source.verified ? 'SÍ' : 'NO'}`)
})
```

### Recomendaciones y Advertencias

```typescript
// Recomendaciones profesionales
if (response.recommendations.length > 0) {
  console.log("Recomendaciones:")
  response.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`)
  })
}

// Advertencias importantes
if (response.warnings.length > 0) {
  console.log("Advertencias:")
  response.warnings.forEach((warning, index) => {
    console.log(`${index + 1}. ${warning}`)
  })
}
```

### Metadatos del Proceso

```typescript
const metadata = response.metadata

console.log("Rondas ejecutadas:", metadata.totalRounds)
console.log("Búsquedas realizadas:", metadata.totalSearches)
console.log("Fuentes encontradas:", metadata.totalSources)
console.log("Herramientas utilizadas:", metadata.toolsUsed.join(', '))
console.log("Memoria utilizada:", metadata.memoryUsed ? 'SÍ' : 'NO')
console.log("Contexto recuperado:", metadata.contextRetrieved ? 'SÍ' : 'NO')
```

## Mejores Prácticas

### 1. Formulación de Consultas

**✅ Consultas Efectivas:**
- Específicas y claras
- Incluyen contexto relevante
- Mencionan normativa específica cuando sea posible

**❌ Consultas Problemáticas:**
- Demasiado generales
- Sin contexto
- Múltiples preguntas en una sola consulta

### 2. Gestión de Memoria

**✅ Uso Correcto:**
- Mantener chatId consistente en conversaciones
- Permitir que el sistema construya contexto
- Usar userId para personalización

**❌ Uso Incorrecto:**
- Cambiar chatId en medio de conversación
- No proporcionar contexto previo
- Ignorar recomendaciones del sistema

### 3. Interpretación de Resultados

**✅ Interpretación Correcta:**
- Revisar análisis de calidad
- Verificar fuentes consultadas
- Considerar advertencias y recomendaciones

**❌ Interpretación Incorrecta:**
- Ignorar métricas de calidad
- No verificar fuentes
- Descartar advertencias del sistema

## Troubleshooting

### Problemas Comunes

#### 1. Timeout en Respuestas

**Síntomas:**
- Respuesta no llega después de 5 minutos
- Error de timeout en scripts de prueba

**Soluciones:**
```typescript
// Aumentar timeout en scripts
const response = await fetch(API_URL, {
  // ... configuración
  timeout: 600000 // 10 minutos
})

// Reducir complejidad de consulta
const simplifiedQuery = "¿Qué es una SAS en Colombia?"
```

#### 2. Fuentes Insuficientes

**Síntomas:**
- Pocas fuentes encontradas
- Calidad de respuesta baja
- Advertencias sobre fuentes

**Soluciones:**
```typescript
// Ajustar configuración de fuentes
const agent = createTongyiUnifiedLegalAgent(apiKey, {
  preferredSources: ['official', 'academic', 'news'],
  maxSearchRounds: 10 // Más rondas de búsqueda
})

// Reformular consulta para ser más específica
const specificQuery = "¿Cuáles son los requisitos legales específicos para constituir una SAS según el Código de Comercio colombiano?"
```

#### 3. Verificación Fallida

**Síntomas:**
- `verificationPassed: false`
- Advertencias sobre calidad
- Recomendaciones de revisión

**Soluciones:**
```typescript
// Revisar advertencias específicas
response.warnings.forEach(warning => {
  console.log("Advertencia:", warning)
})

// Ajustar umbral de calidad
const agent = createTongyiUnifiedLegalAgent(apiKey, {
  qualityThreshold: 0.8 // Umbral más permisivo
})
```

#### 4. Memoria No Disponible

**Síntomas:**
- `memoryUsed: false`
- Contexto no recuperado
- Respuestas sin contexto previo

**Soluciones:**
```typescript
// Verificar configuración de Supabase
console.log("Supabase URL:", process.env.SUPABASE_URL)
console.log("Supabase Key:", process.env.SUPABASE_ANON_KEY)

// Verificar chatId y userId
console.log("Chat ID:", chatId)
console.log("User ID:", userId)
```

### Logs de Debugging

#### Logs Importantes del Sistema

```bash
# Inicio de investigación
🚀 INICIANDO INVESTIGACIÓN UNIFICADA
🎯 Modo seleccionado: hybrid
🔍 Rondas ejecutadas: 12
📄 Fuentes encontradas: 15
🛡️ Verificación: ✅ APROBADA
🎯 Confianza: 0.89
⏱️ Tiempo: 45.2s
✅ INVESTIGACIÓN COMPLETADA
```

#### Logs de Error

```bash
# Error en búsqueda
❌ Error en búsqueda Serper: API key inválida
🔄 Fallback a Jina AI

# Error en verificación
⚠️ Verificación fallida: Fuentes de baja autoridad
🔄 Aplicando correcciones

# Error en memoria
❌ Error en ChatMemoryManager: Conexión a Supabase fallida
🔄 Continuando sin memoria
```

## Ejemplos de Uso

### Ejemplo 1: Consulta Simple

```typescript
const response = await unifiedAgent.processLegalQuery(
  "¿Cuáles son los requisitos para constituir una SAS en Colombia?",
  "chat-001",
  "user-001"
)

console.log("Modo:", response.analysis.researchMode) // 'react'
console.log("Calidad:", response.analysis.qualityScore) // 0.87
console.log("Fuentes:", response.sources.length) // 3
```

### Ejemplo 2: Consulta Compleja

```typescript
const response = await unifiedAgent.processLegalQuery(
  "Analiza la Sentencia C-054 de 2023 de la Corte Constitucional sobre objeción de conciencia en servicio militar",
  "chat-002",
  "user-002"
)

console.log("Modo:", response.analysis.researchMode) // 'iter_research'
console.log("Calidad:", response.analysis.qualityScore) // 0.94
console.log("Fuentes:", response.sources.length) // 8
console.log("Rondas:", response.metadata.totalRounds) // 7
```

### Ejemplo 3: Consulta Muy Compleja

```typescript
const response = await unifiedAgent.processLegalQuery(
  "Realiza una investigación exhaustiva sobre la regulación de criptomonedas en Colombia, incluyendo naturaleza jurídica, implicaciones fiscales y postura de autoridades financieras",
  "chat-003",
  "user-003"
)

console.log("Modo:", response.analysis.researchMode) // 'hybrid'
console.log("Calidad:", response.analysis.qualityScore) // 0.91
console.log("Fuentes:", response.sources.length) // 12
console.log("Rondas:", response.metadata.totalRounds) // 15
console.log("Recomendaciones:", response.recommendations.length) // 5
```

## Monitoreo y Métricas

### Métricas de Rendimiento

```typescript
// Tiempo de respuesta por modo
const performanceMetrics = {
  react: { avgTime: 45, maxTime: 90 },
  iterResearch: { avgTime: 120, maxTime: 150 },
  hybrid: { avgTime: 180, maxTime: 200 }
}

// Calidad promedio por complejidad
const qualityMetrics = {
  simple: { avgQuality: 0.87, minQuality: 0.80 },
  moderada: { avgQuality: 0.89, minQuality: 0.85 },
  compleja: { avgQuality: 0.91, minQuality: 0.88 },
  muyCompleja: { avgQuality: 0.93, minQuality: 0.90 }
}
```

### Alertas y Umbrales

```typescript
// Configurar alertas
const alerts = {
  lowQuality: response.analysis.qualityScore < 0.8,
  verificationFailed: !response.analysis.verificationPassed,
  insufficientSources: response.sources.length < 3,
  longProcessingTime: response.analysis.processingTime > 300000
}
```

## Conclusión

El Sistema Unificado Tongyi DeepResearch proporciona una solución robusta y flexible para consultas legales colombianas. Siguiendo esta guía, podrás:

- Configurar el sistema correctamente
- Utilizar los diferentes modos de investigación
- Interpretar resultados y métricas
- Resolver problemas comunes
- Monitorear el rendimiento

Para más información, consulta la documentación técnica completa y los scripts de prueba incluidos.

---

**Guía actualizada**: ${new Date().toLocaleString()}
**Versión del sistema**: 1.0.0
**Modelo**: alibaba/tongyi-deepresearch-30b-a3b

