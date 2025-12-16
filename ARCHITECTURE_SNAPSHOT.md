# Architecture Snapshot (Phase A)

Este documento describe el estado **actual** del repositorio (sin proponer cambios todavía). Objetivo: tener un mapa verificable para refactor incremental sin romper flujos existentes.

## Stack (inferido del repo)

- **Frontend/Backend:** Next.js `14.1.0` (App Router, carpeta `app/`)
- **Lenguaje:** TypeScript (ej. `tsconfig.json`, rutas `*.ts`/`*.tsx`)
- **Auth:** Supabase Auth (`@supabase/ssr` + cookies en server + middleware)
- **DB:** Postgres vía **Supabase** (migraciones en `supabase/migrations/*.sql`, tipos generados en `supabase/types.ts`)
- **Storage:** Supabase Storage (bucket `files` + buckets para imágenes; ver `db/storage/*`)
- **Pagos:** Wompi (Web Checkout + API + webhook)
- **LLM/IA:** OpenAI SDK (`openai`) + LangChain (`langchain`, `@langchain/*`) + `ai` (streaming helpers)
- **i18n:** `next-i18n-router` (`i18nConfig.js`, rutas con `app/[locale]/...`)
- **Deploy/hosting:** Docker (`Dockerfile`, `docker-compose.yml`) con comentarios orientados a Dokploy.
- **PWA:** `next-pwa` (ver `next.config.js`, `worker/index.js` para SW logs).

## Diagrama textual de módulos (real)

```
Browser (Client Components)
  ├─ app/[locale]/[workspaceid]/*  (UI multi-workspace)
  │   ├─ components/* (UI + hooks)
  │   └─ db/*         (queries usando Supabase browser client + RLS)
  │
  └─ calls → Next Route Handlers (app/api/*)
        ├─ chat/*            → LLM providers + tools + retrieval
        ├─ processes/*       → storage + docling + embeddings + RPCs
        ├─ transcriptions/*  → storage + OpenAI Whisper + embeddings
        ├─ billing/*         → Wompi checkout + DB billing
        ├─ wompi/webhook     → procesa eventos y actualiza billing
        └─ workspace/*       → settings + members + invitations + audit

Server-side integrations
  ├─ Supabase (anon+cookies)  → lib/supabase/server.ts, middleware.ts
  ├─ Supabase (service role)  → lib/supabase/server-client.ts
  ├─ Wompi API                → lib/wompi/*
  ├─ OpenAI (chat/embeddings) → openai SDK
  └─ Docling Serve            → lib/docling.ts (DOCLING_BASE_URL)
```

## Árbol de carpetas (resumido)

```
app/
  api/
    auth/ billing/ chat/ cron/ debug/ processes/ retrieval/ transcriptions/ user/ workspace/ wompi/ ...
  auth/ (callback SSR de supabase)
  [locale]/
    login/ onboarding/ precios/ billing/success/ ...
    [workspaceid]/
      chat/[chatid]/ processes/[processId]/new/ transcriptions/ settings/
components/
  chat/ billing/ auth/ ui/ ...
context/                  (estado global ALIContext)
db/                       (data access wrappers por tabla + storage helpers)
lib/
  supabase/ env/ billing/ wompi/ server/ tools/ retrieval/ ...
supabase/
  migrations/ config.toml seed.sql types.ts
scripts/                  (helpers prod/dev)
__tests__/ test/          (Jest + Playwright subproject)
middleware.ts             (auth + i18n + gating billing)
next.config.js            (PWA + ignores build errors)
docker-compose.yml + Dockerfile
```

## Rutas críticas (UI) y qué tocan

### Autenticación / onboarding

- `app/[locale]/login/*` → Supabase Auth (client)
- `app/auth/callback/route.ts` → Supabase SSR callback (cookies)
- `middleware.ts` → protección de rutas, verificación email, gating de suscripción

### Multi-tenant / workspace

- `app/[locale]/[workspaceid]/layout.tsx` (client)  
  Carga “contexto de workspace” y pobla `ALIContext` usando `db/*`:
  - `db/workspaces.ts` (`getWorkspaceById`)
  - `db/chats.ts` (`getChatsByWorkspaceId`)
  - `db/processes.ts` (`getProcessWorkspacesByWorkspaceId`)
  - `db/transcriptions.ts` (`getTranscriptionsByWorkspace`)
  - `db/files.ts`, `db/prompts.ts`, `db/models.ts`, `db/presets.ts`

### Chatbot

- `app/[locale]/[workspaceid]/chat/page.tsx` + `app/[locale]/[workspaceid]/chat/[chatid]/page.tsx` → `components/chat/ChatUI`
- Persistencia: tablas `chats`, `messages`, `chat_files`, etc (ver `db/chats.ts`, `db/messages.ts`, `db/chat-files.ts`)
- LLM: route handlers `app/api/chat/*` (ej. `legal-agent`, `langchain-agent`, `legal-writing`)

### Transcripciones

- `app/[locale]/[workspaceid]/transcriptions/page.tsx`
  - `GET /api/transcriptions` (lista)
  - `POST /api/transcriptions/upload` (upload + crea registro)
  - `POST /api/transcriptions/transcribe` (procesamiento Whisper + embeddings)

### Procesos

- `app/[locale]/[workspaceid]/processes/new/page.tsx`
  - `POST /api/processes/create`
  - `POST /api/processes/:processId/upload`
  - `POST /api/processes/:processId/ingest`

### Billing / pagos

- `app/[locale]/precios/page.tsx` + onboarding (`app/[locale]/onboarding/page.tsx`, `app/(auth)/onboarding/page.tsx`)
  - consulta `GET /api/billing/plans`, `GET /api/billing/offers`
  - inicia checkout vía `GET /api/billing/checkout-redirect?...`
- `app/[locale]/billing/success/page.tsx`
  - consulta `GET /api/billing/verify-transaction?...`

## Rutas críticas (API) y qué tocan

### Workspaces / colaboración

- `app/api/workspace/[workspaceId]/settings` → `db/workspaces.ts` + `db/workspace-members.ts`
- `app/api/workspace/[workspaceId]/members` → `db/workspace-members.ts`
- `app/api/workspace/[workspaceId]/invitations` → `db/workspace-invitations.ts`
- `app/api/workspace/[workspaceId]/audit-logs` → `db/workspace-audit-logs.ts` (RPC `log_workspace_action`)

### Chat / retrieval

- `app/api/chat/legal-agent` → OpenAI tool calling + toolkit (`lib/tools/*`)
- `app/api/chat/langchain-agent` → LangChain flows
- `app/api/retrieval/retrieve` → búsqueda semántica sobre `file_items` (RPCs/queries)

### Transcripciones

- `app/api/transcriptions/upload` → Storage `files` + tabla `transcriptions`
- `app/api/transcriptions/transcribe` → OpenAI Whisper + embeddings + tabla `file_items`
- `app/api/transcriptions/link-process` → tabla `process_transcriptions`

### Procesos

- `app/api/processes/create` → tabla `processes`
- `app/api/processes/[processId]/upload` → Storage `files` + tabla `process_documents`
- `app/api/processes/[processId]/ingest` → Docling (`DOCLING_BASE_URL`) + embeddings + tabla `process_document_sections`
- `app/api/processes/[processId]/chat` → RAG sobre `process_document_sections` + tabla `messages`

### Billing / Wompi

- Inicio checkout:
  - `app/api/billing/checkout` (dev/legacy) → genera payload de checkout
  - `app/api/billing/checkout-redirect` (principal en UI) → crea `subscription` + `invoice` y redirige a Wompi
  - `app/api/billing/subscribe` (alternativa JSON) → crea `subscription` + `invoice` y retorna checkout_data
- Confirmación:
  - `app/api/billing/verify-transaction` → consulta Wompi + cruza con `invoices/subscriptions`
- Webhook:
  - `app/api/wompi/webhook` → procesa `transaction.updated` y actualiza `transactions/invoices/subscriptions`
- Recurrente/dunning:
  - `app/api/cron/billing`, `app/api/cron/dunning` → Wompi API + billing tables (protegido por `WOMPI_CRON_SECRET`)

## Flujo Wompi (actual)

1. UI (`/precios` o onboarding) construye URL `GET /api/billing/checkout-redirect?plan_id=...&workspace_id=...`.
2. `checkout-redirect`:
   - valida config Wompi (`lib/wompi/config.ts`)
   - crea/actualiza `subscriptions` (estado inicial `pending`)
   - crea `invoices` (estado `pending`, `reference = wompiReference`)
   - genera firma de integridad (`lib/wompi/utils.ts`) y redirige a `https://checkout.wompi.co/p/?...`
3. Wompi redirige al usuario a `/billing/success` con `transaction_id` o `reference`.
4. UI llama `GET /api/billing/verify-transaction` para pintar estado.
5. Wompi llama `POST /api/wompi/webhook` (evento `transaction.updated`):
   - crea/actualiza `transactions` por `wompi_id`
   - marca invoice `paid`/`failed`
   - activa subscription (`active`) y setea `profiles.onboarding_completed`
   - envía emails (éxito/fallo)

## Flujo de transcripción (actual)

1. UI (transcriptions page) hace `POST /api/transcriptions/upload` con `multipart/form-data`:
   - sube audio a Storage bucket `files`
   - crea registro en `transcriptions` con `status = pending` y `audio_path`
2. UI dispara `POST /api/transcriptions/transcribe` con `{ transcription_id, audio_path }`:
   - actualiza `transcriptions.status = processing`
   - descarga audio desde Storage
   - Whisper (`openai.audio.transcriptions.create`) → `transcript`
   - genera embeddings de chunks y upsert en `file_items`
   - actualiza `transcriptions` con `status = completed`/`failed`

