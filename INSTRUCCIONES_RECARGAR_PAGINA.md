# Instrucciones: Recargar Página Después de Crear Proceso

## Cambio Implementado

El modal ahora **automáticamente recarga la página** después de crear un proceso exitosamente.

Esto asegura que:
- Los 7 procesos que ya existen en la base de datos se carguen
- El contador en el sidebar se actualice correctamente
- Los procesos se muestren en el historial

## Para Verificar

1. **Crear un nuevo proceso** desde el botón "+ Nuevo Proceso"
2. **La página se recargará automáticamente** después de 500ms
3. **Verificar en el sidebar** que ahora dice "7" en lugar de "0"
4. **Click en "Procesos"** para ver todos los procesos creados

## Procesos Existentes en la Base de Datos

Según la consulta, hay 7 procesos con `workspace_id` correcto:
- "Proceso Personalizado" (más reciente)
- "Proceso Personalizado" (anterior)
- "Sofico"
- "Proceso Personalizado" (anterior)
- "Revisión de Contratos"
- Y 2 más

## Notas Técnicas

El layout ahora mapea correctamente los procesos al formato collections:

```typescript
const collectionsData = (processData?.processes || []).map(process => ({
  id: process.id,
  name: process.name,
  description: process.description,
  user_id: process.user_id,
  workspace_id: process.workspace_id,
  created_at: process.created_at,
  updated_at: process.updated_at,
  sharing: process.sharing || 'private'
}))
```

Esto permite que el componente CollectionItem pueda renderizar los procesos correctamente.
