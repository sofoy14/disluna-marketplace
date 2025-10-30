# Estado Actual de la Optimización

## ✅ Archivos STUB Creados

Para que el proyecto compile, se crearon archivos STUB temporales:

1. **db/assistants.ts** - Retorna arrays vacíos
2. **db/assistant-files.ts** - Retorna arrays vacíos
3. **db/assistant-collections.ts** - Retorna arrays vacíos
4. **db/assistant-tools.ts** - Retorna arrays vacíos
5. **db/tools.ts** - Retorna arrays vacíos
6. **db/folders.ts** - Retorna arrays vacíos
7. **db/collections.ts** - Redirige a processes
8. **db/collection-files.ts** - Redirige a process-files

## ⚠️ Importante

Estos archivos son **TEMPORALES** y deben eliminarse después de actualizar el frontend.

## 📝 Archivos que Necesitan Actualización

### Prioridad Alta (rompen el build):

1. `context/context.tsx` - Cambiar `collections` → `processes`
2. `components/chat/chat-hooks/use-chat-handler.tsx` - Ya tiene imports, pero asistentes no funcionan
3. `components/chat/chat-hooks/use-prompt-and-command.tsx` - Usa asistentes
4. `components/sidebar/sidebar-data-list.tsx` - Usa updateAssistant, updateCollection, updateTool
5. `components/sidebar/items/all/*` - Varios archivos usan funciones obsoletas

### Prioridad Media:

6. Todos los archivos en `components/sidebar/items/collections/` - Renombrar a `processes/`
7. Actualizar queries de Supabase para usar `processes` en vez de `collections`

## 🎯 Siguiente Paso

El proyecto debería compilar ahora. El siguiente paso es:

1. Actualizar frontend para eliminar uso de asistentes y folders
2. Cambiar todas las referencias de "collections" a "processes"
3. Probar que todo funciona
4. Ejecutar migraciones SQL
5. Eliminar archivos STUB

## 📧 Emails de Usuarios

Para ver emails en Supabase:

```sql
SELECT email, created_at, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC;
```

