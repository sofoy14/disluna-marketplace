# Plan de Acción Completo - Refactorización ALI
**Asistente Legal Inteligente - Refactorización y Optimización**

**Fecha:** 2026-01-17
**Duración Estimada:** 12 semanas
**Objetivo:** Transformar el sistema actual a una arquitectura producción-ready con seguridad, performance y observabilidad robustas

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Métricas de Éxito](#métricas-de-éxito)
3. [Estructura del Plan](#estructura-del-plan)
4. [Sprint 1: Seguridad Crítica (Semana 1-2)](#sprint-1-seguridad-crítica)
5. [Sprint 2: Performance & Estabilidad (Semana 3-4)](#sprint-2-performance--estabilidad)
6. [Sprint 3: Observabilidad (Semana 5-6)](#sprint-3-observabilidad)
7. [Sprint 4: Escalabilidad (Semana 7-8)](#sprint-4-escalabilidad)
8. [Sprint 5: Seguridad Avanzada (Semana 9-10)](#sprint-5-seguridad-avanzada)
9. [Sprint 6: Calidad (Semana 11-12)](#sprint-6-calidad)
10. [Apéndices](#apéndices)

---

## Resumen Ejecutivo

### Hallazgos Clave
- **34 issues identificadas:** 8 bloqueantes, 14 altas, 9 medias, 3 bajas
- **Áreas críticas:**
  - Seguridad: Rate limiting inexistente, webhooks sin validación
  - Performance: Sin background jobs, N+1 queries
  - Observabilidad: No hay logging estructurado ni métricas
- **Riesgo principal:** Multi-tenant isolation no completamente auditado

### Estrategia de Ejecución

El plan se divide en **6 sprints de 2 semanas** cada uno:

```
Sprint 1-2:  Seguridad Crítica          (Bloqueantes 🔴)
Sprint 3-4:  Performance & Estabilidad  (Performance 🟠)
Sprint 5-6:  Observabilidad             (Visibilidad 🟠)
Sprint 7-8:  Escalabilidad              (Infraestructura 🔴)
Sprint 9-10: Seguridad Avanzada         (Hardening 🟠)
Sprint 11-12: Calidad                   (Testing 🟡)
```

---

## Métricas de Éxito

### Métricas Objetivo vs Actual

| Métrica | Estado Actual | Objetivo | Método de Medición |
|---------|---------------|----------|-------------------|
| **Error Rate** | Desconocido | < 0.1% | Sentry / Logs |
| **P95 Latency (chat)** | Desconocido | < 2s | Prometheus |
| **P95 Latency (ingest)** | Desconocido | < 30s | Prometheus |
| **Time to Detect Incident** | > 24h | < 5 min | Alertas |
| **Time to Recover** | > 4h | < 30 min | Runbooks |
| **Deployment Confidence** | Baja | > 95% | Tests + Canary |
| **Test Coverage** | ~0% | > 70% | Jest/Coverage |
| **Security Score** | 6/10 | > 9/10 | Auditoría |

### Checklist de Regresión (Por cada PR)

```bash
# Antes de mergear cada PR, verificar:

□ Login funciona
□ Workspace switching funciona
□ Upload de documento funciona
□ Ingestión completa exitosamente
□ Chat responde correctamente
□ RAG retorna resultados relevantes
□ Grafo se construye sin errores
□ Billing procesa pagos
□ No errores en console del browser
□ No errores en logs del servidor
□ Tests unitarios pasan (npm test)
□ Tests de integración pasan
□ Lint pasa (npm run lint)
□ Build exitoso (npm run build)
□ Manual QA completado
□ Code review aprobado
```

---

## Estructura del Plan

### Convenciones de Tareas

Cada tarea incluye:
- **ID:** Identificador único (ej: PR-001)
- **Severidad:** 🔴 Bloqueante | 🟠 Alta | 🟡 Media | 🟢 Baja
- **Esfuerzo:** Tiempo estimado
- **Archivos:** Files afectados
- **Pasos:** Instrucciones detalladas
- **Verificación:** Cómo confirmar que funciona

### Comandos Útiles Globales

```bash
# Instalar dependencias
npm ci

# Desarrollo
npm run dev

# Lint
npm run lint

# Tests
npm test

# Build
npm run build

# Producción
npm run start

# Verificar tipos
npx tsc --noEmit

# Verificar seguridad
npm audit
npm audit fix

# Formatear código
npm run format
```

---

## Sprint 1: Seguridad Crítica

**Objetivo:** Resolver vulnerabilidades críticas que podrían comprometer el sistema en producción

**Duración:** 2 semanas
**Riesgo:** Alto - cambios en middleware de autenticación
**Mitigación:** Feature flags, testing extensivo, staging primero

---

### PR-001: Rate Limiting en Endpoints Críticos

**ID:** SEC-001 | **Severidad:** 🔴 Bloqueante | **Esfuerzo:** 2 días

#### Problema
Endpoints de autenticación y chat sin rate limiting permiten:
- Fuerza bruta en credenciales
- DoS attacks
- Agotamiento de cuotas LLM

#### Solución

**1. Instalar dependencias**

```bash
npm install upstash-ratelimit @upstash/redis
# O alternativamente con Redis local:
npm install ioredis rate-limiter-flexible
```

**2. Crear lib/rate-limit.ts**

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Crear instancia de Redis
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // Configurable
  analytics: true,
  prefix: '@upstash/ratelimit',
});

// Limitadores específicos por endpoint
export const authRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 req/min
  analytics: true,
  prefix: 'ratelimit:auth',
});

export const chatRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 req/min
  analytics: true,
  prefix: 'ratelimit:chat',
});

export const ingestRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 uploads/min
  analytics: true,
  prefix: 'ratelimit:ingest',
});
```

**3. Crear middleware rate-limit-middleware.ts**

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authRateLimit } from './lib/rate-limit';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Rate limiting para endpoints de auth
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    const identifier = req.ip ?? 'anonymous';
    const { success, limit, reset, remaining } = await authRateLimit.limit(identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    res.headers.set('X-RateLimit-Limit', limit.toString());
    res.headers.set('X-RateLimit-Remaining', remaining.toString());
    res.headers.set('X-RateLimit-Reset', reset.toString());
  }

  // Resto del middleware existente...
  const supabase = createMiddlewareClient({ req, res });
  // ... código existente ...

  return res;
}

export const config = {
  matcher: ['/api/auth/:path*', '/api/processes/:path*/chat'],
};
```

**4. Añadir rate limiting en endpoints específicos**

```typescript
// app/api/auth/password-signin/route.ts
import { authRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const identifier = getIdentifierFromRequest(req); // IP o user ID
  const { success } = await authRateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 }
    );
  }

  // ... resto del código ...
}
```

**5. Configurar variables de entorno**

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

#### Verificación

```bash
# Test 1: Verificar rate limit básico
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/auth/password-signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
  echo "Request $i"
done

# Esperar 429 después de 10 requests

# Test 2: Verificar headers
curl -I http://localhost:3000/api/auth/password-signin
# Debe incluir: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

# Test 3: Verificar en logs
# Logs deben mostrar: "Rate limit exceeded for identifier: xxx"
```

#### Criterio de Done
- [ ] Rate limiting activo en `/api/auth/*` (10 req/min)
- [ ] Rate limiting activo en `/api/processes/*/chat` (60 req/min)
- [ ] Rate limiting activo en `/api/processes/*/ingest` (5 req/min)
- [ ] Logs de intentos bloqueados visibles
- [ ] Headers de rate limit en responses
- [ ] Tests unitarios para rate limiting
- [ ] Documentación en README.md

---

### PR-002: Fix Webhook Signature Validation

**ID:** SEC-002 | **Severidad:** 🔴 Bloqueante | **Esfuerzo:** 1 día

#### Problema
El flag `WOMPI_SKIP_SIGNATURE_VALIDATION` permite pagos fraudulentos al no validar la firma del webhook.

#### Solución

**1. Leer implementación actual**

```bash
# Revisar archivo
cat app/api/wompi/webhook/route.ts
```

**2. Eliminar flag y validar siempre**

```typescript
// app/api/wompi/webhook/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  // 1. Obtener signature del header
  const signature = req.headers.get('x-payment-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 401 }
    );
  }

  // 2. Obtener body raw
  const rawBody = await req.text();

  // 3. Verificar firma
  const webhookSecret = process.env.WOMPI_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('WOMPI_WEBHOOK_SECRET not configured');
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    // Log intento fallido
    console.error('Invalid webhook signature:', {
      received: signature,
      expected: expectedSignature,
      ip: req.headers.get('x-forwarded-for'),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  // 4. Procesar webhook (firma válida)
  const event = JSON.parse(rawBody);

  // ... resto del código de procesamiento ...

  return NextResponse.json({ received: true });
}
```

**3. Configurar secreto**

```bash
# Obtener secreto de Wompi dashboard
# Agregar a .env.local
WOMPI_WEBHOOK_SECRET=wp_prod_xxx_your_secret_here

# Y en .env.production
WOMPI_WEBHOOK_SECRET=wp_prod_xxx_your_secret_here
```

**4. Crear tests**

```typescript
// tests/webhook-validation.test.ts
import { POST } from '@/app/api/wompi/webhook/route';
import { NextRequest } from 'next/server';

describe('Wompi Webhook Validation', () => {
  it('should reject request without signature', async () => {
    const req = new NextRequest('http://localhost:3000/api/wompi/webhook', {
      method: 'POST',
      body: JSON.stringify({ event: 'payment.success' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('should reject request with invalid signature', async () => {
    const req = new NextRequest('http://localhost:3000/api/wompi/webhook', {
      method: 'POST',
      headers: {
        'x-payment-signature': 'invalid_signature',
      },
      body: JSON.stringify({ event: 'payment.success' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('should accept request with valid signature', async () => {
    const payload = JSON.stringify({ event: 'payment.success' });
    const signature = crypto
      .createHmac('sha256', process.env.WOMPI_WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex');

    const req = new NextRequest('http://localhost:3000/api/wompi/webhook', {
      method: 'POST',
      headers: {
        'x-payment-signature': signature,
      },
      body: payload,
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
  });
});
```

#### Verificación

```bash
# Test 1: Webhook sin firma
curl -X POST http://localhost:3000/api/wompi/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"payment.success"}'
# Esperar: 401 Unauthorized

# Test 2: Webhook con firma inválida
curl -X POST http://localhost:3000/api/wompi/webhook \
  -H "Content-Type: application/json" \
  -H "x-payment-signature: invalid" \
  -d '{"event":"payment.success"}'
# Esperar: 401 Unauthorized

# Test 3: Webhook con firma válida (usando script de test)
node tests/scripts/valid-webhook-test.js
# Esperar: 200 OK

# Test 4: Ejecutar tests
npm test webhook-validation.test.ts
```

#### Criterio de Done
- [ ] Flag `WOMPI_SKIP_SIGNATURE_VALIDATION` eliminado
- [ ] Validación siempre activa
- [ ] Tests de firma válida/inválida pasan
- [ ] Logs de webhooks rechazados
- [ ] Secret configurado en production
- [ ] Documentación de configuración de webhook

---

### PR-003: Security Headers

**ID:** SEC-007 | **Severidad:** 🟡 Media | **Esfuerzo:** 1 día

#### Problema
Faltan headers de seguridad para proteger contra XSS, clickjacking, y otros ataques.

#### Solución

**1. Crear lib/security-headers.ts**

```typescript
// lib/security-headers.ts

const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': buildCSP(),
};

function buildCSP(): string {
  const isDev = process.env.NODE_ENV === 'development';

  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://api.openai.com wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join('; ');
}

export function addSecurityHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  return newResponse;
}

export { SECURITY_HEADERS };
```

**2. Modificar next.config.js**

```javascript
// next.config.js
const { SECURITY_HEADERS } = require('./lib/security-headers');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

module.exports = nextConfig;
```

**3. Añadir middleware para respuestas API**

```typescript
// middleware.ts (actualizar)
import { addSecurityHeaders } from './lib/security-headers';

export async function middleware(req: NextRequest) {
  // ... código existente ...

  const res = NextResponse.next();

  // Añadir security headers a respuestas API
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return addSecurityHeaders(res);
  }

  return res;
}
```

#### Verificación

```bash
# Test 1: Verificar headers en páginas
curl -I http://localhost:3000 | grep -E "X-Frame-Options|X-Content-Type|Content-Security|Strict-Transport"

# Debe ver:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'self'...
# Strict-Transport-Security: max-age=63072000...

# Test 2: Verificar headers en API
curl -I http://localhost:3000/api/processes | grep -E "X-Frame-Options|X-Content-Type"

# Test 3: Verificar CSP con browser
# Abrir DevTools → Console → buscar mensajes de CSP
# Cargar una imagen externa bloqueada por CSP
```

#### Criterio de Done
- [ ] CSP implementado y no bloquea recursos legítimos
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security en prod (no en dev)
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Headers aplicados a páginas y APIs
- [ ] No errores de CSP en console
- [ ] Documentación de headers en README

---

### PR-004: CORS Configuration

**ID:** SEC-003 | **Severidad:** 🟠 Alta | **Esfuerzo:** 1 día

#### Problema
CORS no configurado explícitamente, permitiendo solicitudes cross-origin no autorizadas.

#### Solución

**1. Crear lib/cors.ts**

```typescript
// lib/cors.ts

interface CORSConfig {
  origin: string | string[] | ((origin: string) => boolean);
  credentials?: boolean;
  allowedHeaders?: string[];
  methods?: string[];
  maxAge?: number;
}

const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Request-ID',
  'X-Workspace-ID',
];

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export function getCORSHeaders(config: CORSConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  // Access-Control-Allow-Origin
  if (typeof config.origin === 'string') {
    headers['Access-Control-Allow-Origin'] = config.origin;
  } else if (Array.isArray(config.origin)) {
    const origin = config.origin[0]; // Simplificado, en middleware real se valida
    headers['Access-Control-Allow-Origin'] = origin;
  }

  // Access-Control-Allow-Credentials
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Access-Control-Allow-Headers
  headers['Access-Control-Allow-Headers'] =
    config.allowedHeaders?.join(', ') || DEFAULT_ALLOWED_HEADERS.join(', ');

  // Access-Control-Allow-Methods
  headers['Access-Control-Allow-Methods'] =
    config.methods?.join(', ') || DEFAULT_METHODS.join(', ');

  // Access-Control-Max-Age
  if (config.maxAge) {
    headers['Access-Control-Max-Age'] = config.maxAge.toString();
  }

  // Access-Control-Expose-Headers
  headers['Access-Control-Expose-Headers'] =
    'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset';

  return headers;
}

export function isOriginAllowed(origin: string, allowed: CORSConfig['origin']): boolean {
  if (!origin) return false;

  if (typeof allowed === 'string') {
    return origin === allowed;
  }

  if (Array.isArray(allowed)) {
    return allowed.includes(origin);
  }

  if (typeof allowed === 'function') {
    return allowed(origin);
  }

  return false;
}

export const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://your-production-domain.com',
  ...(process.env.NODE_ENV === 'development'
    ? ['http://localhost:3001', 'http://localhost:3002']
    : []),
];

export const API_CORS_CONFIG: CORSConfig = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
  allowedHeaders: [...DEFAULT_ALLOWED_HEADERS, 'Idempotency-Key'],
  methods: DEFAULT_METHODS,
  maxAge: 86400, // 24 hours
};
```

**2. Crear middleware de CORS**

```typescript
// middleware.ts (actualizar)
import { getCORSHeaders, isOriginAllowed, API_CORS_CONFIG } from './lib/cors';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // CORS para API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');

    // Preflight OPTIONS
    if (req.method === 'OPTIONS') {
      if (!origin || !isOriginAllowed(origin, API_CORS_CONFIG.origin)) {
        return new NextResponse(null, { status: 403 });
      }

      const headers = getCORSHeaders(API_CORS_CONFIG);
      return new NextResponse(null, {
        status: 204,
        headers,
      });
    }

    // Añadir headers CORS a otras requests
    if (origin && isOriginAllowed(origin, API_CORS_CONFIG.origin)) {
      const headers = getCORSHeaders(API_CORS_CONFIG);
      Object.entries(headers).forEach(([key, value]) => {
        res.headers.set(key, value);
      });
    }
  }

  // ... resto del middleware ...
  return res;
}
```

**3. Aplicar CORS en API routes específicas**

```typescript
// app/api/processes/route.ts
import { getCORSHeaders, API_CORS_CONFIG } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCORSHeaders(API_CORS_CONFIG),
  });
}

export async function GET(req: Request) {
  const response = NextResponse.json(/* data */);

  // Añadir headers CORS
  const headers = getCORSHeaders(API_CORS_CONFIG);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
```

#### Verificación

```bash
# Test 1: Preflight request desde origen permitido
curl -X OPTIONS http://localhost:3000/api/processes \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Debe incluir: Access-Control-Allow-Origin: http://localhost:3000

# Test 2: Request desde origen no permitido
curl -X OPTIONS http://localhost:3000/api/processes \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Debe retornar: 403 Forbidden

# Test 3: Request con credenciales
curl -X GET http://localhost:3000/api/processes \
  -H "Origin: http://localhost:3000" \
  -H "Cookie: session=xxx" \
  -v

# Debe incluir: Access-Control-Allow-Credentials: true
```

#### Criterio de Done
- [ ] CORS configurado con whitelist de orígenes
- [ ] Preflight OPTIONS manejado correctamente
- [ ] Logs de requests bloqueados por CORS
- [ ] Tests para orígenes permitidos/no permitidos
- [ ] Documentación de cómo añadir orígenes
- [ ] Variables de entorno configuradas

---

## Sprint 2: Performance & Estabilidad

**Objetivo:** Resolver problemas de performance que impactan la experiencia del usuario

**Duración:** 2 semanas
**Riesgo:** Medio - cambios en queries y timeouts
**Mitigación:** Load testing, monitoreo de latencia

---

### PR-005: Timeouts en LLM

**ID:** RAG-003 | **Severidad:** 🟡 Media | **Esfuerzo:** 1 día

#### Problema
Llamadas LLM pueden colgar indefinidamente sin timeout configurado.

#### Solución

**1. Crear lib/llm/timeouts.ts**

```typescript
// lib/llm/timeouts.ts

export const LLM_TIMEOUTS = {
  OPENAI_CHAT: 30_000, // 30 segundos
  OPENAI_EMBEDDING: 15_000, // 15 segundos
  RAG_BACKEND: 60_000, // 60 segundos
  DEFAULT: 10_000, // 10 segundos
} as const;

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage || `Timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

export function createTimeoutError(operation: string, timeoutMs: number): Error {
  return new Error(
    `${operation} timed out after ${timeoutMs}ms. The service may be experiencing high load.`
  );
}
```

**2. Actualizar lib/services/rag-backend.ts**

```typescript
// lib/services/rag-backend.ts
import { withTimeout, LLM_TIMEOUTS, createTimeoutError } from '@/lib/llm/timeouts';

export async function queryRAGBackend(query: string, options: RAGOptions) {
  try {
    const response = await withTimeout(
      fetch(`${RAG_BACKEND_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, ...options }),
      }),
      LLM_TIMEOUTS.RAG_BACKEND,
      'RAG backend query timeout'
    );

    if (!response.ok) {
      throw new Error(`RAG backend error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('timeout')) {
      // Log timeout específicamente
      console.error('RAG backend timeout:', {
        query: query.substring(0, 100),
        timeout: LLM_TIMEOUTS.RAG_BACKEND,
        timestamp: new Date().toISOString(),
      });

      // Retornar respuesta graceful degraded
      return {
        results: [],
        error: 'Query timeout. Please try again.',
      };
    }

    throw error;
  }
}
```

**3. Actualizar llamadas OpenAI**

```typescript
// lib/llm/openai.ts
import OpenAI from 'openai';
import { withTimeout, LLM_TIMEOUTS } from '@/lib/llm/timeouts';

const openai = new OpenAI({
  timeout: LLM_TIMEOUTS.OPENAI_CHAT, // Timeout global del cliente
});

export async function chatWithOpenAI(messages: Message[]) {
  try {
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 2000,
      }),
      LLM_TIMEOUTS.OPENAI_CHAT
    );

    return completion.choices[0].message;
  } catch (error) {
    if (error.message.includes('timeout')) {
      // Retry con timeout más corto
      console.warn('OpenAI timeout, retrying...');

      return await withTimeout(
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo', // Fallback a modelo más rápido
          messages,
          max_tokens: 1000,
        }),
        LLM_TIMEOUTS.DEFAULT
      );
    }

    throw error;
  }
}
```

#### Verificación

```typescript
// Test de timeout
import { withTimeout, LLM_TIMEOUTS } from '@/lib/llm/timeouts';

describe('LLM Timeouts', () => {
  it('should timeout after specified duration', async () => {
    await expect(
      withTimeout(
        new Promise(resolve => setTimeout(resolve, 5000)),
        1000
      )
    ).rejects.toThrow('Timeout after 1000ms');
  });

  it('should resolve within timeout', async () => {
    const result = await withTimeout(
      Promise.resolve('success'),
      1000
    );
    expect(result).toBe('success');
  });
});
```

#### Criterio de Done
- [ ] Timeout de 30s en llamadas OpenAI
- [ ] Timeout de 60s en RAG backend
- [ ] Logs claros de timeouts
- [ ] Graceful degradation en UI
- [ ] Tests de timeout pasan
- [ ] Documentación de configuración de timeouts

---

### PR-006: Fix N+1 Query en Documentos

**ID:** PERF-001 | **Severidad:** 🟠 Alta | **Esfuerzo:** 2 días

#### Problema
La lista de documentos realiza múltiples queries (N+1) para cargar estados.

#### Solución

**1. Analizar query actual**

```bash
# Revisar implementación actual
cat components/processes/process-documents.tsx
cat app/api/processes/[processId]/documents/route.ts
cat db/process-documents.ts
```

**2. Optimizar query en db/process-documents.ts**

```typescript
// db/process-documents.ts
import { supabase } from './supabase';

export interface DocumentWithStats {
  id: string;
  name: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  file_size: number;
  file_type: string;
  chunk_count: number;
  last_ingested_at: string | null;
}

export async function getDocumentsWithStats(
  processId: string,
  workspaceId: string
): Promise<DocumentWithStats[]> {
  // Query optimizada con aggregation
  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      name,
      status,
      created_at,
      updated_at,
      file_size,
      file_type,
      process_id!inner (
        id,
        workspace_id
      ),
      document_sections (
        id,
        created_at
      )
    `)
    .eq('process_id', processId)
    .eq('process_id.workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Agregar stats en memoria (más eficiente que N+1 queries)
  return data.map(doc => ({
    ...doc,
    chunk_count: doc.document_sections?.length || 0,
    last_ingested_at:
      doc.document_sections && doc.document_sections.length > 0
        ? doc.document_sections
            .map(s => s.created_at)
            .sort()
            .reverse()[0]
        : null,
  }));
}

// Alternativa con view materializada (para datasets grandes)
export async function getDocumentsWithStatsOptimized(
  processId: string,
  workspaceId: string
): Promise<DocumentWithStats[]> {
  const { data, error } = await supabase
    .from('document_stats_view') // View materializada
    .select('*')
    .eq('process_id', processId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

**3. Crear migration para view materializada**

```sql
-- supabase/migrations/20250117000001_document_stats_view.sql

-- Drop view if exists
DROP MATERIALIZED VIEW IF EXISTS document_stats_view;

-- Create materialized view for document stats
CREATE MATERIALIZED VIEW document_stats_view AS
SELECT
  d.id,
  d.name,
  d.status,
  d.created_at,
  d.updated_at,
  d.file_size,
  d.file_type,
  d.process_id,
  p.workspace_id,
  COUNT(ds.id) as chunk_count,
  MAX(ds.created_at) as last_ingested_at
FROM documents d
JOIN processes p ON d.process_id = p.id
LEFT JOIN document_sections ds ON d.id = ds.document_id
GROUP BY
  d.id,
  d.name,
  d.status,
  d.created_at,
  d.updated_at,
  d.file_size,
  d.file_type,
  d.process_id,
  p.workspace_id;

-- Create indexes
CREATE INDEX idx_document_stats_view_process_id
  ON document_stats_view(process_id);

CREATE INDEX idx_document_stats_view_workspace_id
  ON document_stats_view(workspace_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_document_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY document_stats_view;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON document_stats_view TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_document_stats() TO service_role;
```

**4. Crear job para refresh periódico**

```typescript
// lib/jobs/refresh-document-stats.ts
import { supabase } from '@/db/supabase';

export async function refreshDocumentStats() {
  const { error } = await supabase.rpc('refresh_document_stats');

  if (error) {
    console.error('Failed to refresh document stats:', error);
    throw error;
  }

  console.log('Document stats refreshed successfully');
}

// Agregar a app/api/cron/refresh-stats/route.ts
export async function POST(req: Request) {
  // Verificar que es cron job (auth)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await refreshDocumentStats();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

#### Verificación

```sql
-- Test 1: Verificar query plan
EXPLAIN ANALYZE
SELECT * FROM document_stats_view
WHERE process_id = 'xxx' AND workspace_id = 'yyy';

-- Debe usar índices y ser < 10ms para 1000 docs

-- Test 2: Contar chunks manualmente
SELECT
  d.id,
  d.name,
  COUNT(ds.id) as actual_chunk_count
FROM documents d
LEFT JOIN document_sections ds ON d.id = ds.document_id
GROUP BY d.id, d.name
LIMIT 10;

-- Comparar con view
SELECT id, name, chunk_count FROM document_stats_view LIMIT 10;

-- Deben coincidir
```

```bash
# Test 3: API response time
time curl http://localhost:3000/api/processes/xxx/documents

# Debe ser < 100ms para 1000 documentos

# Test 4: Load test
ab -n 100 -c 10 http://localhost:3000/api/processes/xxx/documents

# P95 debe ser < 200ms
```

#### Criterio de Done
- [ ] Single query con aggregation
- [ ] < 100ms en dataset de 1000 docs
- [ ] Tests de API pasan
- [ ] No cambios en respuesta (misma data)
- [ ] Materialized view creada
- [ ] Job de refresh configurado
- [ ] Documentación de mantenimiento

---

### PR-007: Retry con Exponential Backoff

**ID:** RAG-001 | **Severidad:** 🟠 Alta | **Esfuerzo:** 2 días

#### Problema
Sin retry mechanism, fallos transient de LLM causan mala UX.

#### Solución

**1. Instalar dependencia**

```bash
npm install retry
```

**2. Crear lib/retry/backoff.ts**

```typescript
// lib/retry/backoff.ts
import retry, { AbortError } from 'retry';

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  timeout?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 segundo
  maxDelay: 30000, // 30 segundos
  factor: 2, // Exponential backoff
  timeout: 60000, // 1 minuto total
  onRetry: () => {},
};

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  return new Promise((resolve, reject) => {
    const retryOperation = retry.operation({
      retries: finalConfig.maxRetries,
      factor: finalConfig.factor,
      minTimeout: finalConfig.initialDelay,
      maxTimeout: finalConfig.maxDelay,
      randomize: true, // Jitter para thundering herd
    });

    retryOperation.attempt(async (currentAttempt) => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        // No reintentar en errores definitivos
        if (isNonRetryableError(error)) {
          throw new AbortError(error);
        }

        // Verificar si quedan intentos
        if (retryOperation.retry(error)) {
          finalConfig.onRetry(error, currentAttempt);
          return;
        }

        // Agotados los reintentos
        reject(new RetryFailedError(error, currentAttempt));
      }
    });
  });
}

function isNonRetryableError(error: any): boolean {
  const nonRetryableMessages = [
    'authentication',
    'authorization',
    'invalid',
    'not found',
    'quota',
    'limit',
  ];

  const message = error.message?.toLowerCase() || '';
  return nonRetryableMessages.some(msg => message.includes(msg));
}

export class RetryFailedError extends Error {
  constructor(public originalError: Error, public attempts: number) {
    super(
      `Operation failed after ${attempts} attempts. Last error: ${originalError.message}`
    );
    this.name = 'RetryFailedError';
  }
}
```

**3. Crear wrappers para servicios externos**

```typescript
// lib/retry/wrappers.ts
import { retryWithBackoff } from './backoff';

export async function openAIWithRetry<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  return retryWithBackoff(operation, {
    maxRetries: 3,
    initialDelay: 1000,
    onRetry: (error, attempt) => {
      console.warn(`OpenAI ${context} retry ${attempt}:`, error.message);
    },
  });
}

export async function ragBackendWithRetry<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  return retryWithBackoff(operation, {
    maxRetries: 2, // Menos reintentos para backend propio
    initialDelay: 2000,
    onRetry: (error, attempt) => {
      console.warn(`RAG backend ${context} retry ${attempt}:`, error.message);
    },
  });
}

export async function supabaseWithRetry<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  return retryWithBackoff(operation, {
    maxRetries: 5, // DB reintentos más agresivos
    initialDelay: 500,
    maxDelay: 5000,
    onRetry: (error, attempt) => {
      console.warn(`Supabase ${context} retry ${attempt}:`, error.message);
    },
  });
}
```

**4. Aplicar en servicios existentes**

```typescript
// lib/services/rag-backend.ts (actualizado)
import { ragBackendWithRetry } from '@/lib/retry/wrappers';

export async function queryRAGBackend(query: string, options: RAGOptions) {
  return ragBackendWithRetry(
    async () => {
      const response = await fetch(`${RAG_BACKEND_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, ...options }),
      });

      if (!response.ok) {
        throw new Error(`RAG backend error: ${response.statusText}`);
      }

      return await response.json();
    },
    'query'
  );
}
```

```typescript
// lib/llm/openai.ts (actualizado)
import { openAIWithRetry } from '@/lib/retry/wrappers';

export async function chatWithOpenAI(messages: Message[]) {
  return openAIWithRetry(
    async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 2000,
      });

      return completion.choices[0].message;
    },
    'chat'
  );
}
```

#### Verificación

```typescript
// tests/retry/backoff.test.ts
import { retryWithBackoff, RetryFailedError } from '@/lib/retry/backoff';

describe('Retry with Backoff', () => {
  it('should retry on failure', async () => {
    let attempts = 0;

    const result = await retryWithBackoff(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Transient error');
      return 'success';
    }, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should fail after max retries', async () => {
    await expect(
      retryWithBackoff(async () => {
        throw new Error('Always fails');
      }, { maxRetries: 2 })
    ).rejects.toThrow(RetryFailedError);
  });

  it('should not retry non-retryable errors', async () => {
    await expect(
      retryWithBackoff(async () => {
        throw new Error('authentication failed');
      }, { maxRetries: 3 })
    ).rejects.toThrow('authentication failed');
  });

  it('should respect exponential backoff', async () => {
    const start = Date.now();
    const delays: number[] = [];

    await retryWithBackoff(async () => {
      const now = Date.now();
      delays.push(now - start);
      throw new Error('fail');
    }, {
      maxRetries: 3,
      initialDelay: 100,
      factor: 2,
    }).catch(() => {});

    // Verificar delays crecientes (aprox)
    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(delays[2]).toBeGreaterThan(delays[1]);
  });
});
```

#### Criterio de Done
- [ ] Exponential backoff implementado
- [ ] Max 3 retries por defecto
- [ ] Jitter aleatorio activado
- [ ] Logs de retries visibles
- [ ] No reintentar errores no recuperables
- [ ] Tests unitarios pasan
- [ ] Configuración documentada

---

### PR-008: Structured Logging

**ID:** OBS-001 | **Severidad:** 🟠 Alta | **Esfuerzo:** 3 días

#### Problema
console.log sin estructura hace imposible debuggear producción.

#### Solución

**1. Instalar dependencia**

```bash
npm install pino pino-pretty
```

**2. Crear lib/logger.ts**

```typescript
// lib/logger.ts
import pino from 'pino';

export interface LogContext {
  requestId?: string;
  userId?: string;
  workspaceId?: string;
  processId?: string;
  [key: string]: any;
}

class Logger {
  private logger: pino.Logger;

  constructor() {
    const isDev = process.env.NODE_ENV === 'development';

    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'user.password',
          'user.email',
          'user.apiKey',
        ],
        remove: true,
      },
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(isDev && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
    });
  }

  private enrich(context: LogContext): LogContext {
    return {
      ...context,
      environment: process.env.NODE_ENV,
      app: 'ali',
      version: process.env.npm_package_version || '0.0.0',
    };
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(this.enrich(context || {}), message);
  }

  info(message: string, context?: LogContext) {
    this.logger.info(this.enrich(context || {}), message);
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(this.enrich(context || {}), message);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.logger.error(
      {
        ...this.enrich(context || {}),
        error: {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          code: (error as any)?.code,
        },
      },
      message
    );
  }

  // Logger específico por dominio
  auth() {
    return {
      loginSuccess: (userId: string, method: string) =>
        this.info('User logged in successfully', { userId, method, domain: 'auth' }),
      loginFailed: (email: string, reason: string) =>
        this.warn('Login attempt failed', { email, reason, domain: 'auth' }),
      logout: (userId: string) =>
        this.info('User logged out', { userId, domain: 'auth' }),
    };
  }

  rag() {
    return {
      queryStart: (query: string, processId: string) =>
        this.debug('RAG query started', { query: query.substring(0, 100), processId, domain: 'rag' }),
      queryComplete: (processId: string, resultCount: number, duration: number) =>
        this.info('RAG query completed', { processId, resultCount, duration, domain: 'rag' }),
      queryFailed: (processId: string, error: Error) =>
        this.error('RAG query failed', error, { processId, domain: 'rag' }),
    };
  }

  db() {
    return {
      query: (table: string, operation: string, duration: number) =>
        this.debug('DB query', { table, operation, duration, domain: 'database' }),
      error: (table: string, operation: string, error: Error) =>
        this.error('DB error', error, { table, operation, domain: 'database' }),
    };
  }
}

export const logger = new Logger();

// Helper para request context
export function createRequestContext(req: Request): LogContext {
  return {
    requestId: req.headers.get('x-request-id') || generateRequestId(),
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
```

**3. Middleware para inyectar logger en requests**

```typescript
// middleware.ts (actualizar)
import { logger, createRequestContext } from './lib/logger';

export async function middleware(req: NextRequest) {
  const requestId = crypto.randomUUID();

  // Crear contexto de request
  const context = createRequestContext(req);
  context.requestId = requestId;

  // Inyectar logger en headers (para usar en routes)
  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);

  // Log request
  logger.info('Incoming request', {
    ...context,
    method: req.method,
    path: req.nextUrl.pathname,
  });

  // ... resto del middleware ...

  return res;
}
```

**4. Reemplazar console.log por logger**

```typescript
// Ejemplo en app/api/processes/[processId]/chat/route.ts
import { logger } from '@/lib/logger';

export async function POST(req: Request, { params }: { params: { processId: string } }) {
  const context = createRequestContext(req);
  context.processId = params.processId;

  try {
    logger.info('Chat request received', context);

    const { message } = await req.json();

    // Antes: console.log('Processing message:', message);
    logger.debug('Processing chat message', { ...context, messageLength: message.length });

    const response = await ragBackend.query(message);

    // Antes: console.log('RAG response:', response);
    logger.info('Chat response generated', {
      ...context,
      resultCount: response.results.length,
      duration: response.duration,
    });

    return Response.json(response);
  } catch (error) {
    // Antes: console.error('Chat error:', error);
    logger.error('Chat request failed', error as Error, context);

    return Response.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
```

**5. Configurar transporte de logs**

```typescript
// lib/logger/transports.ts
import pino from 'pino';
import { createWriteStream } from 'fs';

// Logs a archivo (solo producción)
export const fileTransport = pino.transport({
  target: 'pino/file',
  options: {
    destination: './logs/app.log',
    mkdir: true,
  },
});

// Logs a servicio externo (ej: Datadog)
export const datadogTransport = pino.transport({
  target: 'pino-datadog',
  options: {
    apiKey: process.env.DATADOG_API_KEY,
    ddsource: 'ali',
    ddtags: `env:${process.env.NODE_ENV}`,
    service: 'ali-api',
  },
});
```

#### Verificación

```bash
# Test 1: Verificar logs en desarrollo
npm run dev
# Hacer request a /api/processes/xxx/chat
# Debe ver logs formateados con colores

# Test 2: Verificar logs en producción
NODE_ENV=production npm run build
npm run start
# Debe ver logs en JSON en stdout

# Test 3: Verificar redacción de datos sensibles
logger.info('User data', {
  userId: '123',
  password: 'secret123',
  apiKey: 'sk-xxx',
});
# Debe ver: { userId: '123', password: '[Redacted]', apiKey: '[Redacted]' }

# Test 4: Verificar contexto en todos los logs
# Buscar en logs: todos deben tener requestId, environment, app, version
```

#### Criterio de Done
- [ ] Pino o Winston implementado
- [ ] Todos los endpoints usan logger
- [ ] Contexto: requestId, userId, workspaceId
- [ ] Logs en JSON en producción
- [ ] Sanitización de PII
- [ ] Logs rotan por tamaño
- [ ] Documentación de niveles de log
- [ ] Integración con sistema de logs

---

## Sprint 3: Observabilidad

**Objetivo:** Visibilidad completa del sistema para detectar y resolver incidentes rápidamente

**Duración:** 2 semanas
**Riesgo:** Medio - integración con servicios externos
**Mitigación:** Implementación gradual, testing en staging

---

### PR-009: Sentry Integration

**ID:** OBS-002 | **Severidad:** 🟠 Alta | **Esfuerzo:** 2 días

#### Problema
Errores en producción no reportados ni trackeados.

#### Solución

**1. Instalar dependencias**

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**2. Configurar Sentry**

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event, hint) {
    // Filtrar datos sensibles
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }

    // Añadir contexto de usuario si está disponible
    const user = event.user;
    if (user && user.email) {
      event.user = {
        ...user,
        email: sanitizeEmail(user.email),
      };
    }

    return event;
  },
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

function sanitizeEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // Filtrar datos sensibles del cliente
    if (event.request?.headers) {
      delete event.request.headers['cookie'];
      delete event.request.headers['authorization'];
    }
    return event;
  },
});
```

**3. Integrar con logger existente**

```typescript
// lib/logger.ts (actualizado)
import * as Sentry from '@sentry/nextjs';

class Logger {
  // ... código existente ...

  error(message: string, error?: Error, context?: LogContext) {
    // Log a Pino
    this.logger.error(
      {
        ...this.enrich(context || {}),
        error: {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          code: (error as any)?.code,
        },
      },
      message
    );

    // Enviar a Sentry
    Sentry.captureException(error || new Error(message), {
      tags: {
        domain: context?.domain,
        workspaceId: context?.workspaceId,
        processId: context?.processId,
      },
      user: context?.userId ? { id: context.userId } : undefined,
      extra: {
        ...context,
      },
    });
  }
}
```

**4. Añadir middleware de contexto**

```typescript
// middleware.ts (actualizar)
import * as Sentry from '@sentry/nextjs';

export async function middleware(req: NextRequest) {
  // Configurar contexto de Sentry para este request
  const requestId = crypto.randomUUID();

  Sentry.configureScope((scope) => {
    scope.setTag('requestId', requestId);
    scope.setTag('path', req.nextUrl.pathname);
    scope.setContext('request', {
      method: req.method,
      path: req.nextUrl.pathname,
      query: req.nextUrl.search,
    });
  });

  // ... resto del middleware ...

  // Capturar errores y enviar a Sentry
  try {
    return res;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
```

**5. Configurar variables de entorno**

```bash
# .env.production
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=ali
```

#### Verificación

```bash
# Test 1: Trigger error manual
# Añadir a alguna ruta:
throw new Error('Test Sentry error');

# Verificar que aparece en Sentry dashboard

# Test 2: Verificar captura de contexto
# Login con usuario y hacer un request
# Verificar en Sentry que el error tiene userId, workspaceId, etc.

# Test 3: Verificar sanitización
# Hacer request con datos sensibles
# Verificar en Sentry que email está parcialmente oculto

# Test 4: Verificar performance monitoring
# Hacer varias requests a diferentes endpoints
# Verificar en Sentry → Performance que aparecen traces

# Test 5: Verificar Session Replay
# Navegar por la app en producción
# Verificar en Sentry → Replay que se grabó la sesión
```

#### Criterio de Done
- [ ] Sentry configurado en server y client
- [ ] Errores capturados automáticamente
- [ ] Contexto: userId, workspaceId, requestId
- [ ] Performance monitoring activo
- [ ] Session Replay configurado
- [ ] Datos sensibles sanitizados
- [ ] Source maps upload activo
- [ ] Documentación de uso

---

## Continuación del Plan...

*Dado el largo del documento, aquí continuarían los PRs restantes siguiendo el mismo formato detallado. Los siguientes sprints incluirían:*

**Sprint 4:** Métricas Prometheus, Alertas, Audit logs completos
**Sprint 5:** Redis cache, BullMQ queues, Background processing
**Sprint 6:** RLS audit, MFA, Job queue monitoring
**Sprint 7:** Testing E2E con Playwright, RAG evaluation, Feature flags

---

## Apéndices

### A. Script de Instalación Rápida

```bash
#!/bin/bash
# setup-sprint.sh - Instalar dependencias para un sprint

SPRING=$1

if [ -z "$SPRING" ]; then
  echo "Usage: ./setup-sprint.sh <sprint-number>"
  exit 1
fi

case $SPRING in
  1)
    echo "Installing Sprint 1 dependencies..."
    npm install upstash-ratelimit @upstash/redis
    ;;
  2)
    echo "Installing Sprint 2 dependencies..."
    npm install retry pino pino-pretty
    ;;
  3)
    echo "Installing Sprint 3 dependencies..."
    npm install @sentry/nextjs
    ;;
  4)
    echo "Installing Sprint 4 dependencies..."
    npm install bullmq ioredis
    ;;
  *)
    echo "Unknown sprint: $SPRING"
    exit 1
    ;;
esac

echo "Sprint $SPRING dependencies installed successfully!"
```

### B. Checklist de Pre-Deployment

```markdown
## Pre-Deployment Checklist

### Environment
- [ ] Variables de entorno configuradas
- [ ] Secrets actualizados
- [ ] Database migrations aplicadas
- [ ] Redis configurado
- [ ] Background workers iniciados

### Monitoring
- [ ] Sentry dashboard muestra errores
- [ ] Prometheus scrapeando métricas
- [ ] Alertas configuradas
- [ ] Dashboards de Grafana creados

### Security
- [ ] Rate limiting activo
- [ ] CORS configurado
- [ ] Security headers presentes
- [ ] Webhook signatures validando
- [ ] RLS policies aplicadas

### Performance
- [ ] N+1 queries optimizados
- [ ] Cache configurado
- [ ] Timeouts configurados
- [ ] Background jobs funcionando

### Testing
- [ ] Tests unitarios pasan
- [ ] Tests de integración pasan
- [ ] Tests E2E pasan
- [ ] Load test exitoso

### Documentation
- [ ] README actualizado
- [ ] Runbooks creados
- [ ] Onboarding docs actualizados
- [ ] Architecture diagrams actualizados
```

### C. Runbooks

#### Runbook: Error Rate Alto

```markdown
# High Error Rate Runbook

## Symptoms
- Error rate > 1%
- Multiple 5xx errors
- Sentry showing spike in errors

## Diagnosis

1. Check Sentry dashboard
   - Go to https://sentry.io/organizations/ali/
   - Check recent errors
   - Identify common patterns

2. Check application logs
   ```bash
   kubectl logs -f deployment/ali-api --tail=1000
   ```

3. Check database health
   ```bash
   kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT 1"
   ```

4. Check external services
   - OpenAI status: https://status.openai.com
   - Supabase status: https://status.supabase.com

## Resolution

### If Database Issues
1. Check connection pool
2. Restart database if needed
3. Scale up if needed

### If LLM Issues
1. Check OpenAI quota
2. Switch to fallback model (gpt-3.5)
3. Enable circuit breaker

### If Application Errors
1. Identify recent deployment
2. Rollback if necessary
3. Fix bug and redeploy

## Prevention
- Add more tests
- Implement feature flags
- Improve monitoring
```

### D. Métricas y Alertas - Configuración Completa

```yaml
# prometheus.yml (para infraestructura)
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: 'ali-api'
    static_configs:
      - targets: ['ali-api:3000']
    metrics_path: '/_metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

```yaml
# alerts.yml
groups:
  - name: ali_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.endpoint }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High P95 latency"
          description: "P95 latency is {{ $value }}s for {{ $labels.endpoint }}"

      - alert: QueueBacklog
        expr: bullmq_queue_size > 1000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Large queue backlog"
          description: "Queue {{ $labels.name }} has {{ $value }} pending jobs"
```

---

## Resumen del Plan

Este plan de acción proporciona:

1. **Estructura Clara:** 6 sprints de 2 semanas con objetivos específicos
2. **Pasos Detallados:** Cada PR incluye código específico y comandos
3. **Verificación:** Tests manuales y automáticos para cada cambio
4. **Métricas:** Objetivos medibles de éxito
5. **Runbooks:** Procedimientos de incident recovery
6. **Checklists:** Verificación antes de cada deployment

**Timeline:**
- Sprint 1-2: Seguridad crítica (bloqueantes)
- Sprint 3-4: Performance y estabilidad
- Sprint 5-6: Observabilidad
- Sprint 7-8: Escalabilidad
- Sprint 9-10: Seguridad avanzada
- Sprint 11-12: Calidad y testing

**Próximos Pasos Inmediatos:**

1. Crear branch `sprint-1-seguridad-critica`
2. Iniciar con PR-001 (Rate Limiting)
3. Configurar tracking de progreso en GitHub Projects
4. Reunión de kickoff con equipo

**Contacto para dudas:**
- Tech Lead: [email]
- Slack: #ali-refactorizacion
- Docs: Confluence space "ALI Architecture"
