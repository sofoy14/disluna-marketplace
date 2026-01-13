# RAG Backend Configuration

## Variable de Entorno

```env
# RAG Backend API - Sistema de búsqueda híbrida (vectorial + grafo de conocimiento)
RAG_BACKEND_URL=https://ali-backendmotor-70qozk-0eea4b-35-202-24-4.traefik.me
```

## Descripción

Esta variable apunta al backend RAG especializado que proporciona:
- **Búsqueda Vectorial**: Embeddings semánticos con Qdrant
- **Grafo de Conocimiento**: Relaciones contextuales con Neo4j
- **Búsqueda Híbrida**: Combinación óptima de ambas tecnologías

## Uso

Esta configuración es utilizada **exclusivamente** en la sección de **Procesos** para:
- Chat contextual sobre documentos de procesos
- Ingesta y indexación de documentos legales
- Búsqueda avanzada en documentos procesales

El resto de la aplicación (chat general, etc.) continúa usando el sistema local de Supabase.

## Endpoints Disponibles

- `GET /health` - Estado del backend
- `POST /chat` - Chat con contexto
- `POST /chat/stream` - Chat con streaming SSE
- `POST /search/vector` - Búsqueda vectorial
- `POST /search/graph` - Búsqueda en grafo
- `POST /search/hybrid` - Búsqueda híbrida
- `POST /ingest` - Ingesta de documentos
- `GET /documents` - Listar documentos indexados

## Notas de Desarrollo

- En desarrollo, el backend usa certificados auto-firmados (requiere `-k` en curl)
- En producción, asegúrate de tener certificados SSL válidos
- El backend debe estar accesible desde tu servidor Next.js
