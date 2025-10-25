# Tools Agent de Búsqueda Web - Implementación Completada

## Resumen

Se ha implementado exitosamente un **Tools Agent de búsqueda web** siguiendo el patrón de n8n con LangChain JS. El sistema utiliza **tool calling** con esquemas JSON para decidir automáticamente cuándo invocar herramientas de búsqueda.

## Arquitectura Implementada

### 1. Tools Agent Principal
- **Archivo**: `lib/agents/web-search-tools-agent.ts`
- **Funcionalidad**: Orquestador principal que maneja tool calling
- **Herramientas**: serperSearch, httpFetch
- **Modelo**: GPT-4o-mini (configurable)

### 2. Herramientas de Búsqueda
- **Serper Search**: `lib/tools/search/serper-search.ts`
  - Búsqueda web rápida con Serper.dev API
  - Esquema JSON compatible con LangChain JS
  - Parámetros: query, num, gl (país), hl (idioma)

- **HTTP Fetch**: `lib/tools/search/http-fetch.ts`
  - Verificación de enlaces con extracción de contenido
  - Parsing HTML con Cheerio
  - Soporte para PDF con pdf-parse
  - Timeout configurable

### 3. Endpoint Unificado
- **Archivo**: `app/api/chat/tools-agent/route.ts`
- **URL**: `/api/chat/tools-agent`
- **Funcionalidad**: Endpoint principal que reemplaza `/api/chat/legal`

## Flujo de Funcionamiento

1. **Detección Automática**: El sistema detecta si una consulta requiere búsqueda web
2. **Tool Calling**: LangChain JS decide qué herramientas invocar
3. **Búsqueda**: Ejecuta queries específicas con Serper
4. **Verificación**: Valida enlaces críticos con httpFetch
5. **Síntesis**: Genera respuesta estructurada con fuentes

## Configuración Requerida

### Variables de Entorno
```bash
# .env.local
OPENROUTER_API_KEY=tu_clave_openrouter_aqui
SERPER_API_KEY=tu_clave_serper_aqui
```

### Obtener Serper API Key
1. Ve a [serper.dev](https://serper.dev)
2. Regístrate (plan gratuito: 2,500 búsquedas/mes)
3. Obtén tu API key del dashboard
4. Agrega la clave a `.env.local`

## Uso en el Frontend

El sistema se integra automáticamente:

```typescript
// Detección automática de consultas legales
const isLegalQuery = legalKeywords.some(keyword => queryText.includes(keyword))

// Endpoint seleccionado automáticamente
const endpoint = isLegalQuery ? "/api/chat/tools-agent" : "/api/chat/simple-direct"
```

## Características Principales

### ✅ Implementado
- **Tool Calling**: Esquemas JSON para LangChain JS
- **Búsqueda Web**: Serper.dev API integrada
- **Verificación**: Extracción de contenido HTML/PDF
- **Detección**: Automática de consultas que requieren búsqueda
- **Fuentes**: Respuestas con enlaces verificados
- **Configuración**: Variables de entorno listas

### 🔧 Configuración
- **Modelo**: GPT-4o-mini (configurable)
- **Temperatura**: 0.2 (para respuestas consistentes)
- **Max Tokens**: 2000
- **Timeout**: 12 segundos para httpFetch
- **País**: Colombia (gl="co") por defecto
- **Idioma**: Español (hl="es") por defecto

## Ejemplos de Uso

### Consultas que Activan Búsqueda Web
- "¿Cuál es la última sentencia de la Corte Constitucional sobre...?"
- "Buscar información sobre la ley 1955 de 2019"
- "¿Qué dice el decreto 1234 del Ministerio de Trabajo?"
- "Investigar jurisprudencia sobre contratos laborales"

### Respuesta del Sistema
```json
{
  "type": "answer",
  "text": "Basándome en la búsqueda realizada...",
  "sources": [
    {
      "title": "Sentencia C-123/2024 - Corte Constitucional",
      "url": "https://corteconstitucional.gov.co/..."
    }
  ]
}
```

## Ventajas del Nuevo Sistema

1. **Automatización**: No requiere intervención manual para decidir cuándo buscar
2. **Eficiencia**: Solo busca cuando es necesario
3. **Verificación**: Valida enlaces críticos automáticamente
4. **Fuentes**: Siempre incluye referencias verificadas
5. **Escalabilidad**: Fácil agregar nuevas herramientas
6. **Compatibilidad**: Sigue estándares de LangChain JS

## Próximos Pasos

1. **Configurar SERPER_API_KEY** en variables de entorno
2. **Probar** con consultas legales colombianas
3. **Monitorear** uso de la API de Serper
4. **Optimizar** queries según resultados

El sistema está listo para usar y seguirá el patrón de n8n con tool calling automático.


