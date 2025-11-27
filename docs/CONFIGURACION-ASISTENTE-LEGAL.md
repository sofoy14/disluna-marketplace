# Configuración del Asistente Legal Inteligente

## Variables de Entorno Requeridas

Asegúrate de tener estas variables en tu archivo `.env` o `.env.local`:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# API KEYS OBLIGATORIAS
# ═══════════════════════════════════════════════════════════════════════════════

# OpenRouter API Key - Para acceder a modelos LLM
# Obtener en: https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Serper API Key - Para búsqueda web (Google Search API)
# Obtener en: https://serper.dev/ (tiene plan gratuito)
SERPER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ═══════════════════════════════════════════════════════════════════════════════
# OPCIONALES (ya configurados por defecto en el código)
# ═══════════════════════════════════════════════════════════════════════════════

# Google Custom Search Engine (alternativa a Serper)
# GOOGLE_CSE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# GOOGLE_CSE_CX=xxxxxxxxxxxxx

# Firecrawl API Key (para extracción avanzada de contenido web)
# FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Modelos Recomendados para Tool Calling

El sistema de tool calling funciona mejor con estos modelos de OpenRouter:

### Recomendados (soportan tool calling nativo)

| Modelo | ID en OpenRouter | Costo | Notas |
|--------|-----------------|-------|-------|
| GPT-4o Mini | `openai/gpt-4o-mini` | ~$0.15/1M tokens | Mejor relación costo/calidad |
| Claude 3 Haiku | `anthropic/claude-3-haiku` | ~$0.25/1M tokens | Rápido y económico |
| GPT-4o | `openai/gpt-4o` | ~$5/1M tokens | Mayor calidad |
| Claude 3.5 Sonnet | `anthropic/claude-3-5-sonnet` | ~$3/1M tokens | Excelente para legal |
| Llama 3.1 70B | `meta-llama/llama-3.1-70b-instruct` | ~$0.9/1M tokens | Open source |

### Modelos con Búsqueda Iterativa (sin tool calling nativo)

| Modelo | ID en OpenRouter | Costo | Endpoint |
|--------|-----------------|-------|----------|
| Tongyi DeepResearch | `alibaba/tongyi-deepresearch-30b-a3b` | Económico | `/api/chat/tongyi-iterative` |

Estos modelos usan un sistema de **búsqueda iterativa** donde el backend simula el tool calling.

## Endpoints Disponibles

### 1. `/api/chat/legal-agent` (RECOMENDADO)

Endpoint principal con tool calling completo.

```typescript
// Ejemplo de uso
const response = await fetch('/api/chat/legal-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatSettings: {
      model: 'openai/gpt-4o-mini', // Modelo que soporte tools
      temperature: 0.3
    },
    messages: [
      { role: 'user', content: '¿Cuáles son los requisitos para la prescripción adquisitiva en Colombia?' }
    ],
    chatId: 'optional-chat-id',
    userId: 'optional-user-id'
  })
})
```

**Características:**
- ✅ Tool calling real con ciclo completo
- ✅ Búsqueda en fuentes oficiales colombianas
- ✅ Extracción de contenido de URLs
- ✅ Múltiples iteraciones de búsqueda
- ✅ Streaming de respuesta

### 2. `/api/chat/tools-agent` (Alternativa)

Similar al anterior pero con implementación más simple.

### 3. `/api/chat/tongyi-iterative` (Para Tongyi/DeepResearch)

**Endpoint especializado para modelos que NO soportan tool calling nativo.**

Este endpoint implementa **búsqueda iterativa** donde:
1. El modelo genera queries de búsqueda
2. El backend ejecuta las búsquedas con Serper
3. El modelo evalúa si necesita más información
4. Repite hasta tener información suficiente (máx 5 rondas)
5. Sintetiza una respuesta final con todas las fuentes

```typescript
// El frontend detecta automáticamente si es Tongyi y usa este endpoint
const response = await fetch('/api/chat/tongyi-iterative', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatSettings: {
      model: 'alibaba/tongyi-deepresearch-30b-a3b',
      temperature: 0.3
    },
    messages: [
      { role: 'user', content: '¿Qué dice el artículo 1 de la Constitución colombiana?' }
    ]
  })
})
```

**Características:**
- ✅ Búsqueda iterativa hasta 5 rondas
- ✅ El modelo decide cuándo necesita más información
- ✅ Prioriza fuentes oficiales (.gov.co)
- ✅ Síntesis final con citación de fuentes
- ✅ Streaming de respuesta

**Flujo de Búsqueda Iterativa:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BÚSQUEDA ITERATIVA PARA TONGYI                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RONDA 1:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Usuario pregunta                                                 │   │
│  │ 2. Modelo genera query de búsqueda                                  │   │
│  │ 3. Backend busca con Serper API                                     │   │
│  │ 4. Modelo evalúa: ¿Tengo suficiente información?                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▼ (si NO es suficiente)                        │
│  RONDA 2-5: Repite con nueva query más específica                          │
│                              ▼ (cuando ES suficiente)                       │
│  SÍNTESIS: Modelo genera respuesta final con todas las fuentes            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Logs de ejemplo:**

```
═══════════════════════════════════════════════════════════════════════════
🔄 TONGYI ITERATIVE RESEARCH - BÚSQUEDA ITERATIVA
═══════════════════════════════════════════════════════════════════════════
📝 Pregunta: "¿Requisitos para la prescripción adquisitiva?"

📍 RONDA 1/5
🧠 Generando query de búsqueda...
🔍 Query: "prescripción adquisitiva requisitos código civil Colombia"
✅ Resultados: 8 (3 oficiales)
🧠 Evaluando resultados...
🔄 Necesita más info: plazos específicos

📍 RONDA 2/5
🔍 Query: "prescripción adquisitiva plazos años posesión Colombia"
✅ Resultados: 6 (4 oficiales)
✅ Información SUFICIENTE - finalizando búsqueda

📊 INVESTIGACIÓN COMPLETADA
   🔍 Rondas: 2
   📚 Fuentes totales: 14
   🏛️ Fuentes oficiales: 7

🧠 Sintetizando respuesta final...
```

### 4. `/api/chat/openrouter` (Legacy)

Endpoint anterior que usa búsqueda pre-emptiva simple.

## Herramientas (Tools) Disponibles

El agente legal tiene acceso a las siguientes herramientas:

### `search_legal_official`

Busca en fuentes oficiales colombianas:
- Corte Constitucional
- Consejo de Estado
- SUIN-Juriscol
- Secretaría del Senado
- Ministerios
- Superintendencias

```json
{
  "name": "search_legal_official",
  "parameters": {
    "query": "prescripción adquisitiva código civil",
    "maxResults": 5
  }
}
```

### `search_legal_academic`

Busca en fuentes académicas:
- Universidades colombianas
- Revistas de derecho
- Publicaciones especializadas

### `search_general_web`

Búsqueda general en internet (usar como último recurso).

### `web_content_extract`

Extrae contenido completo de una URL específica usando Jina AI Reader.

## Flujo de Tool Calling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE TOOL CALLING                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Usuario envía consulta                                                  │
│     ▼                                                                       │
│  2. Backend envía a LLM con definiciones de tools                          │
│     ▼                                                                       │
│  3. LLM responde con tool_calls (si necesita buscar)                       │
│     ▼                                                                       │
│  4. Backend ejecuta las tools (Serper Search + Jina AI)                    │
│     ▼                                                                       │
│  5. Backend envía resultados de vuelta al LLM                              │
│     ▼                                                                       │
│  6. LLM genera respuesta final con fuentes                                 │
│     ▼                                                                       │
│  7. Respuesta streameada al usuario                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Estructura de Respuesta de OpenRouter con Tool Calls

Cuando el modelo decide usar una herramienta, la respuesta tiene esta estructura:

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "search_legal_official",
          "arguments": "{\"query\": \"prescripción adquisitiva Colombia código civil\"}"
        }
      }]
    }
  }]
}
```

El backend debe:
1. Detectar `tool_calls` en la respuesta
2. Ejecutar cada tool con los argumentos proporcionados
3. Enviar los resultados de vuelta en formato:

```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "name": "search_legal_official",
  "content": "Resultados de búsqueda..."
}
```

## Troubleshooting

### El modelo no usa las herramientas

**Causas posibles:**
1. El modelo no soporta tool calling (ver lista de modelos recomendados)
2. Falta `SERPER_API_KEY` en variables de entorno
3. El prompt no indica claramente que debe buscar

**Solución:**
- Cambiar a `openai/gpt-4o-mini` o `anthropic/claude-3-haiku`
- Verificar que `SERPER_API_KEY` está configurada
- Usar `tool_choice: "required"` para forzar uso de herramientas

### Las búsquedas no retornan resultados

**Causas posibles:**
1. `SERPER_API_KEY` no válida
2. Consulta demasiado específica

**Solución:**
- Verificar la API key en https://serper.dev/dashboard
- Simplificar la consulta de búsqueda

### Respuestas genéricas sin fuentes

**Causas posibles:**
1. El modelo no está usando las tools
2. Las búsquedas no encontraron resultados

**Solución:**
- Revisar logs del servidor para ver si se ejecutaron tool_calls
- Verificar que las tools están correctamente definidas

## Logs de Debugging

El sistema genera logs detallados en la consola del servidor:

```
═══════════════════════════════════════════════════════════════════════════
🤖 LEGAL AGENT - TOOL CALLING ENDPOINT
═══════════════════════════════════════════════════════════════════════════
📝 Query: "¿Cuáles son los requisitos para la prescripción adquisitiva?"
🤖 Modelo: openai/gpt-4o-mini
🔍 Requiere búsqueda legal: true

📍 Iteración 1/5
🔧 Procesando tool call: search_legal_official
📝 Argumentos: {"query":"prescripción adquisitiva Colombia código civil"}
✅ Tool search_legal_official ejecutada exitosamente (2500 chars)

✅ RESPUESTA COMPLETADA
   📊 Tool calls totales: 2
   📚 Fuentes extraídas: 5
   📝 Longitud respuesta: 1500 caracteres
```

## Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `lib/tools/legal/tongyi-legal-toolkit.ts` | Implementación de tools con Serper API |
| `app/api/chat/legal-agent/route.ts` | Endpoint con tool calling (GPT-4, Claude) |
| `app/api/chat/tongyi-iterative/route.ts` | Endpoint con búsqueda iterativa (Tongyi) |
| `lib/tools/conditional-web-search.ts` | Detector de consultas legales |
| `components/chat/chat-helpers/index.ts` | Lógica que selecciona endpoint según modelo |

## Selección Automática de Endpoint

El frontend detecta automáticamente qué modelo estás usando y selecciona el endpoint correcto:

```typescript
// En components/chat/chat-helpers/index.ts
const modelId = payload.chatSettings.model?.toLowerCase() || ''
const isTongyiModel = modelId.includes('tongyi') || 
                      modelId.includes('deepresearch') || 
                      modelId.includes('alibaba')

if (isTongyiModel) {
  apiEndpoint = "/api/chat/tongyi-iterative"  // Búsqueda iterativa
} else {
  apiEndpoint = "/api/chat/legal-agent"       // Tool calling nativo
}
```

