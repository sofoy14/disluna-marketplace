# Guía de Implementación - Wasabi S3 Storage

Esta guía te llevará paso a paso para implementar el sistema de almacenamiento Wasabi S3.

## 📋 Pre-requisitos

- [ ] Cuenta de Wasabi creada (https://wasabisys.com)
- [ ] Bucket creado en Wasabi
- [ ] Access Key y Secret Key generados
- [ ] Acceso al Dashboard de Supabase

---

## Paso 1: Configurar Wasabi S3

### 1.1 Crear Bucket en Wasabi

1. Inicia sesión en tu consola de Wasabi: https://console.wasabisys.com
2. Ve a "Buckets" → "Create Bucket"
3. Nombre del bucket: `ali-prod-us-east-1` (o el que prefieras)
4. Región: `us-east-1` (o tu región preferida)
5. Haz clic en "Create Bucket"

### 1.2 Obtener Credenciales

1. Ve a "Access Keys" en el menú lateral
2. Copia tu **Access Key ID**
3. Copia tu **Secret Access Key**

---

## Paso 2: Configurar Variables de Entorno

Edita tu archivo `.env` y completa las variables de Wasabi:

```bash
# Wasabi S3 Configuration
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_REGION=us-east-1
WASABI_BUCKET=ali-prod-us-east-1
WASABI_ACCESS_KEY_ID=tu_access_key_aqui
WASABI_SECRET_ACCESS_KEY=tu_secret_key_aqui

# Storage Configuration
STORAGE_PROVIDER=wasabi
WASABI_MAX_FILE_SIZE_MB=50
WASABI_PRESIGNED_URL_EXPIRY_SECONDS=3600
WASABI_MULTIPART_THRESHOLD_MB=5
```

---

## Paso 3: Aplicar Migración de Base de Datos

### Opción A: Via Supabase Dashboard (Recomendado)

1. Ve a tu Dashboard de Supabase: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a "SQL Editor" (en el menú lateral)
4. Crea una "New Query"
5. Copia y pega el contenido del archivo:
   ```
   supabase/migrations/20250209000000_add_wasabi_s3_storage.sql
   ```
6. Haz clic en "Run"

### Opción B: Via Terminal (Self-Hosted)

Si tienes acceso directo a PostgreSQL:

```bash
psql $DATABASE_URL -f supabase/migrations/20250209000000_add_wasabi_s3_storage.sql
```

### Verificar Migración

Ejecuta esta consulta SQL para verificar:

```sql
SELECT * FROM storage_quotas LIMIT 1;
SELECT * FROM plans WHERE plan_type = 'pro';
```

Deberías ver:
- La tabla `storage_quotas` creada
- El plan Pro con `max_storage_bytes = 1073741824` (1GB)

---

## Paso 4: Probar Conexión

Ejecuta el script de prueba:

```bash
npx ts-node scripts/test-wasabi-connection.ts
```

Deberías ver:
```
✅ Success! Found X buckets
✅ Target bucket "ali-prod-us-east-1" exists
✅ Success! Uploaded to _test/connection-test-...
✅ Success! Generated presigned URL
✅ Success! Deleted test file
```

---

## Paso 5: Migrar Archivos Existentes (Opcional)

Si tienes archivos en Supabase Storage que quieres migrar:

### 5.1 Modo Dry Run (Prueba)

```bash
npx ts-node scripts/migrate-storage-to-s3.ts --dry-run
```

Esto mostrará qué archivos se migrarían sin hacer cambios reales.

### 5.2 Ejecutar Migración Real

```bash
npx ts-node scripts/migrate-storage-to-s3.ts
```

Opciones disponibles:
- `--batch-size 10` - Migrar en lotes de 10
- `--process-id xxx` - Migrar solo un proceso específico
- `--workspace-id xxx` - Migrar solo un workspace

### 5.3 Verificar Migración

```bash
npx ts-node scripts/verify-s3-migration.ts
```

---

## Paso 6: Configurar Lifecycle Policy (Recomendado)

En tu consola de Wasabi, configura políticas de lifecycle:

1. Ve a tu bucket
2. Selecciona "Lifecycle"
3. Crea una nueva política:
   ```json
   {
     "Rules": [
       {
         "ID": "DeleteTempFiles",
         "Status": "Enabled",
         "Filter": {
           "Prefix": "temp/"
         },
         "Expiration": {
           "Days": 1
         }
       }
     ]
   }
   ```

Esto eliminará automáticamente archivos temporales después de 1 día.

---

## Paso 7: Verificar Implementación

### 7.1 Test de Upload

1. Inicia la aplicación: `npm run dev`
2. Ve a un proceso legal
3. Intenta subir un documento
4. Verifica que:
   - Se muestra el indicador de almacenamiento
   - El upload funciona correctamente
   - La quota se actualiza

### 7.2 Verificar Quota

Ve a tu aplicación y verifica que el indicador de almacenamiento muestra:
- Usuarios Pro: "0 B / 1 GB"
- El porcentaje de uso se actualiza correctamente

---

## 🔧 Solución de Problemas

### Error: "Could not find the function public.pg_execute"

Esto es normal. Aplica la migración manualmente via Dashboard de Supabase (Paso 3).

### Error: "NoSuchBucket"

El bucket no existe en Wasabi. Ve a la consola de Wasabi y créalo.

### Error: "InvalidAccessKeyId"

Las credenciales son incorrectas. Verifica tu Access Key y Secret Key.

### Error: "Storage quota exceeded" para usuarios Pro

Verifica que la migración SQL se aplicó correctamente:

```sql
SELECT plan_type, max_storage_bytes FROM plans WHERE plan_type = 'pro';
-- Debe mostrar: pro, 1073741824
```

---

## 📊 Monitoreo Post-Implementación

### Ver Uso de Almacenamiento

```sql
SELECT * FROM storage_usage_summary;
```

### Verificar Quota por Usuario

```sql
SELECT * FROM check_storage_quota('user-uuid-aqui', 0);
```

---

## ✅ Checklist de Implementación

- [ ] Bucket creado en Wasabi
- [ ] Credenciales configuradas en `.env`
- [ ] Migración SQL aplicada a Supabase
- [ ] Test de conexión exitoso
- [ ] Archivos existentes migrados (si aplica)
- [ ] Lifecycle policy configurada
- [ ] Upload funciona en la aplicación
- [ ] Indicador de quota visible
- [ ] Límite de 1GB funciona para usuarios Pro

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs: `npm run dev` muestra errores en consola
2. Verifica la conexión: `npx ts-node scripts/test-wasabi-connection.ts`
3. Consulta la documentación del plan: `PLAN_REFACTORIZACION_S3_WASABI_COMPLETO.md`
