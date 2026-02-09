# Plan de Refactorización Completo - Migración a Wasabi S3

## Resumen Ejecutivo

Este plan detalla la migración completa de **Supabase Storage** a **Wasabi S3** como fuente única de verdad para el almacenamiento de objetos en ALI (Asistente Legal Inteligente), incluyendo la implementación de límites de almacenamiento por plan (1GB para usuarios Pro).

---

## 📋 Tabla de Contenidos

1. [Arquitectura Objetivo](#arquitectura-objetivo)
2. [Cambios en Base de Datos](#cambios-en-base-de-datos)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Implementación Paso a Paso](#implementación-paso-a-paso)
5. [Sistema de Límites de Almacenamiento](#sistema-de-límites-de-almacenamiento)
6. [Migración de Datos](#migración-de-datos)
7. [Testing y Validación](#testing-y-validación)
8. [Rollback Plan](#rollback-plan)

---

## 🏗️ Arquitectura Objetivo

### Diagrama de Arquitectura Final

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ALI Application                              │
├─────────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js)                                                 │
│  ├─ Components de upload con validación de límites                 │
│  ├─ Indicadores de uso de almacenamiento                           │
│  └─ Barreras de plan para upgrades                                 │
├─────────────────────────────────────────────────────────────────────┤
│  API Layer (Route Handlers)                                         │
│  ├─ /api/files/upload          → Validar quota + Upload S3         │
│  ├─ /api/files/download        → Generar presigned URL             │
│  ├─ /api/files/delete          → Eliminar + Actualizar quota       │
│  ├─ /api/storage/quota         → Estado de almacenamiento          │
│  └─ /api/processes/[id]/upload → Upload con contexto de proceso    │
├─────────────────────────────────────────────────────────────────────┤
│  Service Layer                                                      │
│  ├─ StorageService (Abstracción)                                   │
│  │  ├─ WasabiS3Provider (Implementación principal)                 │
│  │  └─ Interface: upload, delete, getUrl, getQuota                 │
│  ├─ QuotaService (Gestión de límites)                              │
│  │  ├─ checkStorageQuota()                                         │
│  │  ├─ incrementStorageUsage()                                     │
│  │  └─ decrementStorageUsage()                                     │
│  └─ AccessControl (Verificación de permisos)                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Wasabi S3 (Fuente de Verdad)                   │
├─────────────────────────────────────────────────────────────────────┤
│  Bucket: ali-{env}-{region}                                         │
│  ├─ documents/          → Documentos de procesos legales           │
│  ├─ transcriptions/     → Archivos de audio para transcripción     │
│  ├─ workspace-images/   → Avatares y logos de workspaces           │
│  └─ temp/               → Uploads temporales (lifecycle: 24h)      │
├─────────────────────────────────────────────────────────────────────┤
│  Seguridad:                                                         │
│  ✓ Server-Side Encryption (AES-256)                                │
│  ✓ Bucket Policy: Deny all by default                              │
│  ✓ Presigned URLs con expiración configurable                      │
│  ✓ Metadata con user_id, workspace_id, process_id                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL (Metadata)                   │
├─────────────────────────────────────────────────────────────────────┤
│  Tablas:                                                            │
│  ├─ files                    → Registro de archivos                │
│  ├─ process_documents        → Documentos de procesos              │
│  ├─ transcriptions           → Registro de transcripciones         │
│  ├─ storage_quotas           → Tracking de uso por usuario         │
│  └─ plans                    → Configuración de límites por plan   │
├─────────────────────────────────────────────────────────────────────┤
│  Columnas importantes:                                              │
│  - storage_provider: 'wasabi' | 'supabase' (legacy)                │
│  - storage_key: Ruta completa en S3                                │
│  - size_bytes: Tamaño para cálculo de quotas                       │
│  - storage_quota_used: En tabla usage_tracking o profiles          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Cambios en Base de Datos

### 1. Migration: Agregar Soporte para Wasabi S3

```sql
-- ============================================================
-- Migration: 20250209000000_add_wasabi_s3_storage.sql
-- Description: Agregar soporte para Wasabi S3 y sistema de quotas
-- ============================================================

-- 1. Agregar columnas a la tabla files
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS storage_key TEXT,
ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;

-- 2. Agregar columnas a process_documents
ALTER TABLE process_documents 
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS storage_key TEXT,
ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;

-- 3. Crear tabla de quotas de almacenamiento
CREATE TABLE IF NOT EXISTS storage_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Límites del plan
    storage_limit_bytes BIGINT NOT NULL DEFAULT 0,  -- 0 = sin almacenamiento
    
    -- Uso actual
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    documents_count INTEGER NOT NULL DEFAULT 0,
    
    -- Período de facturación
    period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT storage_quotas_user_period_unique UNIQUE (user_id, period_start)
);

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_storage_quotas_user ON storage_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_quotas_period ON storage_quotas(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_files_storage_key ON files(storage_key);
CREATE INDEX IF NOT EXISTS idx_process_docs_storage_key ON process_documents(storage_key);

-- 5. Agregar columna de storage limit a plans
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS max_storage_bytes BIGINT DEFAULT 0;

-- Actualizar planes existentes
UPDATE plans SET max_storage_bytes = 0 WHERE plan_type = 'basic';
UPDATE plans SET max_storage_bytes = 1073741824 WHERE plan_type = 'pro';  -- 1GB
UPDATE plans SET max_storage_bytes = -1 WHERE plan_type = 'enterprise';   -- Ilimitado

-- 6. Agregar columnas a usage_tracking
ALTER TABLE usage_tracking 
ADD COLUMN IF NOT EXISTS storage_bytes_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_bytes_limit BIGINT DEFAULT 0;

-- 7. RLS Policies para storage_quotas
ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own storage quotas"
    ON storage_quotas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can manage storage quotas"
    ON storage_quotas FOR ALL
    USING (true)
    WITH CHECK (true);

-- 8. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_storage_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_storage_quotas_updated_at ON storage_quotas;
CREATE TRIGGER update_storage_quotas_updated_at
    BEFORE UPDATE ON storage_quotas
    FOR EACH ROW EXECUTE FUNCTION update_storage_quotas_updated_at();

-- 9. Función para verificar quota antes de upload
CREATE OR REPLACE FUNCTION check_storage_quota(
    p_user_id UUID,
    p_requested_bytes BIGINT
) RETURNS TABLE (
    allowed BOOLEAN,
    current_usage BIGINT,
    limit_bytes BIGINT,
    remaining_bytes BIGINT,
    message TEXT
) AS $$
DECLARE
    v_current_usage BIGINT;
    v_limit BIGINT;
    v_remaining BIGINT;
BEGIN
    -- Obtener uso actual del período activo
    SELECT COALESCE(sq.storage_used_bytes, 0)
    INTO v_current_usage
    FROM storage_quotas sq
    WHERE sq.user_id = p_user_id
      AND sq.period_start <= NOW()
      AND sq.period_end > NOW()
    ORDER BY sq.period_start DESC
    LIMIT 1;
    
    -- Si no hay registro, buscar en el plan
    SELECT COALESCE(p.max_storage_bytes, 0)
    INTO v_limit
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'trialing')
      AND s.current_period_end > NOW()
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- Si no hay suscripción activa, límite es 0
    IF v_limit IS NULL THEN
        v_limit := 0;
    END IF;
    
    -- Calcular remaining
    v_remaining := v_limit - v_current_usage;
    
    -- Verificar si tiene espacio suficiente
    IF v_limit = -1 THEN
        -- Ilimitado
        RETURN QUERY SELECT 
            TRUE,
            v_current_usage,
            v_limit,
            -1::BIGINT,
            'Almacenamiento ilimitado'::TEXT;
    ELSIF (v_current_usage + p_requested_bytes) <= v_limit THEN
        RETURN QUERY SELECT 
            TRUE,
            v_current_usage,
            v_limit,
            v_remaining,
            'Quota disponible'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            FALSE,
            v_current_usage,
            v_limit,
            GREATEST(0, v_remaining),
            format('Has alcanzado tu límite de almacenamiento. Usado: %s MB de %s MB', 
                   ROUND(v_current_usage::numeric / 1048576, 2),
                   ROUND(v_limit::numeric / 1048576, 2))::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Función para incrementar uso de almacenamiento
CREATE OR REPLACE FUNCTION increment_storage_usage(
    p_user_id UUID,
    p_bytes BIGINT
) RETURNS VOID AS $$
DECLARE
    v_quota_id UUID;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Obtener el período actual
    SELECT sq.id, sq.period_end
    INTO v_quota_id, v_period_end
    FROM storage_quotas sq
    WHERE sq.user_id = p_user_id
      AND sq.period_start <= NOW()
      AND sq.period_end > NOW();
    
    -- Si no existe o el período expiró, crear nuevo
    IF v_quota_id IS NULL OR v_period_end < NOW() THEN
        INSERT INTO storage_quotas (
            user_id,
            storage_limit_bytes,
            period_start,
            period_end
        )
        SELECT 
            p_user_id,
            COALESCE(p.max_storage_bytes, 0),
            s.current_period_start,
            s.current_period_end
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = p_user_id
          AND s.status IN ('active', 'trialing')
        ORDER BY s.created_at DESC
        LIMIT 1
        ON CONFLICT (user_id, period_start) DO UPDATE
        SET storage_limit_bytes = EXCLUDED.storage_limit_bytes;
        
        -- Obtener el ID recién creado
        SELECT id INTO v_quota_id
        FROM storage_quotas
        WHERE user_id = p_user_id
          AND period_start <= NOW()
          AND period_end > NOW();
    END IF;
    
    -- Incrementar uso
    UPDATE storage_quotas
    SET storage_used_bytes = storage_used_bytes + p_bytes,
        documents_count = documents_count + 1
    WHERE id = v_quota_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Función para decrementar uso de almacenamiento
CREATE OR REPLACE FUNCTION decrement_storage_usage(
    p_user_id UUID,
    p_bytes BIGINT
) RETURNS VOID AS $$
BEGIN
    UPDATE storage_quotas
    SET storage_used_bytes = GREATEST(0, storage_used_bytes - p_bytes),
        documents_count = GREATEST(0, documents_count - 1)
    WHERE user_id = p_user_id
      AND period_start <= NOW()
      AND period_end > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger para actualizar uso automáticamente al insertar documento
CREATE OR REPLACE FUNCTION update_storage_on_document_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM increment_storage_usage(NEW.user_id, COALESCE(NEW.size_bytes, 0));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_storage_on_insert ON process_documents;
CREATE TRIGGER trigger_update_storage_on_insert
    AFTER INSERT ON process_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_storage_on_document_insert();

-- 13. Trigger para actualizar uso al eliminar documento
CREATE OR REPLACE FUNCTION update_storage_on_document_delete()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM decrement_storage_usage(OLD.user_id, COALESCE(OLD.size_bytes, 0));
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_storage_on_delete ON process_documents;
CREATE TRIGGER trigger_update_storage_on_delete
    AFTER DELETE ON process_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_storage_on_document_delete();
```

---

## 📁 Estructura de Archivos

### Nuevos Archivos a Crear

```
lib/
├── storage/
│   ├── index.ts                    # Export principal
│   ├── types.ts                    # Interfaces y tipos
│   ├── storage-service.ts          # Servicio de almacenamiento
│   ├── providers/
│   │   ├── index.ts                # Export de providers
│   │   ├── wasabi-s3-provider.ts   # Implementación Wasabi S3
│   │   └── interface.ts            # StorageProvider interface
│   ├── quota-service.ts            # Gestión de quotas
│   └── key-builder.ts              # Constructor de rutas S3
├── server/
│   └── storage/
│       ├── access-control.ts       # Verificación de acceso
│       └── validation.ts           # Validaciones de archivos

db/
├── storage-quotas.ts               # Acceso a datos de quotas
└── storage-migration.ts            # Helper para migración

app/
└── api/
    ├── files/
    │   ├── upload/route.ts         # Upload con validación
    │   ├── download/[id]/route.ts  # Download via presigned URL
    │   ├── delete/[id]/route.ts    # Eliminación
    │   └── quota/route.ts          # Estado de quota
    └── storage/
        └── webhook/route.ts        # Webhooks de lifecycle (opcional)

supabase/
└── migrations/
    └── 20250209000000_add_wasabi_s3_storage.sql

scripts/
├── migrate-storage-to-s3.ts        # Script de migración
├── verify-s3-migration.ts          # Verificación post-migración
└── rollback-s3-migration.ts        # Rollback de emergencia
```

---

## 🔧 Implementación Paso a Paso

### Fase 1: Infraestructura y Configuración (Día 1-2)

#### 1.1 Instalar Dependencias

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/lib-storage
npm install -D @types/uuid
```

#### 1.2 Configurar Variables de Entorno

```bash
# .env.local

# ==========================================
# WASABI S3 CONFIGURATION
# ==========================================
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_REGION=us-east-1
WASABI_BUCKET=ali-prod-us-east-1
WASABI_ACCESS_KEY_ID=your_access_key_here
WASABI_SECRET_ACCESS_KEY=your_secret_key_here

# Upload Configuration
WASABI_MAX_FILE_SIZE_MB=50
WASABI_MAX_AUDIO_SIZE_MB=100
WASABI_PRESIGNED_URL_EXPIRY_SECONDS=3600
WASABI_MULTIPART_THRESHOLD_MB=5

# Feature Flags
ENABLE_WASABI_STORAGE=true
STORAGE_PROVIDER=wasabi  # wasabi | supabase
```

### Fase 2: Implementar Core de Almacenamiento (Día 2-4)

#### 2.1 Definir Interfaces

```typescript
// lib/storage/types.ts

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  maxFileSizeMB: number;
  presignedUrlExpirySeconds: number;
}

export interface UploadFileParams {
  file: Buffer | Uint8Array | ReadableStream;
  key: string;
  contentType: string;
  metadata?: Record<string, string>;
  userId: string;
  workspaceId?: string;
  processId?: string;
}

export interface UploadResult {
  key: string;
  etag: string;
  location: string;
  size: number;
  metadata?: Record<string, string>;
}

export interface StorageQuota {
  userId: string;
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  isUnlimited: boolean;
  documentsCount: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  message: string;
}

export interface StorageProvider {
  upload(params: UploadFileParams): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getDownloadUrl(key: string, expiresIn?: number): Promise<string>;
  getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    metadata: Record<string, string>;
  }>;
  exists(key: string): Promise<boolean>;
}
```

#### 2.2 Implementar Cliente Wasabi S3

```typescript
// lib/storage/providers/wasabi-s3-provider.ts

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { StorageProvider, UploadFileParams, UploadResult } from '../types';

export class WasabiS3Provider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private multipartThreshold: number;

  constructor(config: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    multipartThresholdMB?: number;
  }) {
    this.bucket = config.bucket;
    this.multipartThreshold = (config.multipartThresholdMB || 5) * 1024 * 1024;

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
      maxAttempts: 3,
    });
  }

  async upload(params: UploadFileParams): Promise<UploadResult> {
    const fileSize = this.getFileSize(params.file);
    
    const metadata = {
      'user-id': params.userId,
      'upload-date': new Date().toISOString(),
      ...(params.workspaceId && { 'workspace-id': params.workspaceId }),
      ...(params.processId && { 'process-id': params.processId }),
      ...(params.metadata || {}),
    };

    try {
      let result;

      if (fileSize > this.multipartThreshold) {
        result = await this.uploadMultipart(params, metadata);
      } else {
        result = await this.uploadSingle(params, metadata);
      }

      return {
        key: params.key,
        etag: result.ETag || '',
        location: `s3://${this.bucket}/${params.key}`,
        size: fileSize,
        metadata,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async uploadSingle(
    params: UploadFileParams,
    metadata: Record<string, string>
  ): Promise<{ ETag?: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      Body: params.file,
      ContentType: params.contentType,
      Metadata: metadata,
      ServerSideEncryption: 'AES256',
    });

    return this.client.send(command);
  }

  private async uploadMultipart(
    params: UploadFileParams,
    metadata: Record<string, string>
  ): Promise<{ ETag?: string }> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: params.key,
        Body: params.file,
        ContentType: params.contentType,
        Metadata: metadata,
        ServerSideEncryption: 'AES256',
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024, // 5MB
    });

    const result = await upload.done();
    return { ETag: result.ETag };
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: 'attachment',
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getFileMetadata(key: string) {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    };
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  private getFileSize(file: Buffer | Uint8Array | ReadableStream): number {
    if (file instanceof Buffer) {
      return file.length;
    }
    if (file instanceof Uint8Array) {
      return file.byteLength;
    }
    // Para streams, se requiere conocer el tamaño de antemano
    return 0;
  }
}
```

#### 2.3 Implementar QuotaService

```typescript
// lib/storage/quota-service.ts

import { getSupabaseServer } from '@/lib/supabase/server-client';
import { StorageQuota, QuotaCheckResult, UploadFileParams } from './types';

export class QuotaService {
  async checkQuota(
    userId: string,
    requestedBytes: number
  ): Promise<QuotaCheckResult> {
    const supabase = getSupabaseServer();
    
    const { data, error } = await supabase.rpc('check_storage_quota', {
      p_user_id: userId,
      p_requested_bytes: requestedBytes,
    });

    if (error) {
      console.error('Error checking quota:', error);
      throw new Error('Failed to check storage quota');
    }

    const result = data?.[0];
    
    return {
      allowed: result?.allowed ?? false,
      currentUsage: Number(result?.current_usage ?? 0),
      limit: Number(result?.limit_bytes ?? 0),
      remaining: Number(result?.remaining_bytes ?? 0),
      message: result?.message || 'Error checking quota',
    };
  }

  async incrementUsage(userId: string, bytes: number): Promise<void> {
    const supabase = getSupabaseServer();
    
    const { error } = await supabase.rpc('increment_storage_usage', {
      p_user_id: userId,
      p_bytes: bytes,
    });

    if (error) {
      console.error('Error incrementing storage usage:', error);
      throw new Error('Failed to update storage usage');
    }
  }

  async decrementUsage(userId: string, bytes: number): Promise<void> {
    const supabase = getSupabaseServer();
    
    const { error } = await supabase.rpc('decrement_storage_usage', {
      p_user_id: userId,
      p_bytes: bytes,
    });

    if (error) {
      console.error('Error decrementing storage usage:', error);
      // No lanzar error aquí para no fallar la eliminación
    }
  }

  async getQuotaStatus(userId: string): Promise<StorageQuota | null> {
    const supabase = getSupabaseServer();
    
    const { data, error } = await supabase
      .from('storage_quotas')
      .select('*')
      .eq('user_id', userId)
      .lte('period_start', new Date().toISOString())
      .gt('period_end', new Date().toISOString())
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      userId: data.user_id,
      usedBytes: data.storage_used_bytes,
      limitBytes: data.storage_limit_bytes,
      remainingBytes: data.storage_limit_bytes === -1 
        ? -1 
        : Math.max(0, data.storage_limit_bytes - data.storage_used_bytes),
      isUnlimited: data.storage_limit_bytes === -1,
      documentsCount: data.documents_count,
      periodStart: new Date(data.period_start),
      periodEnd: new Date(data.period_end),
    };
  }

  formatBytes(bytes: number): string {
    if (bytes === -1) return 'Ilimitado';
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const quotaService = new QuotaService();
```

#### 2.4 Implementar StorageService

```typescript
// lib/storage/storage-service.ts

import { WasabiS3Provider } from './providers/wasabi-s3-provider';
import { QuotaService } from './quota-service';
import { StorageProvider, UploadFileParams, UploadResult, StorageQuota, QuotaCheckResult } from './types';
import { S3KeyBuilder } from './key-builder';

export interface StorageServiceConfig {
  provider: 'wasabi' | 'supabase';
  wasabiConfig?: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export class StorageService {
  private provider: StorageProvider;
  private quotaService: QuotaService;

  constructor(config: StorageServiceConfig) {
    if (config.provider === 'wasabi' && config.wasabiConfig) {
      this.provider = new WasabiS3Provider(config.wasabiConfig);
    } else {
      throw new Error('Invalid storage configuration');
    }
    
    this.quotaService = new QuotaService();
  }

  /**
   * Upload file with quota validation
   */
  async uploadFile(params: UploadFileParams & { 
    skipQuotaCheck?: boolean 
  }): Promise<UploadResult> {
    // 1. Check quota unless skipped (for migrations)
    if (!params.skipQuotaCheck) {
      const quotaCheck = await this.quotaService.checkQuota(
        params.userId,
        this.getFileSize(params.file)
      );

      if (!quotaCheck.allowed) {
        throw new Error(`Storage quota exceeded: ${quotaCheck.message}`);
      }
    }

    // 2. Upload to storage
    const result = await this.provider.upload(params);

    // 3. Increment usage
    try {
      await this.quotaService.incrementUsage(params.userId, result.size);
    } catch (error) {
      // If quota update fails, we should rollback the upload
      await this.provider.delete(result.key).catch(console.error);
      throw new Error('Failed to update storage quota after upload');
    }

    return result;
  }

  /**
   * Delete file and update quota
   */
  async deleteFile(params: {
    key: string;
    userId: string;
    sizeBytes: number;
  }): Promise<void> {
    // 1. Delete from storage
    await this.provider.delete(params.key);

    // 2. Update quota
    await this.quotaService.decrementUsage(params.userId, params.sizeBytes);
  }

  /**
   * Get download URL
   */
  async getDownloadUrl(key: string, expiresIn?: number): Promise<string> {
    return this.provider.getDownloadUrl(key, expiresIn);
  }

  /**
   * Check quota status
   */
  async checkQuota(userId: string, requestedBytes: number): Promise<QuotaCheckResult> {
    return this.quotaService.checkQuota(userId, requestedBytes);
  }

  /**
   * Get full quota status
   */
  async getQuotaStatus(userId: string): Promise<StorageQuota | null> {
    return this.quotaService.getQuotaStatus(userId);
  }

  /**
   * Get file metadata from storage
   */
  async getFileMetadata(key: string) {
    return this.provider.getFileMetadata(key);
  }

  private getFileSize(file: Buffer | Uint8Array | ReadableStream): number {
    if (file instanceof Buffer) return file.length;
    if (file instanceof Uint8Array) return file.byteLength;
    return 0;
  }
}

// Factory function
export function createStorageService(): StorageService {
  const provider = process.env.STORAGE_PROVIDER as 'wasabi' | 'supabase';
  
  if (provider === 'wasabi') {
    return new StorageService({
      provider: 'wasabi',
      wasabiConfig: {
        endpoint: process.env.WASABI_ENDPOINT!,
        region: process.env.WASABI_REGION!,
        bucket: process.env.WASABI_BUCKET!,
        accessKeyId: process.env.WASABI_ACCESS_KEY_ID!,
        secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY!,
      },
    });
  }
  
  throw new Error(`Unsupported storage provider: ${provider}`);
}

// Singleton instance
export const storageService = createStorageService();
```

#### 2.5 Key Builder

```typescript
// lib/storage/key-builder.ts

export interface S3KeyOptions {
  workspaceId: string;
  processId?: string;
  documentId?: string;
  userId?: string;
  fileName?: string;
}

export class S3KeyBuilder {
  private static readonly PREFIXES = {
    DOCUMENTS: 'documents',
    TRANSCRIPTIONS: 'transcriptions',
    WORKSPACE_IMAGES: 'workspace-images',
    TEMP: 'temp',
  } as const;

  /**
   * Build S3 key for process document
   * Format: documents/workspaces/{workspaceId}/processes/{processId}/{documentId}.{ext}
   */
  static buildDocumentKey(options: S3KeyOptions): string {
    const extension = options.fileName 
      ? options.fileName.split('.').pop() 
      : 'bin';
    
    const parts = [
      this.PREFIXES.DOCUMENTS,
      'workspaces',
      options.workspaceId,
      'processes',
      options.processId || 'general',
      `${options.documentId || crypto.randomUUID()}.${extension}`,
    ];

    return parts.join('/');
  }

  /**
   * Build S3 key for transcription audio
   * Format: transcriptions/workspaces/{workspaceId}/{transcriptionId}.{ext}
   */
  static buildTranscriptionKey(options: {
    workspaceId: string;
    transcriptionId: string;
    extension: string;
  }): string {
    return [
      this.PREFIXES.TRANSCRIPTIONS,
      'workspaces',
      options.workspaceId,
      `${options.transcriptionId}.${options.extension}`,
    ].join('/');
  }

  /**
   * Build S3 key for workspace image
   * Format: workspace-images/{workspaceId}.{ext}
   */
  static buildWorkspaceImageKey(options: {
    workspaceId: string;
    extension: string;
  }): string {
    return [
      this.PREFIXES.WORKSPACE_IMAGES,
      `${options.workspaceId}.${options.extension}`,
    ]..join('/');
  }

  /**
   * Parse S3 key to extract metadata
   */
  static parseKey(key: string): {
    type: 'document' | 'transcription' | 'workspace-image' | 'temp';
    workspaceId?: string;
    processId?: string;
    documentId?: string;
    extension?: string;
  } {
    const parts = key.split('/');
    const filename = parts[parts.length - 1];
    const extension = filename.includes('.') 
      ? filename.split('.').pop() 
      : undefined;

    if (parts[0] === this.PREFIXES.DOCUMENTS) {
      return {
        type: 'document',
        workspaceId: parts[2],
        processId: parts[4] !== 'general' ? parts[4] : undefined,
        documentId: filename.split('.')[0],
        extension,
      };
    }

    if (parts[0] === this.PREFIXES.TRANSCRIPTIONS) {
      return {
        type: 'transcription',
        workspaceId: parts[2],
        documentId: filename.split('.')[0],
        extension,
      };
    }

    if (parts[0] === this.PREFIXES.WORKSPACE_IMAGES) {
      return {
        type: 'workspace-image',
        workspaceId: filename.split('.')[0],
        extension,
      };
    }

    return { type: 'temp' };
  }
}
```

### Fase 3: API Endpoints (Día 4-5)

#### 3.1 Upload Endpoint

```typescript
// app/api/files/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { storageService } from '@/lib/storage/storage-service';
import { S3KeyBuilder } from '@/lib/storage/key-builder';
import { z } from 'zod';

const uploadSchema = z.object({
  workspaceId: z.string().uuid(),
  processId: z.string().uuid().optional(),
});

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const workspaceId = formData.get('workspaceId') as string;
    const processId = formData.get('processId') as string | undefined;

    if (!file || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing file or workspaceId' },
        { status: 400 }
      );
    }

    // 3. Validate file
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // 4. Check quota BEFORE processing
    const quotaCheck = await storageService.checkQuota(user.id, file.size);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Storage quota exceeded',
          details: quotaCheck.message,
          currentUsage: quotaCheck.currentUsage,
          limit: quotaCheck.limit,
          remaining: quotaCheck.remaining,
        },
        { status: 403 }
      );
    }

    // 5. Build S3 key
    const documentId = crypto.randomUUID();
    const s3Key = S3KeyBuilder.buildDocumentKey({
      workspaceId,
      processId,
      documentId,
      userId: user.id,
      fileName: file.name,
    });

    // 6. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 7. Upload to S3
    const uploadResult = await storageService.uploadFile({
      file: buffer,
      key: s3Key,
      contentType: file.type,
      metadata: {
        'original-filename': file.name,
        'uploaded-by': user.id,
      },
      userId: user.id,
      workspaceId,
      processId,
    });

    // 8. Create database record
    const { data: document, error: dbError } = await supabase
      .from('process_documents')
      .insert({
        id: documentId,
        process_id: processId,
        user_id: user.id,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_provider: 'wasabi',
        storage_key: s3Key,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete from S3
      await storageService.deleteFile({
        key: s3Key,
        userId: user.id,
        sizeBytes: file.size,
      }).catch(console.error);

      throw dbError;
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.file_name,
        size: document.size_bytes,
        storageKey: document.storage_key,
      },
      quota: {
        used: quotaCheck.currentUsage + file.size,
        limit: quotaCheck.limit,
        remaining: quotaCheck.remaining - file.size,
      },
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    );
  }
}
```

#### 3.2 Quota Status Endpoint

```typescript
// app/api/storage/quota/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { storageService } from '@/lib/storage/storage-service';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quota = await storageService.getQuotaStatus(user.id);

    if (!quota) {
      return NextResponse.json({
        usedBytes: 0,
        limitBytes: 0,
        remainingBytes: 0,
        isUnlimited: false,
        documentsCount: 0,
        usagePercentage: 0,
      });
    }

    const usagePercentage = quota.isUnlimited 
      ? 0 
      : quota.limitBytes > 0 
        ? (quota.usedBytes / quota.limitBytes) * 100 
        : 0;

    return NextResponse.json({
      usedBytes: quota.usedBytes,
      limitBytes: quota.limitBytes,
      remainingBytes: quota.remainingBytes,
      isUnlimited: quota.isUnlimited,
      documentsCount: quota.documentsCount,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      formatted: {
        used: formatBytes(quota.usedBytes),
        limit: formatBytes(quota.limitBytes),
        remaining: formatBytes(quota.remainingBytes),
      },
    });

  } catch (error: any) {
    console.error('Error fetching quota:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quota' },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === -1) return 'Ilimitado';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

### Fase 4: Componentes UI (Día 5-6)

#### 4.1 Storage Indicator Component

```typescript
// components/storage/storage-indicator.tsx

'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, HardDrive } from 'lucide-react';

interface QuotaStatus {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  isUnlimited: boolean;
  documentsCount: number;
  usagePercentage: number;
  formatted: {
    used: string;
    limit: string;
    remaining: string;
  };
}

export function StorageIndicator() {
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      const response = await fetch('/api/storage/quota');
      if (response.ok) {
        const data = await response.json();
        setQuota(data);
      }
    } catch (error) {
      console.error('Error fetching quota:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-8 w-32 bg-gray-100 animate-pulse rounded" />;
  }

  if (!quota || quota.isUnlimited) {
    return null;
  }

  const isNearLimit = quota.usagePercentage > 80;
  const isAtLimit = quota.usagePercentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <HardDrive className="w-4 h-4" />
        <span>
          {quota.formatted.used} / {quota.formatted.limit}
        </span>
        <span className="text-xs text-gray-400">
          ({quota.documentsCount} archivos)
        </span>
      </div>
      
      <Progress 
        value={quota.usagePercentage} 
        className={`h-2 ${isNearLimit ? 'bg-red-100' : ''}`}
      />

      {isNearLimit && !isAtLimit && (
        <Alert variant="warning" className="py-2">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Estás usando {quota.usagePercentage.toFixed(0)}% de tu almacenamiento.
          </AlertDescription>
        </Alert>
      )}

      {isAtLimit && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Has alcanzado tu límite de almacenamiento. 
            <a href="/precios" className="underline ml-1">
              Actualiza tu plan
            </a>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

---

## 📊 Sistema de Límites de Almacenamiento

### Resumen de Límites por Plan

| Plan | Almacenamiento | Procesos | Transcripciones | Workspaces |
|------|----------------|----------|-----------------|------------|
| Basic | 0 MB (solo chat) | 0 | 0 | 1 |
| Pro | **1 GB** | Ilimitados | 10h/mes | Ilimitados |
| Enterprise | Ilimitado | Ilimitados | Ilimitado | Ilimitados |

### Comportamiento del Sistema

1. **Pre-upload Validation**: Se verifica la quota ANTES de permitir el upload
2. **Atomic Operations**: Upload + actualización de quota en transacción
3. **Rollback Automático**: Si falla la DB, se elimina el archivo de S3
4. **Soft Delete**: Al eliminar un documento, se libera la quota

---

## 🔄 Migración de Datos

### Script de Migración

```typescript
// scripts/migrate-storage-to-s3.ts

import { createClient } from '@supabase/supabase-js';
import { storageService } from '../lib/storage/storage-service';
import { S3KeyBuilder } from '../lib/storage/key-builder';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MigrationResult {
  success: boolean;
  documentId: string;
  oldPath: string;
  newKey: string;
  error?: string;
}

export class StorageMigration {
  private results: MigrationResult[] = [];
  private batchSize = 20;

  async migrateAll(): Promise<void> {
    console.log('🚀 Starting migration to Wasabi S3...\n');

    // 1. Get all documents from Supabase Storage
    const { data: documents, error } = await supabase
      .from('process_documents')
      .select('id, process_id, user_id, storage_path, file_name, size_bytes, mime_type')
      .eq('storage_provider', 'supabase')
      .or('storage_provider.is.null');

    if (error) {
      console.error('❌ Failed to fetch documents:', error);
      throw error;
    }

    console.log(`📦 Found ${documents.length} documents to migrate\n`);

    // 2. Process in batches
    for (let i = 0; i < documents.length; i += this.batchSize) {
      const batch = documents.slice(i, i + this.batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(documents.length / this.batchSize)}`);
      
      await this.processBatch(batch);
    }

    this.printReport();
  }

  private async processBatch(documents: any[]): Promise<void> {
    for (const doc of documents) {
      await this.migrateDocument(doc);
    }
  }

  private async migrateDocument(doc: any): Promise<void> {
    try {
      // 1. Get workspace ID
      const { data: process } = await supabase
        .from('processes')
        .select('workspace_id')
        .eq('id', doc.process_id)
        .single();

      if (!process) {
        throw new Error('Process not found');
      }

      // 2. Download from Supabase Storage
      console.log(`  ⬇️  Downloading: ${doc.file_name}`);
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('files')
        .download(doc.storage_path);

      if (downloadError || !fileData) {
        throw new Error(`Download failed: ${downloadError?.message}`);
      }

      // 3. Convert to buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 4. Build S3 key
      const extension = doc.file_name.split('.').pop();
      const s3Key = S3KeyBuilder.buildDocumentKey({
        workspaceId: process.workspace_id,
        processId: doc.process_id,
        documentId: doc.id,
        userId: doc.user_id,
        fileName: doc.file_name,
      });

      // 5. Upload to S3 (skip quota check for migration)
      console.log(`  ⬆️  Uploading to S3: ${s3Key}`);
      const uploadResult = await storageService.uploadFile({
        file: buffer,
        key: s3Key,
        contentType: doc.mime_type || 'application/octet-stream',
        metadata: {
          'migrated-from': 'supabase',
          'migration-date': new Date().toISOString(),
          'original-path': doc.storage_path,
        },
        userId: doc.user_id,
        workspaceId: process.workspace_id,
        processId: doc.process_id,
        skipQuotaCheck: true, // Skip for migration
      });

      // 6. Update database
      const { error: updateError } = await supabase
        .from('process_documents')
        .update({
          storage_provider: 'wasabi',
          storage_key: s3Key,
        })
        .eq('id', doc.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      // 7. Record success
      this.results.push({
        success: true,
        documentId: doc.id,
        oldPath: doc.storage_path,
        newKey: s3Key,
      });

      console.log(`  ✅ Migrated: ${doc.file_name}`);

    } catch (error: any) {
      this.results.push({
        success: false,
        documentId: doc.id,
        oldPath: doc.storage_path,
        newKey: '',
        error: error.message,
      });

      console.error(`  ❌ Failed: ${doc.file_name} - ${error.message}`);
    }
  }

  private printReport(): void {
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION REPORT');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📈 Success Rate: ${((successful.length / this.results.length) * 100).toFixed(2)}%`);

    if (failed.length > 0) {
      console.log('\n❌ Failed Documents:');
      failed.forEach(r => {
        console.log(`  - ${r.documentId}: ${r.error}`);
      });
    }

    console.log('='.repeat(60) + '\n');
  }
}

// Run migration
async function main() {
  const migration = new StorageMigration();
  await migration.migrateAll();
}

main().catch(console.error);
```

---

## ✅ Testing y Validación

### Checklist de Testing

- [ ] **Upload básico**
  - [ ] Archivo < 5MB (upload simple)
  - [ ] Archivo > 5MB (multipart upload)
  - [ ] Validación de tipo de archivo
  - [ ] Validación de tamaño máximo
  
- [ ] **Sistema de Quotas**
  - [ ] Bloqueo cuando se alcanza límite
  - [ ] Mensaje informativo de límite alcanzado
  - [ ] Liberación de quota al eliminar archivo
  - [ ] Actualización correcta de usage
  
- [ ] **Seguridad**
  - [ ] Presigned URLs expiran correctamente
  - [ ] No se puede acceder a archivos de otros usuarios
  - [ ] Validación de workspace access
  
- [ ] **Migración**
  - [ ] Script de migración completa sin errores
  - [ ] Integridad de datos verificada
  - [ ] Rollback funciona correctamente

---

## 🔄 Rollback Plan

### Condiciones para Rollback

1. Error rate > 5% en uploads
2. Pérdida de datos
3. Problemas de seguridad críticos
4. Costos inesperados

### Procedimiento

```bash
# 1. Cambiar feature flag
STORAGE_PROVIDER=supabase

# 2. Redeploy
npm run deploy

# 3. Verificar que uploads van a Supabase

# 4. Mantener datos en Wasabi por 30 días antes de eliminar
```

---

## 📅 Timeline Estimado

| Fase | Duración | Responsable |
|------|----------|-------------|
| 1. Infraestructura | 2 días | DevOps |
| 2. Core Storage | 3 días | Backend |
| 3. API Endpoints | 2 días | Backend |
| 4. UI Components | 2 días | Frontend |
| 5. Testing | 2 días | QA |
| 6. Migración | 1 día | Backend |
| **Total** | **12 días** | |

---

## 🎯 Métricas de Éxito

- 100% de uploads exitosos post-migración
- Tiempo de upload ≤ tiempo anterior (Supabase)
- 0 pérdida de datos
- Usuarios informados de su uso de almacenamiento
- Costo de almacenamiento reducido en 80%
