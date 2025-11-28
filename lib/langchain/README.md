# LangChain Integration - Asistente Legal Inteligente

Sistema modular de agentes con LangChain para investigación legal colombiana.

## 🏗️ Arquitectura

```
lib/langchain/
├── index.ts                 # Exportaciones centrales
├── config/
│   ├── models.ts           # Configuración de modelos LLM
│   └── prompts.ts          # Prompts del sistema
├── tools/
│   ├── index.ts            # Índice de herramientas
│   ├── search-tools.ts     # Herramientas de búsqueda
│   └── content-tools.ts    # Herramientas de contenido
└── agents/
    ├── index.ts            # Índice de agentes
    └── legal-agent.ts      # Agente legal principal
```

## 🚀 Uso Rápido

### Crear un Agente

```typescript
import { LegalAgent } from '@/lib/langchain'

// Crear agente con Tongyi DeepResearch
const agent = await LegalAgent.create({
  modelId: 'alibaba/tongyi-deepresearch-30b-a3b',
  temperature: 0.3,
  maxIterations: 6
})

// Ejecutar consulta
const response = await agent.invoke({
  input: '¿Cuáles son los requisitos de la prescripción adquisitiva en Colombia?'
})

console.log(response.output)
console.log('Tools usadas:', response.toolsUsed)
console.log('Fuentes:', response.sources)
```

### Usar con Kimi K2

```typescript
const agent = await LegalAgent.create({
  modelId: 'moonshotai/kimi-k2-thinking',
  temperature: 0.3
})
```

### Con Historial de Conversación

```typescript
import { HumanMessage, AIMessage } from '@langchain/core/messages'

const response = await agent.invoke({
  input: '¿Y cuál es el plazo?',
  chatHistory: [
    new HumanMessage('¿Qué es la prescripción adquisitiva?'),
    new AIMessage('La prescripción adquisitiva es...')
  ]
})
```

## 🔧 Herramientas Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `search_legal_official` | Busca en fuentes oficiales colombianas (Corte Constitucional, SUIN-Juriscol, etc.) |
| `search_legal_academic` | Busca en fuentes académicas (universidades, revistas de derecho) |
| `search_general_web` | Búsqueda general en internet |
| `extract_web_content` | Extrae contenido completo de una URL |
| `verify_sources` | Verifica accesibilidad de fuentes citadas |

## 🤖 Modelos Soportados

| Modelo | ID | Capacidades |
|--------|-----|-------------|
| **Kimi K2 Thinking** | `moonshotai/kimi-k2-thinking` | Razonamiento profundo, tool calling (M1 Pro) |
| **Tongyi DeepResearch** | `alibaba/tongyi-deepresearch-30b-a3b` | Investigación profunda, búsqueda agéntica (M1) |
| **GPT-4o Mini** | `openai/gpt-4o-mini` | Tool calling eficiente |
| **Claude 3.5 Sonnet** | `anthropic/claude-3-5-sonnet` | Análisis y razonamiento |

## 📡 Endpoint API

### POST `/api/chat/langchain-agent`

```typescript
const response = await fetch('/api/chat/langchain-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatSettings: {
      model: 'alibaba/tongyi-deepresearch-30b-a3b',
      temperature: 0.3
    },
    messages: [
      { role: 'user', content: '¿Qué dice el artículo 1 de la Constitución?' }
    ],
    chatId: 'optional-chat-id'
  })
})

// La respuesta es un stream de texto
const reader = response.body.getReader()
```

### GET `/api/chat/langchain-agent`

Retorna información del servicio:

```json
{
  "status": "ok",
  "endpoint": "LangChain Agent - Unified Legal Assistant",
  "recommendedModels": ["moonshotai/kimi-k2-thinking", "alibaba/tongyi-deepresearch-30b-a3b"],
  "tools": ["search_legal_official", "search_legal_academic", ...],
  "apiKeys": {
    "openrouter": "✅ Configurada",
    "serper": "✅ Configurada"
  }
}
```

## ➕ Agregar Nuevas Herramientas

1. Crear archivo en `lib/langchain/tools/`:

```typescript
// lib/langchain/tools/my-tools.ts
import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"

export const myNewTool = new DynamicStructuredTool({
  name: "my_new_tool",
  description: "Descripción de lo que hace la herramienta",
  schema: z.object({
    param1: z.string().describe("Descripción del parámetro")
  }),
  func: async ({ param1 }) => {
    // Implementación
    return JSON.stringify({ result: "..." })
  }
})

export const myTools = [myNewTool]
```

2. Agregar al índice en `lib/langchain/tools/index.ts`:

```typescript
import { myTools, myNewTool } from "./my-tools"

export const ALL_TOOLS: StructuredTool[] = [
  ...searchTools,
  ...contentTools,
  ...myTools  // ← Agregar aquí
]
```

## ⚙️ Variables de Entorno

```env
# Requeridas
OPENROUTER_API_KEY=sk-or-v1-xxx
SERPER_API_KEY=xxx

# Opcionales
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🔄 Flujo de Tool Calling

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DEL AGENTE LEGAL                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuario envía consulta                                       │
│     ▼                                                            │
│  2. Agente analiza y DECIDE si necesita herramientas            │
│     ▼                                                            │
│  3. Si necesita → Llama herramientas (search, extract, etc.)    │
│     ▼                                                            │
│  4. Recibe resultados y EVALÚA si necesita más                  │
│     ▼                                                            │
│  5. Repite 3-4 hasta tener información suficiente (máx 6x)      │
│     ▼                                                            │
│  6. Genera respuesta final con fuentes                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📝 Notas de Implementación

- **Tool Calling Nativo**: El modelo decide autónomamente cuándo y qué herramientas usar
- **Cache de Agentes**: Los agentes se cachean por chatId para reutilizar en conversaciones
- **Máximo 6 iteraciones**: Previene loops infinitos de tool calling
- **Prioridad de fuentes**: Oficiales > Académicas > Generales

## 🔗 Referencias

- [LangChain JS Documentation](https://js.langchain.com/)
- [OpenRouter API](https://openrouter.ai/docs)
- [Serper API](https://serper.dev/docs)

