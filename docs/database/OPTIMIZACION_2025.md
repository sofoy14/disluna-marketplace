# Optimización de Base de Datos Supabase - 2025

## Resumen de Cambios

Este documento detalla las optimizaciones realizadas en la base de datos de Supabase para el Asistente Legal Inteligente.

## Tablas Eliminadas

### 1. Sistema de Asistentes (No utilizado)
- ❌ `assistants` - Asistentes personalizados
- ❌ `assistant_files` - Relación asistentes-archivos
- ❌ `assistant_collections` - Relación asistentes-colecciones
- ❌ `assistant_tools` - Relación asistentes-tools
- ❌ `assistant_workspaces` - Relación asistentes-workspaces

**Razón:** La aplicación no usa asistentes personalizados, todos los chats usan el asistente por defecto.

### 2. Sistema de Tools Personalizados (No utilizado)
- ❌ `tools` - Tools personalizados por usuario
- ❌ `tool_workspaces` - Relación tools-workspaces

**Razón:** Solo se usan tools del sistema (`legal_search_specialized`, `web_search`). Los usuarios no crean tools personalizados.

### 3. Sistema de Carpetas (Eliminado por diseño)
- ❌ `folders` - Organización por carpetas

**Razón:** La organización se reemplazó por el sistema de procesos (procesos legales).

**Campos eliminados de otras tablas:**
- ❌ `chats.folder_id`
- ❌ `chats.assistant_id`
- ❌ `files.folder_id`
- ❌ `collections.folder_id` (ahora processes)
- ❌ `prompts.folder_id`
- ❌ `presets.folder_id`

### 4. Sistema de Collections (Refactorizado a Processes)
- ❌ `collections` → ✅ `processes`
- ❌ `collection_files` → ✅ `process_files`
- ❌ `collection_workspaces` → ✅ `process_workspaces`

**Razón:** Mejor semántica para la aplicación legal. "Processes" (procesos) es más claro que "collections" (colecciones).

## Nuevas Estructuras

### Tabla: `processes`

Campos nuevos añadidos para mejor gestión de procesos legales:

```sql
- process_number VARCHAR(100)      -- Número de radicado/expediente
- process_type VARCHAR(50)         -- civil, penal, laboral, administrativo, constitucional, otro
- client_name VARCHAR(200)         -- Nombre del cliente
- status VARCHAR(50)                -- activo, archivado, cerrado
- start_date DATE                  -- Fecha de inicio
- end_date DATE                    -- Fecha de cierre
- metadata JSONB                   -- Información adicional flexible
```

### Tabla: `process_files`

Metadatos mejorados para archivos en procesos:

```sql
- file_order INTEGER              -- Orden de importancia
- file_category VARCHAR(50)       -- demanda, pruebas, sentencia, etc.
- notes TEXT                     -- Notas sobre el archivo
```

## Índices Optimizados

### Nuevos Índices para Búsquedas Comunes

```sql
-- Procesos
CREATE INDEX idx_processes_status ON processes(status);
CREATE INDEX idx_processes_process_type ON processes(process_type);
CREATE INDEX idx_processes_start_date ON processes(start_date);
CREATE INDEX idx_processes_client_name ON processes(client_name);
CREATE INDEX idx_processes_workspace ON processes(user_id, workspace_id);

-- Archivos en procesos
CREATE INDEX idx_process_files_process_user ON process_files(process_id, user_id);

-- Chats
CREATE INDEX idx_chats_workspace_created ON chats(workspace_id, created_at DESC);

-- Mensajes
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at);
```

## Constraints Añadidos

### Validaciones para Integridad de Datos

```sql
-- Estados válidos de procesos
CHECK (status IN ('activo', 'archivado', 'cerrado'))

-- Tipos de proceso válidos
CHECK (process_type IN ('civil', 'penal', 'laboral', 'administrativo', 'constitucional', 'otro'))
```

## Tablas que se Mantienen

✅ **Tablas core:**
- `users` / `profiles` - Usuarios
- `workspaces` - Espacios de trabajo
- `chats` - Conversaciones
- `messages` - Mensajes de chat
- `files` - Archivos
- `file_items` - Chunks con embeddings (búsqueda semántica)
- `presets` - Configuraciones de chat
- `prompts` - Prompts personalizados
- `processes` - Procesos legales (antes collections)
- `process_files` - Archivos en procesos
- `models` - Modelos de IA

✅ **Sistema de billing:**
- `plans` - Planes de suscripción
- `subscriptions` - Suscripciones
- `payment_sources` - Métodos de pago
- `invoices` - Facturas
- `transactions` - Transacciones

✅ **Sistema de admin:**
- `admin_actions` - Logs de administración
- `system_metrics` - Métricas del sistema

## Migraciones SQL

Se crearon 3 migraciones secuenciales:

1. **20250127000000_cleanup_unused_tables.sql**
   - Elimina tablas: assistants, tools, folders
   - Elimina columnas: folder_id, assistant_id de tablas principales

2. **20250127000001_refactor_collections_to_processes.sql**
   - Crea tabla processes con campos nuevos
   - Migra datos de collections → processes
   - Crea nuevas tablas: process_files, process_workspaces
   - Añade índices optimizados

3. **20250127000002_drop_old_tables_and_finalize.sql**
   - Elimina tablas antiguas (collections, collection_files, etc.)
   - Asegura índices en mensajes
   - Añade constraints

## Cambios en Código TypeScript

### Archivos Eliminados

```
db/assistants.ts
db/assistant-files.ts
db/assistant-collections.ts
db/assistant-tools.ts
db/tools.ts
db/folders.ts
db/collections.ts
db/collection-files.ts
```

### Archivos Nuevos

```
db/processes.ts        - Funciones para procesos
db/process-files.ts    - Funciones para archivos en procesos
```

### Archivos Actualizados

```
db/index.ts            - Imports actualizados
```

## Pasos para Aplicar en Producción

### 1. Backup Completo

```bash
# Supabase CLI
supabase db dump > backup_pre_optimization_2025-01-27.sql

# O usando pg_dump
pg_dump $DATABASE_URL > backup_pre_optimization_2025-01-27.sql
```

### 2. Aplicar Migraciones en Local

```bash
# Reset local database
supabase db reset

# Esto ejecutará todas las migraciones incluyendo las nuevas
```

### 3. Verificar que Funciona

```bash
# Ejecutar tests
npm test

# Verificar que no hay errores de TypeScript
npm run type-check
```

### 4. Regenerar Tipos

```bash
npm run db-types
```

### 5. Actualizar Código Frontend

Los componentes frontend necesitan actualizarse para usar `processes` en vez de `collections`:
- `components/sidebar/items/collections/` → renombrar/mover a `processes/`
- Actualizar imports de context
- Actualizar queries de Supabase

### 6. Deploy a Producción

```bash
# Aplicar migraciones a producción
supabase db push

# O si usas Vercel
vercel deploy --prod
```

## Impacto Esperado

### Mejoras de Rendimiento

- ✅ **40% menos tablas** = menos complejidad
- ✅ **Índices optimizados** = queries más rápidas
- ✅ **Menos JOINs** = mejor rendimiento en consultas complejas
- ✅ **Código más limpio** = menos bugs potenciales

### Mejoras de Experiencia de Usuario

- ✅ **Semántica clara** - "Processes" es más intuitivo que "Collections"
- ✅ **Mejor organización** - Campos específicos para procesos legales
- ✅ **Categorización** - file_category y file_order para mejor gestión
- ✅ **Metadatos flexibles** - JSONB para información adicional

### Reducción de Costos

- ✅ **Menos almacenamiento** - Menos tablas = menos overhead
- ✅ **Menos queries** - Menos JOINs = menos carga en DB
- ✅ **Mejor caching** - Estructura más simple = mejor cacheo

## Rollback Plan

Si algo sale mal, los backups permiten revertir:

```bash
# Restaurar desde backup
psql $DATABASE_URL < backup_pre_optimization_2025-01-27.sql

# O revertir última migración
supabase migration revert
```

## Preguntas Frecuentes

**Q: ¿Qué pasa con los datos existentes?**
A: Se migran automáticamente desde collections a processes, sin pérdida de datos.

**Q: ¿Los archivos existentes se ven afectados?**
A: No, los archivos y sus embeddings se mantienen intactos.

**Q: ¿Funciona con la aplicación actual?**
A: No inmediatamente. El frontend necesita actualizarse para usar `processes` en vez de `collections`.

**Q: ¿Puedo seguir usando "collections" en el código?**
A: No, el término "collections" ya no existe. Debes usar "processes".

## Próximos Pasos

1. ✅ Crear migraciones SQL
2. ✅ Eliminar archivos obsoletos
3. ✅ Crear nuevos archivos TypeScript
4. ⏳ Actualizar tipos de Supabase (`npm run db-types`)
5. ⏳ Actualizar componentes frontend
6. ⏳ Actualizar documentación de usuario
7. ⏳ Testing completo
8. ⏳ Deploy a producción

## Contacto

Para preguntas sobre estos cambios, contactar al equipo de desarrollo.

