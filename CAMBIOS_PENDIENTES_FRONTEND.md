# Cambios Pendientes en el Frontend

## Resumen
El frontend tiene múltiples referencias a archivos eliminados. Necesitas actualizar o eliminar estas referencias.

## Archivos con Importaciones Obsoletas

### 1. `context/context.tsx`
**Cambiar:**
```typescript
// ANTES
collections: Tables<"collections">[]

// DESPUÉS  
collections: Tables<"processes">[]
```

### 2. `components/sidebar/sidebar-data-list.tsx`
**Eliminar imports:**
```typescript
import { updateAssistant } from "@/db/assistants"
import { updateCollection } from "@/db/collections"
import { updateTool } from "@/db/tools"
```

**Reemplazar con:**
```typescript
import { updateProcess } from "@/db/processes"
```

### 3. `components/sidebar/sidebar-create-buttons.tsx`
**Eliminar:**
```typescript
import { createFolder } from "@/db/folders"
```

**Y eliminar código relacionado con folders**

### 4. `components/sidebar/items/folders/*`
**Opciones:**
- A) Eliminar completamente (recomendado si no se usan folders)
- B) Eliminar solo imports obsoletos

### 5. `components/chat/chat-hooks/use-chat-handler.tsx`
**Cambiar:**
```typescript
import { getCollectionFilesByCollectionId } from "@/db/collection-files"

// POR:
import { getProcessFilesByProcessId } from "@/db/process-files"
```

Y actualizar llamadas a esta función.

### 6. `components/chat/chat-files-display.tsx`
**Mismo cambio que arriba**

### 7. `components/utility/import.tsx`
**Eliminar:**
```typescript
import { createAssistants } from "@/db/assistants"
import { createCollections } from "@/db/collections"
import { createTools } from "@/db/tools"
```

## Solución Temporal Rápida

Mientras actualizas el frontend, puedes crear archivos stub temporales para que compile:

```typescript
// db/assistants.ts (temporal)
export const getAssistantWorkspacesByWorkspaceId = async () => ({ assistants: [] })
export const updateAssistant = async () => ({})

// db/tools.ts (temporal)
export const getToolWorkspacesByWorkspaceId = async () => ({ tools: [] })
export const updateTool = async () => ({})

// db/folders.ts (temporal)
export const getFoldersByWorkspaceId = async () => ([])

// db/collections.ts (temporal)  
export const getCollectionWorkspacesByWorkspaceId = async () => ({ collections: [] })
export const updateCollection = async () => ({})

// db/collection-files.ts (temporal)
export const getCollectionFilesByCollectionId = async () => ({ files: [] })
```

## Email de Usuarios

Para confirmar emails de usuarios existentes, ejecuta:

```sql
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at;
```

O usa la consola de Supabase Dashboard.

