# Problema: Procesos no se muestran en el sidebar

## Diagnóstico

Los procesos SÍ se están creando correctamente en la base de datos:
- ✅ Proceso con `workspace_id` correcto
- ✅ Relación en `process_workspaces` correcta
- ✅ 4 procesos existentes en la base de datos

## Problema Identificado

El layout carga los procesos pero NO los mapea correctamente al formato que espera el contexto:
- El contexto espera `collections` (formato de la tabla antigua)
- Los procesos tienen un formato diferente
- Necesitamos mapear los campos correctamente

## Solución Implementada

Mapeo de `processes` a formato `collections` en `app/[locale]/[workspaceid]/layout.tsx`:

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

Esto permite que:
- El sidebar muestre los procesos correctamente
- El contador se actualice
- Los items se rendericen usando el componente CollectionItem

## Verificar

Después de este cambio, los procesos deberían aparecer en el sidebar cuando:
1. Recargas la página
2. Cambias a la pestaña "Procesos"
