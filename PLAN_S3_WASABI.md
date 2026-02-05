# Plan de Migración a Wasabi S3 - ALI (Asistente Legal Inteligente)

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Arquitectura de Almacenamiento](#arquitectura-de-almacenamiento)
3. [Estructura de Buckets y Organización](#estructura-de-buckets-y-organización)
4. [Sistema de Permisos y Seguridad](#sistema-de-permisos-y-seguridad)
5. [Implementación Técnica](#implementación-técnica)
6. [Migración de Datos](#migración-de-datos)
7. [Configuración de Wasabi](#configuración-de-wasabi)
8. [Testing y Validación](#testing-y-validación)
9. [Rollback Plan](#rollback-plan)

---

## 🎯 Visión General

### Objetivo
Establecer **Wasabi S3** como la fuente única de verdad para el almacenamiento de objetos en ALI, reemplazando Supabase Storage mientras se mantiene la compatibilidad con los sistemas existentes de RAG, transcripciones y gestión de documentos.

### Alcance
- ✅ Documentos de procesos legales (PDF, DOCX, TXT, CSV, JSON)
- ✅ Archivos de audio para transcripciones (MP3, WAV, M4A, OGG)
- ✅ Imágenes de workspace (avatars, logos)
- ✅ Metadatos y control de versiones
- ✅ URLs firmadas para acceso temporal

### Beneficios Esperados
- 💰 **Costo**: 80% más económico que Supabase Storage ($6/TB vs $0.021/GB)
- ⚡ **Performance**: Uploads más rápidos con S3 Transfer Acceleration
- 🔒 **Seguridad**: Control granular con IAM policies y bucket policies
- 📊 **Escalabilidad**: Sin límites estrictos de tamaño
- 🔄 **Portabilidad**: Compatible con cualquier servicio S3-compliant

---

## 🏗️ Arquitectura de Almacenamiento

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         ALI Application                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Components                                            │
│  ├─ DocumentUploadZone                                          │
│  ├─ FilePicker                                                  │
│  └─ ProcessDocuments                                            │
├─────────────────────────────────────────────────────────────────┤
│  API Layer (Next.js Route Handlers)                             │
│  ├─ /api/processes/[processId]/upload          → Upload Handler │
│  ├─ /api/processes/[processId]/documents       → Download/Delet │
│  ├─ /api/transcriptions/upload              → Audio Upload     │
│  └─ /api/workspace/[workspaceId]/settings     → Image Upload    │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer                                                  │
│  ├─ S3Service (New)                                            │
│  │  ├─ uploadFile()                                           │
│  │  ├─ getFile()                                              │
│  │  ├─ deleteFile()                                           │
│  │  ├─ generatePresignedUrl()                                  │
│  │  └─ listFiles()                                            │
│  ├─ Access Control (lib/server/access/)                       │
│  └─ Database (Supabase Postgres)                              │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Wasabi S3 (Cloud Storage)                  │
├─────────────────────────────────────────────────────────────────┤
│  Bucket: ali-prod-{region}                                      │
│  ├─ Prefix: documents/                                         │
│  │  ├─ workspaces/{workspace_id}/                              │
│  │  │  ├─ processes/{process_id}/                              │
│  │  │  │  ├─ documents/{document_id}.{ext}                     │
│  │  │  │  └─ versions/{version_id}/                           │
│  │  │  └─ uploads/{user_id}/{temp_id}/                        │
│  ├─ Prefix: transcriptions/                                    │
│  │  └─ workspaces/{workspace_id}/                              │
│  │      └─ {transcription_id}.{ext}                           │
│  └─ Prefix: workspace-images/                                  │
│      └─ {workspace_id}.{ext}                                  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL (Metadata)               │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                        │
│  ├─ process_documents (file_path → S3 key)                     │
│  ├─ process_document_sections (chunks + embeddings)             │
│  ├─ transcriptions (audio_file_path → S3 key)                  │
│  └─ workspaces (image_path → S3 key)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

```typescript
// Nuevas dependencias requeridas
{
  "@aws-sdk/client-s3": "^3.x",           // Cliente S3 principal
  "@aws-sdk/s3-request-presigner": "^3.x", // URLs firmadas
  "@aws-sdk/lib-storage": "^3.x",         // Uploads multipart
  "aws-sdk-lite": "..."                   // Cliente optimizado
}
```

---

## 📁 Estructura de Buckets y Organización

### Estrategia de Naming

#### 1. Nombre del Bucket
```
ali-prod-us-east-1  // Producción
ali-dev-us-east-1   // Desarrollo
ali-staging-us-east-1 // Staging
```

**Formato**: `{app}-{environment}-{region}`

**Consideraciones**:
- ✅ Globalmente único (requerido por S3)
- ✅ Fácil de identificar por entorno
- ✅ Compatible con todas las regiones de Wasabi
- ✅ No contiene información sensible

#### 2. Estructura de Prefixes (Directorios)

```typescript
// Estructura de directorios en S3
const S3_PREFIXES = {
  DOCUMENTS: 'documents',
  TRANSCRIPTIONS: 'transcriptions',
  WORKSPACE_IMAGES: 'workspace-images',
  TEMPORARY: 'temporary',
  ARCHIVE: 'archive'
} as const;

// Estructura completa para un documento
// documents/workspaces/{workspace_id}/processes/{process_id}/documents/{document_id}.pdf
```

### Organización Detallada

#### A. Prefix: `documents/`
```
documents/
├─ workspaces/
│  ├─ {workspace_id}/
│  │  ├─ processes/
│  │  │  ├─ {process_id}/
│  │  │  │  ├─ documents/
│  │  │  │  │  ├─ {document_id}.pdf
│  │  │  │  │  ├─ {document_id}.docx
│  │  │  │  │  └─ {document_id}_metadata.json
│  │  │  │  └─ versions/
│  │  │  │     ├─ v1/{document_id}.pdf
│  │  │  │     └─ v2/{document_id}.pdf
│  │  │  └─ uploads/
│  │  │     └─ {user_id}/
│  │  │        └─ {temp_upload_id}/
│  │  │           ├─ chunk.001
│  │  │           └─ chunk.002
│  │  └─ shared/
│  │     └─ {shared_doc_id}.pdf
│  └─ _templates/
│     └─ {template_id}.pdf
└─ _system/
   └─ .well-known/
      └─ storage-config.json
```

#### B. Prefix: `transcriptions/`
```
transcriptions/
└─ workspaces/
   └─ {workspace_id}/
      ├─ pending/
      │  └─ {transcription_id}.mp3
      ├─ processing/
      │  └─ {transcription_id}.mp3
      └─ completed/
         ├─ {transcription_id}.mp3
         └─ {transcription_id}.vtt
```

#### C. Prefix: `workspace-images/`
```
workspace-images/
├─ {workspace_id}.png
├─ {workspace_id}.jpg
└─ _defaults/
   └─ default-workspace-avatar.png
```

#### D. Prefix: `temporary/` (Uploads en curso)
```
temporary/
└─ uploads/
   └─ {user_id}/
      └─ {session_id}/
         ├─ {chunk_id}.part
         └─ metadata.json
```

### Convenciones de Naming

#### Archivos de Documentos
```typescript
// Formato: {document_id}.{extension}
// Ejemplos:
// 550e8400-e29b-41d4-a716-446655440000.pdf
// 550e8400-e29b-41d4-a716-446655440000.docx

// Versiones
// Formato: v{version_number}/{document_id}.{extension}
// Ejemplos:
// v1/550e8400-e29b-41d4-a716-446655440000.pdf
// v2/550e8400-e29b-41d4-a716-446655440000.pdf
```

#### Archivos de Transcripción
```typescript
// Formato: {transcription_id}.{extension}
// Ejemplos:
// a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp3
// a1b2c3d4-e5f6-7890-abcd-ef1234567890.vtt
```

#### Imágenes de Workspace
```typescript
// Formato: {workspace_id}.{extension}
// Ejemplos:
// workspace_abc123.png
// workspace_xyz789.jpg
```

### Metadatos de Objetos S3

Cada objeto en S3 tendrá los siguientes metadatos:

```typescript
interface S3ObjectMetadata {
  // Metadatos estándar S3
  "Content-Type": string;           // "application/pdf"
  "Content-Length": number;         // 1024000

  // Metadatos personalizados (x-amz-meta-*)
  "x-amz-meta-user-id": string;            // UUID del usuario
  "x-amz-meta-workspace-id": string;       // UUID del workspace
  "x-amz-meta-process-id": string;         // UUID del proceso (si aplica)
  "x-amz-meta-document-id": string;        // UUID del documento (si aplica)
  "x-amz-meta-file-name": string;          // Nombre original del archivo
  "x-amz-meta-file-size": string;          // Tamaño en bytes
  "x-amz-meta-upload-date": string;        // ISO 8601 timestamp
  "x-amz-meta-content-hash": string;       // SHA-256 hash
  "x-amz-meta-version": string;            // "1", "2", etc. (si aplica)

  // Etiquetas (para gestión de ciclo de vida)
  "x-amz-tagging": string;                 // "Environment=prod&Type=document"
}
```

---

## 🔐 Sistema de Permisos y Seguridad

### Modelo de Seguridad en Capas

```
┌─────────────────────────────────────────────────────────────┐
│ CAPA 1: Red e Infraestructura                                │
│ - HTTPS obligatorio (TLS 1.2+)                              │
│ - VPC endpoints (si usas AWS VPC)                           │
│ - IP whitelisting (opcional)                                │
├─────────────────────────────────────────────────────────────┤
│ CAPA 2: Autenticación IAM                                    │
│ - Access Keys con rotación automática                       │
│ - IAM Roles para servicios backend                          │
│ - MFA para operaciones administrativas                      │
├─────────────────────────────────────────────────────────────┤
│ CAPA 3: Bucket Policies                                      │
│ - Deny all por defecto                                      │
│ - Allow explícito por patrón de ruta                        │
│ - Restricción por IP (opcional)                             │
├─────────────────────────────────────────────────────────────┤
│ CAPA 4: Application Access Control                           │
│ - Verificación en PostgreSQL (RLS)                          │
│ - Validación de ownership en API layer                      │
│ - Presigned URLs con expiración                             │
└─────────────────────────────────────────────────────────────┘
```

### Bucket Policy (Wasabi S3)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyAllByDefault",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::ali-prod-us-east-1",
        "arn:aws:s3:::ali-prod-us-east-1/*"
      ]
    },
    {
      "Sid": "AllowApplicationAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/ali-app-user"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectAcl",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::ali-prod-us-east-1",
        "arn:aws:s3:::ali-prod-us-east-1/*"
      ],
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": [
            "YOUR_VPS_IP/32"
          ]
        }
      }
    },
    {
      "Sid": "AllowPresignedUrls",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ali-prod-us-east-1/documents/*",
      "Condition": {
        "StringLike": {
          "aws:Referer": "https://yourdomain.com/*"
        }
      }
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::ali-prod-us-east-1",
        "arn:aws:s3:::ali-prod-us-east-1/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "RequireEncryption",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::ali-prod-us-east-1/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

### IAM Policy para Usuario de Aplicación

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowFullBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectAcl",
        "s3:PutObjectAcl",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts",
        "s3:ListBucketMultipartUploads"
      ],
      "Resource": [
        "arn:aws:s3:::ali-prod-us-east-1",
        "arn:aws:s3:::ali-prod-us-east-1/*"
      ]
    },
    {
      "Sid": "AllowPresignedUrlGeneration",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::ali-prod-us-east-1/*",
      "Condition": {
        "StringEquals": {
          "s3:prefix": [
            "documents/workspaces/*/processes/*/documents/*",
            "transcriptions/workspaces/*",
            "workspace-images/*"
          ]
        }
      }
    }
  ]
}
```

### Control de Acceso a Nivel de Aplicación

```typescript
// lib/server/s3/access-control.ts

import { getUser } from './auth';
import { canAccessWorkspace } from '../access/workspaces';
import { canAccessProcess } from '../access/processes';

export async function verifyS3Access({
  userId,
  workspaceId,
  processId,
  operation, // 'read' | 'write' | 'delete'
  s3Key
}: {
  userId: string;
  workspaceId?: string;
  processId?: string;
  operation: 'read' | 'write' | 'delete';
  s3Key: string;
}) {
  // 1. Verificar autenticación
  const user = await getUser(userId);
  if (!user) {
    throw new Error('Unauthorized');
  }

  // 2. Verificar acceso al workspace
  if (workspaceId) {
    const hasAccess = await canAccessWorkspace(userId, workspaceId);
    if (!hasAccess) {
      throw new Error('Forbidden: Workspace access denied');
    }
  }

  // 3. Verificar acceso al proceso
  if (processId && workspaceId) {
    const hasAccess = await canAccessProcess(userId, processId, workspaceId);
    if (!hasAccess) {
      throw new Error('Forbidden: Process access denied');
    }
  }

  // 4. Validar que la clave S3 corresponde al recurso solicitado
  const expectedPrefix = buildS3Prefix({ workspaceId, processId });
  if (!s3Key.startsWith(expectedPrefix)) {
    throw new Error('Forbidden: S3 key mismatch');
  }

  // 5. Verificar permisos específicos por operación
  const hasPermission = await checkOperationPermission(userId, operation);
  if (!hasPermission) {
    throw new Error(`Forbidden: ${operation} access denied`);
  }

  return true;
}

function buildS3Prefix({
  workspaceId,
  processId
}: {
  workspaceId?: string;
  processId?: string;
}): string {
  const parts = ['documents'];

  if (workspaceId) {
    parts.push(`workspaces/${workspaceId}`);
  }

  if (processId) {
    parts.push(`processes/${processId}`);
  }

  return parts.join('/') + '/';
}
```

### URLs Firmadas (Presigned URLs)

```typescript
// lib/server/s3/presigned-urls.ts

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function generateDownloadPresignedUrl(
  s3Key: string,
  expiresIn: number = 3600 // 1 hora por defecto
): Promise<string> {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: s3Key,
    ResponseContentDisposition: 'attachment' // Forzar download
  });

  return await getSignedUrl(client, command, { expiresIn });
}

export async function generateUploadPresignedUrl(
  s3Key: string,
  contentType: string,
  maxSizeBytes: number,
  expiresIn: number = 600 // 10 minutos por defecto
): Promise<string> {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: s3Key,
    ContentType: contentType,
    ContentLengthRange: maxSizeBytes,
    ServerSideEncryption: 'AES256'
  });

  return await getSignedUrl(client, command, { expiresIn });
}
```

### Lifecycle Policies (Gestión de Retención)

```typescript
// Configuración de lifecycle para buckets

const lifecycleConfiguration = {
  Rules: [
    {
      Id: 'DeleteTemporaryUploads',
      Status: 'Enabled',
      Filter: { Prefix: 'temporary/' },
      Expiration: { Days: 1 } // Eliminar uploads temporales después de 1 día
    },
    {
      Id: 'ArchiveOldDocuments',
      Status: 'Enabled',
      Filter: { Prefix: 'documents/' },
      Transitions: [
        {
          Days: 90,
          StorageClass: 'GLACIER' // Mover a Glacier después de 90 días
        }
      ]
    },
    {
      Id: 'DeleteIncompleteMultipartUploads',
      Status: 'Enabled',
      AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }
    }
  ]
};
```

---

## 🛠️ Implementación Técnica

### 1. Configuración de Variables de Entorno

```bash
# .env.local
# ==========================================
# WASABI S3 CONFIGURATION
# ==========================================

# Wasabi Credentials
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_REGION=us-east-1
WASABI_BUCKET=ali-prod-us-east-1
WASABI_ACCESS_KEY_ID=your_access_key_here
WASABI_SECRET_ACCESS_KEY=your_secret_key_here

# Bucket Configuration
WASABI_PREFIX_DOCUMENTS=documents
WASABI_PREFIX_TRANSCRIPTIONS=transcriptions
WASABI_PREFIX_WORKSPACE_IMAGES=workspace-images
WASABI_PREFIX_TEMPORARY=temporary

# Upload Limits
WASABI_MAX_FILE_SIZE_MB=10
WASABI_MAX_AUDIO_SIZE_MB=100
WASABI_MULTIPART_THRESHOLD_MB=5

# Presigned URL Expiration (seconds)
WASABI_PRESIGNED_URL_EXPIRY_DOWNLOAD=3600  # 1 hour
WASABI_PRESIGNED_URL_EXPIRY_UPLOAD=600     # 10 minutes
WASABI_PRESIGNED_URL_EXPIRY_THUMBNAIL=86400 # 24 hours

# Backup Configuration
WASABI_ENABLE_VERSIONING=true
WASABI_ENABLE_LIFECYCLE=true
```

### 2. Cliente S3 Optimizado

```typescript
// lib/server/s3/client.ts

import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';

// Singleton pattern para reutilizar la conexión
let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = createS3Client();
  }
  return s3Client;
}

function createS3Client(): S3Client {
  const endpoint = process.env.WASABI_ENDPOINT;
  const region = process.env.WASABI_REGION || 'us-east-1';
  const accessKeyId = process.env.WASABI_ACCESS_KEY_ID;
  const secretAccessKey = process.env.WASABI_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing Wasabi credentials');
  }

  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    // Configuración optimizada para Wasabi
    maxAttempts: 3,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 10000,  // 10 segundos
      socketTimeout: 30000,      // 30 segundos
      httpsAgent: new https.Agent({
        maxSockets: 50,
        keepAlive: true
      })
    }),
    // ForcePathStyle necesario para Wasabi
    forcePathStyle: true
  });
}

export function getBucketName(): string {
  const bucket = process.env.WASABI_BUCKET;
  if (!bucket) {
    throw new Error('WASABI_BUCKET environment variable is not set');
  }
  return bucket;
}
```

### 3. Servicio de Almacenamiento S3

```typescript
// lib/server/s3/s3-service.ts

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, getBucketName } from './client';
import { verifyS3Access } from './access-control';

export class S3Service {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = getS3Client();
    this.bucket = getBucketName();
  }

  /**
   * Sube un archivo a S3
   */
  async uploadFile(params: {
    key: string;
    body: Buffer | Uint8Array | string;
    contentType: string;
    metadata?: Record<string, string>;
    userId: string;
    workspaceId?: string;
    processId?: string;
  }): Promise<{ key: string; etag: string; location: string }> {
    // Verificar permisos
    await verifyS3Access({
      userId: params.userId,
      workspaceId: params.workspaceId,
      processId: params.processId,
      operation: 'write',
      s3Key: params.key
    });

    // Preparar metadatos
    const metadata = {
      'user-id': params.userId,
      'upload-date': new Date().toISOString(),
      'content-hash': this.generateHash(params.body),
      ...params.metadata
    };

    // Usar multipart upload para archivos grandes
    const fileSize = Buffer.byteLength(params.body as Buffer);
    const multipartThreshold =
      parseInt(process.env.WASABI_MULTIPART_THRESHOLD_MB || '5') * 1024 * 1024;

    try {
      if (fileSize > multipartThreshold) {
        return await this.uploadMultipart(params.key, params.body, params.contentType, metadata);
      } else {
        return await this.uploadSingle(params.key, params.body, params.contentType, metadata);
      }
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  private async uploadSingle(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string,
    metadata: Record<string, string>
  ): Promise<{ key: string; etag: string; location: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
      ServerSideEncryption: 'AES256'
    });

    const response = await this.client.send(command);

    return {
      key,
      etag: response.ETag || '',
      location: `s3://${this.bucket}/${key}`
    };
  }

  private async uploadMultipart(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string,
    metadata: Record<string, string>
  ): Promise<{ key: string; etag: string; location: string }> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
        ServerSideEncryption: 'AES256'
      },
      queueSize: 4, // Número de partes concurrentes
      partSize: 5 * 1024 * 1024 // 5 MB por parte
    });

    const result = await upload.done();

    return {
      key,
      etag: result.ETag || '',
      location: `s3://${this.bucket}/${key}`
    };
  }

  /**
   * Descarga un archivo de S3
   */
  async getFile(params: {
    key: string;
    userId: string;
    workspaceId?: string;
    processId?: string;
  }): Promise<Buffer> {
    // Verificar permisos
    await verifyS3Access({
      userId: params.userId,
      workspaceId: params.workspaceId,
      processId: params.processId,
      operation: 'read',
      s3Key: params.key
    });

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: params.key
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convertir stream a Buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  /**
   * Elimina un archivo de S3
   */
  async deleteFile(params: {
    key: string;
    userId: string;
    workspaceId?: string;
    processId?: string;
  }): Promise<void> {
    // Verificar permisos
    await verifyS3Access({
      userId: params.userId,
      workspaceId: params.workspaceId,
      processId: params.processId,
      operation: 'delete',
      s3Key: params.key
    });

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: params.key
      });

      await this.client.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Genera URL firmada para descarga
   */
  async getDownloadPresignedUrl(params: {
    key: string;
    expiresIn?: number;
    userId: string;
    workspaceId?: string;
    processId?: string;
  }): Promise<string> {
    // Verificar permisos
    await verifyS3Access({
      userId: params.userId,
      workspaceId: params.workspaceId,
      processId: params.processId,
      operation: 'read',
      s3Key: params.key
    });

    const expiresIn = params.expiresIn ||
      parseInt(process.env.WASABI_PRESIGNED_URL_EXPIRY_DOWNLOAD || '3600');

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ResponseContentDisposition: 'attachment'
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Genera URL firmada para upload directo del cliente
   */
  async getUploadPresignedUrl(params: {
    key: string;
    contentType: string;
    expiresIn?: number;
    userId: string;
    workspaceId?: string;
    processId?: string;
  }): Promise<string> {
    // Verificar permisos ANTES de generar la URL
    await verifyS3Access({
      userId: params.userId,
      workspaceId: params.workspaceId,
      processId: params.processId,
      operation: 'write',
      s3Key: params.key
    });

    const expiresIn = params.expiresIn ||
      parseInt(process.env.WASABI_PRESIGNED_URL_EXPIRY_UPLOAD || '600');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
      ServerSideEncryption: 'AES256'
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Obtiene metadatos de un archivo
   */
  async getFileMetadata(params: {
    key: string;
    userId: string;
    workspaceId?: string;
  }): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    metadata: Record<string, string>;
  }> {
    // Verificar permisos
    await verifyS3Access({
      userId: params.userId,
      workspaceId: params.workspaceId,
      operation: 'read',
      s3Key: params.key
    });

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: params.key
    });

    const response = await this.client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {}
    };
  }

  /**
   * Lista archivos en un prefix
   */
  async listFiles(params: {
    prefix: string;
    userId: string;
    workspaceId?: string;
    maxKeys?: number;
  }): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    // Verificar permisos
    await verifyS3Access({
      userId: params.userId,
      workspaceId: params.workspaceId,
      operation: 'read',
      s3Key: params.prefix
    });

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: params.prefix,
      MaxKeys: params.maxKeys || 1000
    });

    const response = await this.client.send(command);

    return (response.Contents || []).map(item => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified || new Date()
    }));
  }

  /**
   * Genera hash SHA-256 de un buffer
   */
  private generateHash(data: Buffer | Uint8Array | string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// Singleton instance
export const s3Service = new S3Service();
```

### 4. Helpers para Construir Claves S3

```typescript
// lib/server/s3/key-builders.ts

export interface S3KeyBuilderOptions {
  workspaceId: string;
  processId?: string;
  documentId?: string;
  userId?: string;
  version?: string;
}

export class S3KeyBuilder {
  private static readonly PREFIXES = {
    DOCUMENTS: 'documents',
    TRANSCRIPTIONS: 'transcriptions',
    WORKSPACE_IMAGES: 'workspace-images',
    TEMPORARY: 'temporary'
  } as const;

  /**
   * Construye la clave S3 para un documento de proceso
   */
  static buildDocumentKey(options: S3KeyBuilderOptions): string {
    const parts = [
      this.PREFIXES.DOCUMENTS,
      'workspaces',
      options.workspaceId,
      'processes',
      options.processId || '',
      'documents',
      options.documentId || ''
    ];

    return parts.filter(Boolean).join('/');
  }

  /**
   * Construye la clave S3 para una versión de documento
   */
  static buildDocumentVersionKey(options: S3KeyBuilderOptions & { version: string }): string {
    const parts = [
      this.PREFIXES.DOCUMENTS,
      'workspaces',
      options.workspaceId,
      'processes',
      options.processId || '',
      'versions',
      options.version,
      options.documentId || ''
    ];

    return parts.filter(Boolean).join('/');
  }

  /**
   * Construye la clave S3 para un archivo de transcripción
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
      `${options.transcriptionId}.${options.extension}`
    ].join('/');
  }

  /**
   * Construye la clave S3 para imagen de workspace
   */
  static buildWorkspaceImageKey(options: {
    workspaceId: string;
    extension: string;
  }): string {
    return [
      this.PREFIXES.WORKSPACE_IMAGES,
      `${options.workspaceId}.${options.extension}`
    ].join('/');
  }

  /**
   * Construye la clave S3 para upload temporal
   */
  static buildTemporaryUploadKey(options: {
    userId: string;
    sessionId: string;
  }): string {
    return [
      this.PREFIXES.TEMPORARY,
      'uploads',
      options.userId,
      options.sessionId
    ].join('/');
  }

  /**
   * Extrae metadata de una clave S3
   */
  static parseKey(s3Key: string): {
    type: 'document' | 'transcription' | 'workspace-image' | 'temporary';
    workspaceId?: string;
    processId?: string;
    documentId?: string;
  } {
    const parts = s3Key.split('/');

    if (parts[0] === this.PREFIXES.DOCUMENTS) {
      return {
        type: 'document',
        workspaceId: parts[2],
        processId: parts[4],
        documentId: parts[7]?.split('.')[0]
      };
    }

    if (parts[0] === this.PREFIXES.TRANSCRIPTIONS) {
      return {
        type: 'transcription',
        workspaceId: parts[2]
      };
    }

    if (parts[0] === this.PREFIXES.WORKSPACE_IMAGES) {
      return {
        type: 'workspace-image',
        workspaceId: parts[1]?.split('.')[0]
      };
    }

    throw new Error('Invalid S3 key format');
  }
}
```

### 5. Actualización de Endpoints API

```typescript
// app/api/processes/[processId]/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/server/auth';
import { canAccessProcess } from '@/lib/server/access/processes';
import { s3Service } from '@/lib/server/s3/s3-service';
import { S3KeyBuilder } from '@/lib/server/s3/key-builders';

export async function POST(
  request: NextRequest,
  { params }: { params: { processId: string } }
) {
  try {
    // 1. Autenticación
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { processId } = params;

    // 2. Parsear formulario
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const workspaceId = formData.get('workspaceId') as string;

    if (!file || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing file or workspaceId' },
        { status: 400 }
      );
    }

    // 3. Verificar acceso al proceso
    const hasAccess = await canAccessProcess(user.id, processId, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/csv',
      'application/json',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // 5. Validar tamaño
    const maxSizeMB = parseInt(process.env.WASABI_MAX_FILE_SIZE_MB || '10');
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File too large. Max size: ${maxSizeMB}MB` },
        { status: 400 }
      );
    }

    // 6. Generar ID de documento y clave S3
    const documentId = crypto.randomUUID();
    const extension = file.name.split('.').pop();
    const s3Key = S3KeyBuilder.buildDocumentKey({
      workspaceId,
      processId,
      documentId
    }) + `.${extension}`;

    // 7. Convertir archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 8. Subir a S3
    const uploadResult = await s3Service.uploadFile({
      key: s3Key,
      body: buffer,
      contentType: file.type,
      metadata: {
        'file-name': file.name,
        'file-size': file.size.toString()
      },
      userId: user.id,
      workspaceId,
      processId
    });

    // 9. Crear registro en base de datos
    const { data: document, error } = await supabase
      .from('process_documents')
      .insert({
        id: documentId,
        process_id: processId,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: s3Key, // Nueva columna para S3
        indexing_status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Rollback: eliminar de S3
      await s3Service.deleteFile({
        key: s3Key,
        userId: user.id,
        workspaceId
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.file_name,
        size: document.file_size,
        storagePath: document.storage_path,
        uploadResult
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
```

### 6. Database Migration (Agregar columna storage_path)

```sql
-- supabase/migrations/20250205000000_add_s3_storage_path.sql

-- Agregar columna para ruta S3 en process_documents
ALTER TABLE process_documents
ADD COLUMN storage_path TEXT;

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_process_documents_storage_path
ON process_documents(storage_path);

-- Agregar columna para versión de almacenamiento
ALTER TABLE process_documents
ADD COLUMN storage_version TEXT DEFAULT 's3';

-- Marcar documentos existentes como 'supabase' para migración gradual
UPDATE process_documents
SET storage_version = 'supabase',
    storage_path = storage_path
WHERE storage_path IS NOT NULL;

-- Agregar comentario
COMMENT ON COLUMN process_documents.storage_path IS 'S3 key or Supabase storage path';
COMMENT ON COLUMN process_documents.storage_version IS 'Storage backend: s3, supabase';
```

---

## 🔄 Migración de Datos

### Estrategia de Migración

#### Fase 1: Preparación (1-2 días)
1. ✅ Crear bucket en Wasabi
2. ✅ Configurar IAM policies
3. ✅ Implementar servicio S3
4. ✅ Deploy de código con soporte dual (Supabase + S3)
5. ✅ Testing en desarrollo

#### Fase 2: Migración en Vivo (3-5 días)
1. ✅ Crear script de migración
2. ✅ Migrar documentos por lotes (batch processing)
3. ✅ Verificar integridad de datos
4. ✅ Actualizar registros en base de datos
5. ✅ Monitorear errores

#### Fase 3: Validación (2-3 días)
1. ✅ Verificar que todos los archivos sean accesibles
2. ✅ Testing completo de uploads/downloads
3. ✅ Verificar permisos y ACLs
4. ✅ Performance testing

#### Fase 4: Cleanup (1 día)
1. ✅ Eliminar archivos de Supabase Storage (después de 30 días)
2. ✅ Remover código legacy de Supabase Storage
3. ✅ Actualizar documentación

### Script de Migración

```typescript
// scripts/migrate-to-s3.ts

import { createClient } from '@supabase/supabase-js';
import { s3Service } from '../lib/server/s3/s3-service';
import { S3KeyBuilder } from '../lib/server/s3/key-builders';
import { Storage } from '@supabase/storage-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseStorage = new Storage(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MigrationResult {
  success: boolean;
  documentId: string;
  oldPath: string;
  newKey: string;
  error?: string;
  fileSize: number;
}

class StorageMigration {
  private batchSize = 50;
  private maxRetries = 3;
  private results: MigrationResult[] = [];

  async migrateAllDocuments(): Promise<void {
    console.log('🚀 Starting migration from Supabase Storage to Wasabi S3...\n');

    // Obtener todos los documentos
    const { data: documents, error } = await supabase
      .from('process_documents')
      .select('id, process_id, storage_path, file_name, file_size')
      .eq('storage_version', 'supabase')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Failed to fetch documents:', error);
      throw error;
    }

    console.log(`📦 Found ${documents.length} documents to migrate\n`);

    // Migrar por lotes
    for (let i = 0; i < documents.length; i += this.batchSize) {
      const batch = documents.slice(i, i + this.batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(documents.length / this.batchSize)}`);

      await this.migrateBatch(batch);
    }

    // Reporte final
    this.printReport();
  }

  private async migrateBatch(documents: any[]): Promise<void> {
    const promises = documents.map(doc => this.migrateDocument(doc));
    await Promise.allSettled(promises);
  }

  private async migrateDocument(document: any): Promise<void> {
    let retries = 0;
    const maxRetries = this.maxRetries;

    while (retries < maxRetries) {
      try {
        // 1. Obtener el workspace ID del proceso
        const { data: process } = await supabase
          .from('processes')
          .select('workspace_id')
          .eq('id', document.process_id)
          .single();

        if (!process) {
          throw new Error('Process not found');
        }

        // 2. Descargar archivo desde Supabase
        console.log(`  ⬇️  Downloading: ${document.file_name}`);
        const { data, error } = await supabaseStorage
          .from('files')
          .download(document.storage_path);

        if (error) {
          throw new Error(`Failed to download from Supabase: ${error.message}`);
        }

        // 3. Construir clave S3
        const extension = document.file_name.split('.').pop();
        const s3Key = S3KeyBuilder.buildDocumentKey({
          workspaceId: process.workspace_id,
          processId: document.process_id,
          documentId: document.id
        }) + `.${extension}`;

        // 4. Subir a S3
        console.log(`  ⬆️  Uploading to S3: ${s3Key}`);
        await s3Service.uploadFile({
          key: s3Key,
          body: data as Buffer,
          contentType: this.getMimeType(extension),
          metadata: {
            'file-name': document.file_name,
            'file-size': document.file_size.toString(),
            'migrated-from': 'supabase',
            'migration-date': new Date().toISOString()
          },
          userId: 'system-migration', // Usuario especial para migración
          workspaceId: process.workspace_id,
          processId: document.process_id
        });

        // 5. Actualizar registro en base de datos
        const { error: updateError } = await supabase
          .from('process_documents')
          .update({
            storage_path: s3Key,
            storage_version: 's3'
          })
          .eq('id', document.id);

        if (updateError) {
          throw new Error(`Failed to update database: ${updateError.message}`);
        }

        // 6. Verificar upload
        await this.verifyUpload(s3Key, document.file_size);

        // 7. Registrar éxito
        this.results.push({
          success: true,
          documentId: document.id,
          oldPath: document.storage_path,
          newKey: s3Key,
          fileSize: document.file_size
        });

        console.log(`  ✅ Migrated: ${document.file_name}\n`);
        return;

      } catch (error) {
        retries++;
        console.error(`  ❌ Attempt ${retries}/${maxRetries} failed:`, error.message);

        if (retries >= maxRetries) {
          this.results.push({
            success: false,
            documentId: document.id,
            oldPath: document.storage_path,
            newKey: '',
            error: error.message,
            fileSize: document.file_size
          });
          console.error(`  💀 Failed to migrate: ${document.file_name}\n`);
        } else {
          // Esperar antes de reintentar (backoff exponencial)
          await this.sleep(Math.pow(2, retries) * 1000);
        }
      }
    }
  }

  private async verifyUpload(s3Key: string, expectedSize: number): Promise<void> {
    const metadata = await s3Service.getFileMetadata({
      key: s3Key,
      userId: 'system-migration'
    });

    if (metadata.size !== expectedSize) {
      throw new Error(`Size mismatch: expected ${expectedSize}, got ${metadata.size}`);
    }
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'json': 'application/json',
      'md': 'text/markdown'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printReport(): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATION REPORT');
    console.log('='.repeat(70) + '\n');

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    const totalSize = successful.reduce((sum, r) => sum + r.fileSize, 0);

    console.log(`✅ Successfully migrated: ${successful.length} documents`);
    console.log(`❌ Failed: ${failed.length} documents`);
    console.log(`📦 Total size transferred: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📈 Success rate: ${((successful.length / this.results.length) * 100).toFixed(2)}%\n`);

    if (failed.length > 0) {
      console.log('Failed documents:');
      failed.forEach(r => {
        console.log(`  - ${r.documentId}: ${r.error}`);
      });
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }
}

// Ejecutar migración
async function main() {
  const migration = new StorageMigration();

  try {
    await migration.migrateAllDocuments();
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
```

### Script de Rollback (por seguridad)

```typescript
// scripts/rollback-s3-migration.ts

import { createClient } from '@supabase/supabase-js';
import { s3Service } from '../lib/server/s3/s3-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function rollbackMigration() {
  console.log('⚠️  Starting rollback from S3 to Supabase...\n');

  // Obtener documentos migrados
  const { data: documents } = await supabase
    .from('process_documents')
    .select('id, storage_path')
    .eq('storage_version', 's3')
    .like('storage_path', 'documents/%');

  console.log(`Found ${documents.length} documents to rollback\n`);

  for (const doc of documents) {
    try {
      // Eliminar de S3
      await s3Service.deleteFile({
        key: doc.storage_path,
        userId: 'system-rollback'
      });

      // Actualizar registro (asumiendo que guardamos el old path)
      // NOTA: Necesitarás agregar una columna old_storage_path antes de migrar
      await supabase
        .from('process_documents')
        .update({
          storage_version: 'supabase',
          storage_path: supabase.raw('old_storage_path')
        })
        .eq('id', doc.id);

      console.log(`✅ Rolled back: ${doc.id}`);
    } catch (error) {
      console.error(`❌ Failed to rollback ${doc.id}:`, error);
    }
  }

  console.log('\n✅ Rollback completed!');
}

rollbackMigration();
```

---

## 🌐 Configuración de Wasabi

### 1. Crear Cuenta y Bucket

```bash
# Pasos:
1. Crear cuenta en https://wasabisys.com/
2. Generar Access Keys en IAM > Users
3. Crear bucket: ali-prod-us-east-1
4. Configurar bucket policy (ver arriba)
5. Habilitar versioning (opcional pero recomendado)
6. Configurar lifecycle rules (ver arriba)
```

### 2. Configurar CORS (si es necesario)

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["https://yourdomain.com"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

### 3. Testing de Conexión

```typescript
// scripts/test-s3-connection.ts

import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

async function testConnection() {
  const client = new S3Client({
    endpoint: process.env.WASABI_ENDPOINT,
    region: process.env.WASABI_REGION,
    credentials: {
      accessKeyId: process.env.WASABI_ACCESS_KEY_ID!,
      secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY!
    },
    forcePathStyle: true
  });

  try {
    const command = new ListBucketsCommand({});
    const response = await client.send(command);

    console.log('✅ Connection successful!');
    console.log('Available buckets:', response.Buckets?.map(b => b.Name));

  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

---

## 🧪 Testing y Validación

### Plan de Testing

#### Unit Tests
```typescript
// __tests__/s3/s3-service.test.ts

import { S3Service } from '@/lib/server/s3/s3-service';

describe('S3Service', () => {
  describe('uploadFile', () => {
    it('should upload small files using single upload', async () => {
      const service = new S3Service();
      const buffer = Buffer.from('test content');

      const result = await service.uploadFile({
        key: 'test/file.txt',
        body: buffer,
        contentType: 'text/plain',
        userId: 'test-user',
        workspaceId: 'test-workspace'
      });

      expect(result.key).toBe('test/file.txt');
      expect(result.etag).toBeTruthy();
    });

    it('should use multipart upload for large files', async () => {
      const service = new S3Service();
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB

      const result = await service.uploadFile({
        key: 'test/large.pdf',
        body: largeBuffer,
        contentType: 'application/pdf',
        userId: 'test-user',
        workspaceId: 'test-workspace'
      });

      expect(result.key).toBe('test/large.pdf');
    });
  });

  describe('getDownloadPresignedUrl', () => {
    it('should generate valid presigned URL', async () => {
      const service = new S3Service();
      const url = await service.getDownloadPresignedUrl({
        key: 'test/file.pdf',
        userId: 'test-user'
      });

      expect(url).toContain('X-Amz-Signature');
      expect(url).toContain('test/file.pdf');
    });
  });
});
```

#### Integration Tests
```typescript
// __tests__/integration/upload-flow.test.ts

import { POST } from '@/app/api/processes/[processId]/upload/route';

describe('Document Upload Flow', () => {
  it('should upload document to S3 and create database record', async () => {
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf'
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', 'test-workspace');

    const request = new Request('http://localhost:3000/api/processes/test-process/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request, { params: { processId: 'test-process' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.document.storagePath).toContain('documents/workspaces/');
  });
});
```

### Checklist de Validación

- [ ] **Upload de documentos**
  - [ ] PDF < 5 MB (single upload)
  - [ ] PDF > 5 MB (multipart upload)
  - [ ] DOCX, TXT, CSV, JSON
  - [ ] Archivos inválidos son rechazados
  - [ ] Archivos > límite de tamaño son rechazados

- [ ] **Download de documentos**
  - [ ] Usuario con acceso puede descargar
  - [ ] Usuario sin acceso recibe 403
  - [ ] URLs firmadas expiran correctamente
  - [ ] Descarga funciona en browser

- [ ] **Eliminación de documentos**
  - [ ] Usuario con acceso puede eliminar
  - [ ] Usuario sin acceso recibe 403
  - [ ] Archivo eliminado no es accesible
  - [ ] Trigger de base de datos funciona

- [ ] **Permisos y seguridad**
  - [ ] RLS policies funcionan correctamente
  - [ ] Validación de ownership
  - [ ] Bucket policy deny all por defecto
  - [ ] URLs firmadas son seguras

- [ ] **Migración de datos**
  - [ ] Todos los documentos son migrados
  - [ ] Integridad de datos verificada
  - [ ] Performance aceptable
  - [ ] Errores son manejados correctamente

- [ ] **Performance**
  - [ ] Upload speed ≥ Supabase
  - [ ] Download speed ≥ Supabase
  - [ ] Presigned URLs se generan < 100ms
  - [ ] No memory leaks

---

## 🔄 Rollback Plan

### Condiciones para Rollback

1. **Rollback Automático** si:
   - Más del 10% de uploads fallan durante 1 hora
   - Error rate > 5% en S3 operations
   - Latencia > 10 segundos

2. **Rollback Manual** si:
   - Bugs críticos en producción
   - Problemas de seguridad
   - Costos inesperados

### Procedimiento de Rollback

```bash
# 1. Cambiar variable de entorno
STORAGE_BACKEND=supabase

# 2. Redeploy aplicación
vercel --prod

# 3. Verificar que todo usa Supabase Storage
# 4. Monitorear errores por 24 horas
# 5. Si todo OK, eliminar archivos de S3 (después de 30 días)
```

### Script de Rollback Rápido

```typescript
// lib/server/s3/rollback.ts

export function enableRollbackMode() {
  process.env.STORAGE_BACKEND = 'supabase';
  process.env.ENABLE_S3 = 'false';
}

export async function rollbackS3Uploads() {
  // Eliminar uploads de las últimas 24 horas
  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { data: recentUploads } = await supabase
    .from('process_documents')
    .select('storage_path')
    .eq('storage_version', 's3')
    .gte('created_at', cutoffDate.toISOString());

  for (const doc of recentUploads) {
    try {
      await s3Service.deleteFile({
        key: doc.storage_path,
        userId: 'system-rollback'
      });
    } catch (error) {
      console.error(`Failed to delete ${doc.storage_path}:`, error);
    }
  }
}
```

---

## 📊 Métricas y Monitoreo

### Métricas Clave

```typescript
// Métricas a monitorear
interface StorageMetrics {
  // Performance
  uploadLatency: number;        // Tiempo promedio de upload
  downloadLatency: number;      // Tiempo promedio de download
  presignedUrlGenerationTime: number;

  // Reliability
  uploadSuccessRate: number;    // % de uploads exitosos
  downloadSuccessRate: number;  // % de downloads exitosos
  errorRate: number;            // % de errores

  // Usage
  totalStorageUsed: number;     // GB almacenados
  uploadCount: number;          // Número de uploads/día
  downloadCount: number;        // Número de downloads/día
  averageFileSize: number;      // Tamaño promedio de archivo

  // Cost
  estimatedMonthlyCost: number; // Costo estimado en Wasabi
}
```

### Alertas

```yaml
# alerts.yml
alerts:
  - name: HighUploadFailureRate
    condition: uploadSuccessRate < 0.95
    duration: 5m
    severity: critical

  - name: HighS3Latency
    condition: uploadLatency > 10000
    duration: 5m
    severity: warning

  - name: UnexpectedStorageCost
    condition: estimatedMonthlyCost > 100
    duration: 1h
    severity: warning
```

---

## ✅ Checklist Final de Implementación

### Pre-Migración
- [ ] Cuenta de Wasabi creada
- [ ] Bucket creado y configurado
- [ ] IAM policies aplicadas
- [ ] Variables de entorno configuradas
- [ ] Código S3 implementado y testeado
- [ ] Backup de base de datos creado
- [ ] Script de migración preparado

### Migración
- [ ] Deploy en staging
- [ ] Testing completo en staging
- [ ] Migración de datos a staging
- [ ] Validación de staging
- [ ] Deploy en producción
- [ ] Migración de datos a producción
- [ ] Validación de producción

### Post-Migración
- [ ] Monitoreo activo por 7 días
- [ ] Optimización de performance
- [ ] Documentación actualizada
- [ ] Equipo entrenado
- [ ] Scripts de mantenimiento creados
- [ ] Plan de disaster testing

---

## 📚 Referencias y Recursos

### Documentación
- [Wasabi S3 API Documentation](https://wasabi-support.zendesk.com/hc/en-us/articles/360015106031-Using-the-Wasabi-S3-API)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Supabase Storage Migration Guide](https://supabase.com/docs/guides/storage)

### Herramientas
- [AWS CLI](https://aws.amazon.com/cli/) - Para operaciones manuales
- [s3cmd](https://s3tools.org/s3cmd) - Cliente S3 open source
- [Cyberduck](https://cyberduck.io/) - GUI para S3

### Cost Calculator
- [Wasabi Pricing Calculator](https://wasabi.com/pricing/)
- Comparativa: Wasabi ($6/TB/mes) vs Supabase Storage ($0.021/GB = $21/TB/mes)
- **Ahorro estimado**: 71% en storage

---

## 🎯 Próximos Pasos

1. **Revisión del plan** con el equipo
2. **Aprobación de presupuesto** (Wasabi: ~$50/mes para 1 TB)
3. **Setup de cuenta** Wasabi
4. **Implementación** de servicio S3 (2-3 días)
5. **Testing** en desarrollo (2 días)
6. **Migración** a producción (1 día)
7. **Monitoreo** y optimización (continuo)

---

**Fecha de creación**: 2025-02-05
**Autor**: Claude (AI Assistant)
**Versión**: 1.0
**Estado**: Pendiente de aprobación
