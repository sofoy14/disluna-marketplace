# Progreso de Optimización de Base de Datos

## ✅ Fase Completada: 1 de 6

### Resumen de lo Realizado

#### 1. Migraciones SQL Creadas (✅)

**Archivos creados:**

1. `supabase/migrations/20250127000000_cleanup_unused_tables.sql`
   - Elimina: assistants, tools, folders
   - Elimina columnas: folder_id, assistant_id
   - Añade índices útiles para chats

2. `supabase/migrations/20250127000001_refactor_collections_to_processes.sql`
   - Crea tabla processes con campos legales
   - Migra datos de collections → processes
   - Crea process_files y process_workspaces
   - Añade índices optimizados
   - Añade constraints de validación

3. `supabase/migrations/20250127000002_drop_old_tables_and_finalize.sql`
   - Elimina tablas antiguas de collections
   - Asegura índices en mensajes
   - Optimiza RLS

#### 2. Archivos TypeScript Eliminados (✅)

```
- db/assistants.ts
- db/assistant-files.ts
- db/assistant-collections.ts
- db/assistant-tools.ts
- db/tools.ts
- db/folders.ts
- db/collections.ts
- db/collection-files.ts
```

#### 3. Archivos TypeScript Nuevos Creados (✅)

```
+ db/processes.ts        - Funciones para procesos
+ db/process-files.ts    - Funciones para archivos en procesos
```

#### 4. Archivos Actualizados (✅)

```
~ db/index.ts - Imports actualizados
```

#### 5. Documentación Creada (✅)

```
+ docs/database/OPTIMIZACION_2025.md - Documentación completa
```

## ⏳ Próximos Pasos Requeridos

### Fase 2: Regenerar Tipos de Supabase

```bash
npm run db-types
```

Esto actualizará `supabase/types.ts` con las nuevas tablas `processes` y `process_files`.

### Fase 3: Actualizar Componentes Frontend

**Archivos a actualizar:**

1. **Sidebar y Navegación**
   - Renombrar `components/sidebar/items/collections/` → `processes/`
   - Actualizar referencias de "collections" a "processes"

2. **Context y Estado Global**
   - `context/context.tsx` - Cambiar tipos
   - `components/utility/global-state.tsx` - Actualizar estado

3. **Componentes de Procesos**
   - `components/modals/CreateProcessModal.tsx` - Ya usa término correcto
   - Actualizar queries de Supabase

4. **Chat y Archivos**
   - `components/chat/file-picker.tsx` - Cambiar queries
   - Actualizar referencias a collections → processes

### Fase 4: Testing

```bash
# 1. Reset de base de datos local
supabase db reset

# 2. Ejecutar tests
npm test

# 3. Verificar TypeScript
npm run type-check

# 4. Verificar lint
npm run lint
```

### Fase 5: Actualizar Tipos de Base de Datos

Después de ejecutar `npm run db-types`, habrá que actualizar:

- Todas las referencias a `Tables<"collections">` → `Tables<"processes">`
- Todas las referencias a `Tables<"collection_files">` → `Tables<"process_files">`

### Fase 6: Deploy y Monitoreo

```bash
# Backup de producción
supabase db dump > backup_prod_$(date +%Y%m%d).sql

# Aplicar migraciones
supabase db push

# Monitorear logs
supabase logs
```

## 📊 Estado Actual

| Fase | Estado | Porcentaje |
|------|--------|------------|
| 1. Migraciones SQL | ✅ Completo | 100% |
| 2. Archivos obsoletos | ✅ Completo | 100% |
| 3. Archivos nuevos | ✅ Completo | 100% |
| 4. Regenerar tipos | ⏳ Pendiente | 0% |
| 5. Actualizar frontend | ⏳ Pendiente | 0% |
| 6. Testing | ⏳ Pendiente | 0% |

**Progreso General: ~40%**

## 🚨 Precauciones

1. **NO ejecutar migraciones aún** - El frontend no está actualizado
2. **Backup primero** - Siempre hacer backup antes de aplicar
3. **Testing local** - Probar completamente en local antes de producción
4. **Actualizar tipos** - Ejecutar `npm run db-types` después de aplicar migraciones

## 📝 Notas Importantes

1. **file_items se mantiene** - Es necesario para búsqueda semántica con embeddings
2. **Mensajes duplicados** - Hay dos sistemas de mensajes, necesitamos consolidar
3. **No romper producción** - Las migraciones son destructivas, hacer con cuidado

## 🎯 Siguiente Acción

La siguiente acción más importante es:

1. Actualizar el frontend para usar "processes" en vez de "collections"
2. Regenerar tipos después de eso
3. Hacer testing completo
4. Solo entonces ejecutar migraciones en producción

