# Sistema de Almacenamiento Wasabi S3

## Descripción

Sistema completo de almacenamiento de objetos utilizando Wasabi S3 como fuente única de verdad, con gestión de quotas por plan de suscripción.

## Características

- ✅ **Wasabi S3** - Almacenamiento S3-compatible con costos reducidos
- ✅ **Quotas por Plan** - 1GB para Pro, ilimitado para Enterprise
- ✅ **Validación Pre-Upload** - Verifica quota antes de permitir upload
- ✅ **URLs Firmadas** - Descarga segura con presigned URLs
- ✅ **Rollback Automático** - Si falla DB, elimina archivo de S3
- ✅ **Triggers SQL** - Actualización automática de quotas

## Estructura

```
lib/storage/
├── types.ts              # Interfaces y tipos
├── storage-service.ts    # Servicio principal
├── quota-service.ts      # Gestión de quotas
├── key-builder.ts        # Constructor de rutas S3
├── index.ts              # Exportaciones
└── providers/
    ├── interface.ts      # StorageProvider interface
    └── wasabi-s3-provider.ts  # Implementación Wasabi
```

## Uso

### Subir Archivo

```typescript
import { getStorageService, S3KeyBuilder } from '@/lib/storage';

const storageService = getStorageService();

// Verificar quota primero
const quotaCheck = await storageService.checkQuota(userId, fileSize);
if (!quotaCheck.allowed) {
  throw new Error(quotaCheck.message);
}

// Subir archivo
const result = await storageService.uploadFile({
  file: buffer,
  key: S3KeyBuilder.buildDocumentKey({
    workspaceId,
    processId,
    documentId,
    fileName: 'document.pdf'
  }),
  contentType: 'application/pdf',
  userId,
  workspaceId,
  processId,
});
```

### Obtener URL de Descarga

```typescript
const downloadUrl = await storageService.getDownloadUrl(
  storageKey,
  3600 // Expira en 1 hora
);
```

### Eliminar Archivo

```typescript
await storageService.deleteFile({
  key: storageKey,
  userId,
  sizeBytes,
});
```

### Verificar Quota

```typescript
const quota = await storageService.getQuotaStatus(userId);
console.log(`Usado: ${quota.usedBytes} / ${quota.limitBytes}`);
```

## Configuración

Variables de entorno requeridas:

```bash
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_REGION=us-east-1
WASABI_BUCKET=ali-prod-us-east-1
WASABI_ACCESS_KEY_ID=tu_access_key
WASABI_SECRET_ACCESS_KEY=tu_secret_key
STORAGE_PROVIDER=wasabi
```

## Límites por Plan

| Plan | Almacenamiento | Código |
|------|----------------|--------|
| Basic | 0 MB | `max_storage_bytes = 0` |
| Pro | 1 GB | `max_storage_bytes = 1073741824` |
| Enterprise | Ilimitado | `max_storage_bytes = -1` |

## API Endpoints

- `POST /api/files/upload` - Subir archivo con validación de quota
- `GET /api/files/download/[id]` - Obtener presigned URL
- `DELETE /api/files/delete/[id]` - Eliminar archivo
- `GET /api/storage/quota` - Estado de quota del usuario

## Hooks React

```typescript
import { useStorageQuota } from '@/lib/hooks/use-storage-quota';
import { useFileUpload } from '@/lib/hooks/use-file-upload';

function MyComponent() {
  const { quota, canUpload, isAtLimit } = useStorageQuota();
  const { upload, uploading, progress } = useFileUpload();
  
  const handleUpload = async (file: File) => {
    const result = await upload(file, { workspaceId, processId });
    if (result.success) {
      console.log('Archivo subido:', result.document);
    }
  };
}
```

## Componentes UI

```tsx
import { StorageIndicator, StorageUploadZone } from '@/components/storage';

// Indicador de uso
<StorageIndicator />

// Zona de upload con validación
<StorageUploadZone 
  workspaceId={workspaceId}
  processId={processId}
  onUploadComplete={(doc) => console.log(doc)}
/>
```

## Migración de Datos

Para migrar archivos existentes de Supabase Storage a Wasabi:

```bash
# Verificar qué se migraría
npm run migrate:storage:dry-run

# Ejecutar migración
npm run migrate:storage

# Verificar migración
npm run verify:storage
```

## Testing

```bash
# Probar conexión con Wasabi
npm run test:wasabi

# Verificar integridad de migración
npm run verify:storage
```

## Solución de Problemas

### Error: "Storage quota exceeded"
- Verificar que el usuario tenga plan Pro activo
- Verificar que la migración SQL se aplicó correctamente

### Error: "NoSuchBucket"
- Crear el bucket en Wasabi console

### Error: "InvalidAccessKeyId"
- Verificar credenciales en .env

## Arquitectura

```
Frontend
    ↓
API Routes (Next.js)
    ↓
StorageService + QuotaService
    ↓
WasabiS3Provider
    ↓
Wasabi S3 (S3-compatible)
    ↓
Supabase PostgreSQL (metadata + quotas)
```

## Notas

- Los archivos se encriptan en tránsito y en reposo (AES-256)
- Las URLs de descarga expiran por defecto en 1 hora
- Los archivos temporales deben ir al prefijo `temp/` y tener lifecycle policy
- Los triggers SQL mantienen automáticamente las quotas actualizadas
