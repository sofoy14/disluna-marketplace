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

### Modelos de Investigación Profunda (con tool calling nativo)

| Modelo | ID en OpenRouter | Costo | Endpoint |
|--------|-----------------|-------|----------|
| Tongyi DeepResearch (M1) | `alibaba/tongyi-deepresearch-30b-a3b` | ~$0.09/1M input | `/api/chat/langchain-agent` |
| Kimi K2 Thinking (M1 Pro) | `moonshotai/kimi-k2-thinking` | ~$0.60/1M input | `/api/chat/langchain-agent` |

Estos modelos soportan **tool calling nativo** y son ideales para investigación legal profunda.

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

### 3. `/api/chat/langchain-agent` (PRINCIPAL - LangChain)

**Endpoint principal con LangChain y tool calling nativo.**

Este endpoint usa LangChain para implementar un agente que:
1. Decide autónomamente cuándo usar herramientas
2. Ejecuta búsquedas en fuentes legales oficiales
3. Extrae contenido de URLs cuando es necesario
4. Sintetiza respuestas con citación de fuentes

```typescript
const response = await fetch('/api/chat/langchain-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatSettings: {
      model: 'alibaba/tongyi-deepresearch-30b-a3b', // M1 o 'moonshotai/kimi-k2-thinking' para M1 Pro
      temperature: 0.3
    },
    messages: [
      { role: 'user', content: '¿Qué dice el artículo 1 de la Constitución colombiana?' }
    ],
    chatId: 'optional-chat-id'
  })
})
```

**Características:**
- ✅ Tool calling nativo (el modelo decide cuándo usar herramientas)
- ✅ Soporta Tongyi DeepResearch y Kimi K2
- ✅ Búsqueda en fuentes oficiales (.gov.co)
- ✅ Extracción de contenido con Jina AI
- ✅ Cache de agentes por sesión
- ✅ Streaming de respuesta

**Flujo de LangChain Agent:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LANGCHAIN AGENT - TOOL CALLING NATIVO                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Usuario envía consulta                                                  │
│     ▼                                                                       │
│  2. Agente analiza y DECIDE si necesita herramientas                       │
│     ▼                                                                       │
│  3. Si necesita → Llama herramientas (search, extract, etc.)               │
│     ▼                                                                       │
│  4. Recibe resultados y EVALÚA si necesita más                             │
│     ▼                                                                       │
│  5. Repite 3-4 hasta tener información suficiente (máx 6x)                 │
│     ▼                                                                       │
│  6. Genera respuesta final con fuentes                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Logs de ejemplo:**

```
═══════════════════════════════════════════════════════════════════════════════
🤖 LANGCHAIN AGENT - ENDPOINT UNIFICADO
═══════════════════════════════════════════════════════════════════════════════
📝 Query: "¿Requisitos para la prescripción adquisitiva?"
🤖 Modelo: alibaba/tongyi-deepresearch-30b-a3b

🏛️ [TOOL] search_legal_official: "prescripción adquisitiva código civil Colombia"
✅ [TOOL] search_legal_official: 5 resultados oficiales

📄 [TOOL] extract_web_content: "https://www.suin-juriscol.gov.co/..."
✅ [TOOL] extract_web_content: 3500 caracteres extraídos

═══════════════════════════════════════════════════════════════════════════════
✅ RESPUESTA COMPLETADA
   ⏱️ Tiempo: 12.5s
   🔧 Tools: search_legal_official, extract_web_content
   📚 Fuentes: 5
═══════════════════════════════════════════════════════════════════════════════
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
| `lib/langchain/` | Infraestructura de LangChain (modelos, tools, agentes) |
| `lib/langchain/tools/search-tools.ts` | Herramientas de búsqueda (oficial, académica, general) |
| `lib/langchain/agents/legal-agent.ts` | Agente legal con tool calling nativo |
| `app/api/chat/langchain-agent/route.ts` | **Endpoint principal** (Tongyi, Kimi K2) |
| `app/api/chat/legal-agent/route.ts` | Endpoint legacy (GPT-4, Claude) |
| `components/chat/chat-helpers/index.ts` | Lógica que selecciona endpoint según modelo |

## Selección Automática de Endpoint

El frontend detecta automáticamente qué modelo estás usando y selecciona el endpoint correcto:

```typescript
// En components/chat/chat-helpers/index.ts
const modelId = payload.chatSettings.model?.toLowerCase() || ''

// Modelos de investigación profunda con tool calling nativo
const isLangChainModel = modelId.includes('tongyi') || 
                         modelId.includes('deepresearch') || 
                         modelId.includes('alibaba') ||
                         modelId.includes('kimi') ||
                         modelId.includes('moonshot')

if (isLangChainModel) {
  apiEndpoint = "/api/chat/langchain-agent"  // LangChain con tool calling nativo
} else {
  apiEndpoint = "/api/chat/legal-agent"      // Tool calling estándar
}
```

