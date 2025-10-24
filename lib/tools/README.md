# Herramientas del Asistente Legal Inteligente

## Estructura Reorganizada

### `/legal/` - Herramientas Legales Especializadas
Herramientas específicas para búsqueda y procesamiento legal:

- `legal-search-specialized.ts` - **CORE** - Búsqueda legal especializada con Serper API
- `tongyi-legal-toolkit.ts` - Toolkit de herramientas legales para Tongyi
- `smart-legal-detector.ts` - Detección inteligente de consultas legales

### `/extraction/` - Herramientas de Extracción
Herramientas para extraer contenido de fuentes web:

- `firecrawl-extractor.ts` - Extracción de contenido de páginas web usando Firecrawl

### Herramientas Marcadas para Eliminación
Las siguientes herramientas están marcadas con `// CONFIRMAR USO ANTES DE ELIMINACIÓN` porque son redundantes:

#### Implementaciones Redundantes de Web Search (6 archivos):
- `conditional-web-search.ts` - Usado por endpoints redundantes
- `enhanced-web-search.ts` - Implementación alternativa
- `robust-web-search.ts` - Sistema con fallback
- `simple-web-search.ts` - Implementación simplificada
- `web-search.ts` - Sistema open source con SearXNG
- `web-search-tool.ts` - Herramienta genérica

#### Orquestadores Redundantes (2 archivos):
- `enhanced-search-orchestrator.ts` - Orquestador alternativo
- `unlimited-search-orchestrator.ts` - Orquestador con búsqueda ilimitada

## Uso en Producción

**Solo se usa activamente:**
- `legal-search-specialized.ts` - En el endpoint principal `/api/chat/legal`
- `tongyi-legal-toolkit.ts` - Para herramientas específicas de Tongyi
- `smart-legal-detector.ts` - Para detectar consultas legales
- `firecrawl-extractor.ts` - Para extraer contenido de fuentes

## Notas de Refactorización

Las herramientas marcadas para eliminación son redundantes porque:

1. **Solo se usa `legal-search-specialized.ts`** en el endpoint principal `/api/chat/legal`
2. **Los endpoints que usan otras herramientas** (`/simple-direct`, `/tools`, `/independent`, `/openrouter`, `/simple`) parecen ser alternativos o de desarrollo
3. **Los orquestadores redundantes** duplican funcionalidad del `unified-deep-research-orchestrator.ts`

**Antes de eliminar definitivamente:**
- Verificar que los endpoints redundantes no se usen en producción
- Confirmar que no hay dependencias indirectas
- Ejecutar tests para asegurar que no se rompe funcionalidad

