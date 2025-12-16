# Refactor Guardrails (No-Break Checklist)

Este documento define qué **no se puede romper** durante el refactor incremental y cómo verificarlo rápidamente.

## Principios

- Cambios pequeños y verificables; un módulo a la vez.
- Ninguna UI debe hablar directo con DB/terceros sin pasar por capa server/service (gradual).
- Toda lectura/escritura multi-tenant debe estar filtrada por `workspace_id` y/o validada por pertenencia.
- Webhooks y jobs deben ser **idempotentes** y **verificados** (firma/seguridad) antes de producir efectos.

## Checklist “no romper” (mínimo)

### Auth / Usuarios

- Login email/password sigue funcionando (`/login`).
- OAuth redirige correctamente y completa sesión (`/auth/callback`).
- Middleware mantiene:
  - redirección a `/login` cuando no hay sesión
  - verificación de email para provider `email`
  - rutas públicas siguen accesibles (login/onboarding/setup/precios/landing)

### Workspaces / multi-tenant

- Un usuario **no puede leer ni mutar** recursos de otro workspace (UI + API).
- Carga de workspace sigue poblando contexto sin regresiones:
  - chats, procesos, transcripciones, archivos, prompts, modelos, presets.
- Invitaciones y miembros siguen operativos:
  - listar miembros/invitaciones
  - invitar, revocar, reenviar
  - cambiar rol y remover miembros (respetando “último admin”)

### Chatbot

- Crear chat y persistir historial (`chats`, `messages`) funciona.
- Streaming sigue funcionando (UI no se rompe).
- Retrieval no rompe (si está habilitado y hay archivos adjuntos).

### Transcripciones

- Upload crea transcripción en `pending` y sube a Storage.
- Procesamiento cambia estados `pending → processing → completed/failed`.
- Consulta de lista por usuario/workspace sigue funcionando.

### Procesos

- Crear proceso con `workspace_id` correcto.
- Upload de documentos crea `process_documents` en `pending`.
- Ingest procesa y deja `indexing_status` coherente (`processing/ready/error`).
- Chat del proceso solo funciona cuando `indexing_status=ready`.

### Pagos Wompi

- Inicio checkout:
  - `/api/billing/checkout-redirect` crea/actualiza `subscriptions` y `invoices` y redirige a Wompi.
- Confirmación:
  - `/billing/success` consulta `/api/billing/verify-transaction` sin romper UX.
- Webhook:
  - `/api/wompi/webhook` no genera duplicados (idempotencia) y actualiza estado consistentemente.
- Entitlements:
  - middleware gating por suscripción no “bloquea” usuarios válidos.

## Regresión rápida (manual)

1. `npm run build` y `npm run start` (o tu flow Docker/Dokploy).
2. Login y navegar a un workspace.
3. Probar: chat básico, crear proceso, subir doc, ingest, chat de proceso.
4. Probar: subir audio, transcribir, ver estado.
5. Probar: checkout (sandbox) → success → confirmar que webhook actualiza subscription/invoice.

## Reglas de cambios

- No cambiar contratos de rutas (paths/payloads) sin documentar alternativa y migración.
- No cambiar esquemas DB sin migración y plan de rollback.
- Antes de tocar pagos o multi-tenant, agregar test/smoke de contrato.

