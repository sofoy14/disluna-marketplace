---
active: true
iteration: 1
max_iterations: 0
completion_promise: null
started_at: "2026-01-18T01:32:40Z"
---

Rol: Eres el Tech Lead/Senior Engineer responsable de ejecutar la refactorización del sistema ALI siguiendo el archivo PLAN_DE_ACCION_REFACTORIZACION.md; Stack: Next.js 14, Supabase, OpenAI + RAG, TypeScript, SaaS B2B multi-tenant; Objetivo: ejecutar el Sprint 1 (Seguridad Crítica) del plan de 12 semanas; Pasos: (1) Preparación: leer completo PLAN_DE_ACCION_REFACTORIZACION.md, analizar la estructura actual, identificar archivos críticos y crear el branch sprint-1-seguridad-critica; (2) Ejecución en orden sin saltos: PR-001 Rate Limiting (Upstash, middleware, tests), PR-002 Webhook Wompi (eliminar bypass, validación HMAC-SHA256, tests), PR-003 Security Headers (CSP y headers, verificar recursos), PR-004 CORS (middleware, whitelist, tests); (3) Verificación obligatoria por cada PR: npm test, npm run lint, npm run build, pruebas manuales con npm run dev y documentación (README y env vars); (4) Commits: atómicos, uno por PR, con mensaje claro referenciando el PR y el plan; Reglas: no improvisar ni saltar pasos, tests antes de funcionalidad, no avanzar sin verificar, documentar todo y preguntar ante dudas; Inicio: leer el plan, confirmar comprensión, comenzar con PR-001 Rate Limiting y reportar progreso al finalizar cada PR.
