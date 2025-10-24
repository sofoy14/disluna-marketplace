# Arquitectura del Sistema - Asistente Legal Inteligente

## Visión General

El Asistente Legal Inteligente es un sistema de chatbot especializado en derecho colombiano que utiliza inteligencia artificial para proporcionar consultas legales precisas, verificadas y fundamentadas en fuentes oficiales.

## Arquitectura del Sistema

### Componentes Principales

#### 1. **API Layer** (`app/api/`)
- **`chat/legal/route.ts`** - Endpoint principal para consultas legales
- **`retrieval/`** - Procesamiento de documentos legales
- **`keys/`** - Gestión de API keys

#### 2. **Agentes Legales** (`lib/agents/`)
- **`tongyi-unified-legal-agent.ts`** - Agente principal que orquesta toda la lógica
- **`tongyi-react-agent.ts`** - Implementación del patrón ReAct
- **`legal-ai-agent.ts`** - Agente legal especializado

#### 3. **Sistema de Investigación Profunda** (`lib/tongyi/`)
- **`unified-deep-research-orchestrator.ts`** - Orquestador unificado con 3 modos:
  - **ReAct**: Reasoning + Acting iterativo
  - **IterResearch**: Investigación iterativa profunda
  - **Híbrido**: Combinación inteligente de ambos
- **`deep-research-orchestrator.ts`** - Sistema exhaustivo de investigación iterativa

#### 4. **Herramientas Legales** (`lib/tools/`)
- **`legal/legal-search-specialized.ts`** - Búsqueda legal especializada
- **`legal/tongyi-legal-toolkit.ts`** - Toolkit de herramientas legales
- **`extraction/firecrawl-extractor.ts`** - Extracción de contenido web

#### 5. **Sistemas de Calidad y Verificación**
- **`anti-hallucination/`** - Sistema anti-alucinación
- **`verification/`** - Verificación continua en 5 etapas
- **`memory/chat-memory-manager.ts`** - Gestión de memoria y trazabilidad

#### 6. **Utilidades Compartidas** (`lib/utils/`)
- **`legal-synthesis.ts`** - Síntesis unificada de respuestas legales
- **`json-parser.ts`** - Parsing genérico de JSON
- **`uuid-utils.ts`** - Utilidades de UUID
- **`prompt-builder.ts`** - Construcción de prompts

## Flujo de Procesamiento

### 1. Recepción de Consulta
```
Usuario → API Endpoint → Agente Unificado → Clasificación de Consulta
```

### 2. Investigación Legal
```
Consulta → Detección de Necesidad de Búsqueda → Orquestador de Investigación → Búsqueda Especializada → Enriquecimiento de Contenido
```

### 3. Verificación y Calidad
```
Fuentes Encontradas → Verificación Continua → Anti-Alucinación → Evaluación de Calidad
```

### 4. Síntesis y Respuesta
```
Fuentes Verificadas → Síntesis Legal → Generación de Respuesta → Trazabilidad en Memoria
```

## Características Técnicas

### Tecnologías Utilizadas
- **Next.js 14** - Framework de React
- **Supabase** - Base de datos y autenticación
- **OpenAI/Tongyi** - Modelos de lenguaje
- **Serper API** - Búsqueda web especializada
- **Firecrawl** - Extracción de contenido web

### Patrones de Diseño
- **Patrón ReAct** - Reasoning + Acting para resolución de problemas
- **Patrón Orquestador** - Coordinación de múltiples servicios
- **Patrón Strategy** - Diferentes modos de investigación
- **Patrón Observer** - Verificación continua de calidad

## Cumplimiento Legal

### Sistemas Críticos para Auditoría
1. **Trazabilidad Completa** - Registro de consultas, respuestas y fuentes
2. **Verificación de Fuentes** - Validación de autoridad y vigencia
3. **Anti-Alucinación** - Prevención de información inventada
4. **Memoria Persistente** - Almacenamiento para auditoría

### Fuentes Prioritarias
- **Corte Constitucional** (`corteconstitucional.gov.co`)
- **Consejo de Estado** (`consejodeestado.gov.co`)
- **SUIN-Juriscol** (`suin-juriscol.gov.co`)
- **DIAN** (`dian.gov.co`)
- **Superintendencias** (varias)

## Seguridad y Privacidad

### Protección de Datos
- **GDPR Compliance** - Cumplimiento con normativas de protección de datos
- **Derecho al Olvido** - Función de eliminación de datos
- **Anonimización** - Protección de identidad de usuarios
- **Retención Limitada** - Políticas de retención de datos

### Validación de Información
- **Jerarquía de Fuentes** - Priorización de fuentes oficiales
- **Verificación Continua** - Validación en múltiples etapas
- **Advertencias** - Indicación de limitaciones y recomendaciones

## Escalabilidad y Rendimiento

### Optimizaciones Implementadas
- **Cache de Fuentes** - TTL de 24 horas para fuentes verificadas
- **Búsqueda Paralela** - Múltiples consultas simultáneas
- **Límites de Calidad** - Filtrado de fuentes de baja calidad
- **Timeout Management** - Control de tiempo de respuesta

### Métricas de Calidad
- **Puntuación de Fuentes** - Evaluación de 1-10
- **Clasificación de Autoridad** - Máxima, Alta, Media, Baja, Mínima
- **Evaluación de Suficiencia** - Determinación de completitud de información

## Mantenimiento y Evolución

### Monitoreo
- **Logs de Auditoría** - Registro completo de interacciones
- **Métricas de Calidad** - Seguimiento de rendimiento por modo
- **Alertas de Error** - Notificación de problemas críticos

### Actualizaciones
- **Refactorización Continua** - Mejora constante del código
- **Tests de Regresión** - Validación de funcionalidad crítica
- **Documentación Actualizada** - Mantenimiento de docs técnicos

---

*Documento de arquitectura actualizado después de la refactorización y optimización del sistema.*







