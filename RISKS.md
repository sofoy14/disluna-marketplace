# Production Risks (Phase A)

Lista de riesgos **actuales** con evidencia (archivos/funciones/políticas). No es un plan de refactor todavía; sirve para priorizar y evitar romper flujos.

## 1) Aislamiento multi-tenant y seguridad (Alta)

### 1.1 Endpoints “server role” sin autorización de recurso (Alta)

**Impacto:** un usuario autenticado (o incluso no autenticado, según el endpoint) puede leer/escribir recursos de otros workspaces/usuarios si el handler usa `SUPABASE_SERVICE_ROLE_KEY` y no valida pertenencia.

**Evidencia:**
- `app/api/transcriptions/transcribe/route.ts`
  - Usa `createClient(... env.supabaseServiceRole())` y actualiza `transcriptions` por `id` sin verificar que el `transcription_id` pertenezca al usuario autenticado.
  - Descarga de Storage usando `audio_path` recibido en el body sin verificar que corresponda a la transcripción ni al usuario.
- `app/api/transcriptions/upload/route.ts`
  - Usa service role para subir a Storage + insertar en `transcriptions`.
  - Acepta `workspace_id` desde `formData` sin validar pertenencia/rol del usuario a ese workspace.
- `app/api/billing/checkout-redirect/route.ts`, `app/api/billing/subscribe/route.ts`, `app/api/billing/checkout/route.ts`
  - Operan sobre `workspaces/subscriptions/invoices` usando service role y **no validan identidad del caller** (no hay `supabase.auth.getUser()` con cookies/token ni chequeo de membresía del workspace).

### 1.2 Endpoints de billing accesibles sin auth + RLS permisivo (Alta)

**Impacto:** exposición/modificación de datos de facturación por `workspace_id` o referencias; posible escalamiento entre tenants.

**Evidencia (endpoints sin auth):**
- `app/api/billing/invoices/route.ts` → lista invoices por `workspace_id` sin autenticar.
- `app/api/billing/subscriptions/route.ts` → lee por `workspace_id` sin autenticar (y POST crea suscripción con service role).
- `app/api/billing/payment-sources/route.ts` → lista/borra/actualiza payment sources sin autenticar.

**Evidencia (políticas RLS permisivas):**
- `supabase/migrations/20250125000005_fix_user_creation_final.sql`
  - Crea políticas `subscriptions_policy`, `payment_sources_policy`, `invoices_policy`, `transactions_policy` con `USING (true)` (permite acceso amplio si aplica a `PUBLIC`).
  - Esto hace que el uso de `db/*` con anon key en server sea “viable”, pero abre la superficie de exposición.

### 1.3 Debug endpoints expuestos en producción (Alta)

**Impacto:** exfiltración de información (config/estado) y acceso a datos por ID.

**Evidencia:**
- `app/api/debug/env-check/route.ts` → expone estado/longitudes de variables sensibles (ej. `SUPABASE_SERVICE_ROLE_KEY`, `WOMPI_*`).
- `app/api/debug/workspace/route.ts` → permite obtener un workspace por `workspace_id` y, si falla el path RLS, usa `getSupabaseServer()` (service role) para query directa.
- `app/api/debug/wompi-config/route.ts`, `app/api/debug/supabase-env/route.ts` → exponen estado de configuración.

### 1.4 Middleware “fail-open” en errores (Media/Alta)

**Impacto:** si el middleware falla (error inesperado), permite pasar la request sin gating; puede exponer páginas o degradar la seguridad esperada.

**Evidencia:**
- `middleware.ts`: `catch` retorna `NextResponse.next(...)` con comentario “permitir acceso para no bloquear”.

### 1.5 Instrumentación/telemetría local accidental (Media/Alta)

**Impacto:** fuga de datos (IDs, payloads) a un endpoint local hardcodeado; en producción añade latencia/ruido y puede romper flujos si hay bloqueos de red.

**Evidencia:**
- Múltiples `fetch('http://127.0.0.1:7242/ingest/...')` en:
  - `db/workspaces.ts`
  - `app/api/workspace/[workspaceId]/settings/route.ts`
  - `app/[locale]/[workspaceid]/settings/page.tsx`
  - `components/utility/workspace-switcher.tsx`

### 1.6 RLS owner-only vs colaboración por `workspace_members` (Media/Alta)

**Impacto:** el feature de “usuarios amigos/invitados” puede quedar parcialmente roto o forzar workarounds inseguros (service role) porque la mayoría de tablas core no contemplan membresía.

**Evidencia (políticas actuales):**
- `supabase/migrations/20240108234542_add_workspaces.sql`
  - `workspaces`: “Allow full access to own workspaces” (`user_id = auth.uid()`), sin política equivalente para miembros.
- `supabase/migrations/20240108234548_add_chats.sql`
  - `chats`: full access solo por `user_id = auth.uid()`.
- `supabase/migrations/20250204000000_add_workspace_collaboration.sql`
  - Agrega `workspace_members`/`workspace_invitations`, pero no actualiza las políticas de `workspaces/chats/messages/...` para permitir acceso por membresía.

## 2) Pagos Wompi + webhook (Alta)

### 2.1 Webhook procesa aunque la firma sea inválida (Alta)

**Impacto:** un atacante puede forjar eventos y activar suscripciones o marcar invoices como pagados.

**Evidencia:**
- `app/api/wompi/webhook/route.ts`
  - “validate signature if present” pero si falla: *loggea y continúa*.
  - Flag `WOMPI_SKIP_SIGNATURE_VALIDATION` permite saltar verificación.

### 2.2 Idempotencia insuficiente (Alta)

**Impacto:** re-procesamiento de eventos (Wompi reintenta) puede:
- reenviar emails varias veces
- reactivar suscripciones repetidamente
- sobrescribir estados sin máquina de estados clara

**Evidencia:**
- `app/api/wompi/webhook/route.ts`
  - Solo “dedup” parcial por `transactions.wompi_id` (si existe, hace update), pero no hay “early return” cuando `invoice.status === paid` ni un registro de evento con constraint único.
  - Side effects (emails, activateSubscription) se ejecutan en cada llamada.

### 2.3 Acceso a billing tables desde server usando anon client (Alta)

**Impacto:** el webhook/cron depende de RLS permisivo o de políticas inseguras; difícil de auditar y mantener.

**Evidencia:**
- `db/invoices.ts`, `db/subscriptions.ts`, `db/transactions.ts`, `db/payment-sources.ts` usan `lib/supabase/robust-client` (anon key).
- Esos módulos se usan en server handlers (webhook, cron, billing endpoints).

### 2.4 Inconsistencias de modelo/campos (Media)

**Impacto:** jobs de cobro/dunning pueden fallar silenciosamente o generar datos inconsistentes.

**Evidencia:**
- `app/api/cron/billing/route.ts` crea invoice con `wompi_reference`, pero el modelo actual en código/tipos usa `reference` (ver `db/invoices.ts`, `supabase/types.ts`).

## 3) Transcripciones (tareas largas en requests) (Alta)

**Impacto:** timeouts, costos, retries duplicados, UX pobre y riesgo de estados inconsistentes.

**Evidencia:**
- `app/api/transcriptions/transcribe/route.ts`
  - Whisper + embeddings + upsert `file_items` dentro del request.
  - `export const maxDuration = 300` (5 min) intenta mitigar, pero en muchos entornos no es suficiente.
- `app/api/transcriptions/upload/route.ts`
  - Depende de que el frontend llame a `transcribe` luego (no hay worker/cola).

## 4) Procesos (ingesta pesada en requests) (Alta/Media)

**Impacto:** timeouts + estados “processing” atascados, especialmente si Docling o OpenAI fallan.

**Evidencia:**
- `app/api/processes/[processId]/ingest/route.ts`
  - Conversión Docling (`lib/docling.ts` con timeout 120s) + chunking + embeddings + múltiples operaciones DB en un solo request.

## 5) Configuración y build/operación (Media)

### 5.1 Build puede “pasar” con errores (Media/Alta)

**Impacto:** despliegues con TypeScript roto o ESLint ignorado → fallos runtime.

**Evidencia:**
- `next.config.js`:
  - `eslint.ignoreDuringBuilds = true`
  - `typescript.ignoreBuildErrors = true`

### 5.2 Config dispersa + falta de plantilla de env (Media)

**Impacto:** ambientes inconsistentes y fallos difíciles de diagnosticar.

**Evidencia:**
- Falta `.env.example` (no existe en el repo).
- Lecturas directas de `process.env` en múltiples lugares: `middleware.ts`, `lib/admin/check-admin.ts`, `lib/wompi/config.ts`, `app/api/debug/*`, etc.

## 6) Observabilidad / soporte operativo (Media)

**Impacto:** difícil investigar incidentes; sin healthcheck ni correlación de requests.

**Evidencia:**
- No existe endpoint `GET /health` (no hay ruta dedicada).
- Logging mayormente con `console.log` sin `request-id` ni formato estructurado.
- Endpoints debug presentes y sin gating (ver sección 1.3).
