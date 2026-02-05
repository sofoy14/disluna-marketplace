# Guía de Despliegue en Dokploy

Esta guía explica cómo desplegar correctamente esta aplicación Next.js en Dokploy.

## ⚠️ Problema Conocido: Variables de Entorno

Las variables `NEXT_PUBLIC_*` necesitan estar disponibles **durante el build** de Next.js, pero Dokploy las inyecta solo en **runtime**. Esto causa errores como:

```
Error: Missing Supabase configuration. Please check environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
```

O errores durante el build:

```
Error: Missing required environment variable SUPABASE_SERVICE_ROLE_KEY
```

## ✅ Solución

### Configurar Build Arguments en Dokploy (REQUERIDO)

1. Ve a tu proyecto en Dokploy
2. Navega a **Settings** → **Build**
3. En la sección **Build Arguments**, agrega TODAS estas variables:

#### Variables Públicas (NEXT_PUBLIC_*)

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
NEXT_PUBLIC_BILLING_ENABLED=false
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_...
NEXT_PUBLIC_WOMPI_BASE_URL=https://sandbox.wompi.co
```

#### Variables Server-Side (REQUERIDAS para el build)

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
WOMPI_PRIVATE_KEY=prv_test_...
WOMPI_INTEGRITY_SECRET=test_integrity_...
WOMPI_WEBHOOK_SECRET=test_events_...
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-proj-...
FIRECRAWL_API_KEY=fc-...
SERPER_API_KEY=...
ADMIN_EMAILS=admin@ejemplo.com
ADMIN_PASSWORD=tu-password
```

4. En **Environment Variables**, agrega las mismas variables (Dokploy las inyectará en runtime)

5. **IMPORTANTE**: Haz clic en **Rebuild** (no solo reiniciar)

---

## 🔧 Variables de Entorno Requeridas

### Mínimas (Obligatorias)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase | `eyJhbGciOiJIUzI1NiIs...` |

### Recomendadas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | URL de tu aplicación | `https://aliado.pro` |
| `NEXT_PUBLIC_SITE_URL` | URL del sitio (alias) | `https://aliado.pro` |
| `NEXT_PUBLIC_BILLING_ENABLED` | Habilitar facturación | `true` o `false` |

### Wompi (Pagos)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | Clave pública de Wompi |
| `WOMPI_PRIVATE_KEY` | Clave privada de Wompi |
| `WOMPI_INTEGRITY_SECRET` | Secreto de integridad |
| `WOMPI_WEBHOOK_SECRET` | Secreto para webhooks |

### API Keys (Opcionales)

| Variable | Descripción |
|----------|-------------|
| `OPENROUTER_API_KEY` | Para acceso a modelos de IA |
| `OPENAI_API_KEY` | Para OpenAI |
| `FIRECRAWL_API_KEY` | Para scraping web |
| `SERPER_API_KEY` | Para búsquedas Google |

---

## 🐛 Troubleshooting

### Error: "Missing Supabase configuration"

1. Verifica que las variables estén configuradas en **Build Arguments**
2. Verifica que las variables estén configuradas en **Environment Variables**
3. Haz clic en **Rebuild** (no solo restart)

### Error: "Missing required environment variable SUPABASE_SERVICE_ROLE_KEY"

Este error ocurre durante el build. Asegúrate de agregar **TODAS** las variables server-side en **Build Arguments**:
- `SUPABASE_SERVICE_ROLE_KEY`
- `WOMPI_PRIVATE_KEY`
- `WOMPI_INTEGRITY_SECRET`
- etc.

### Verificar en el navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
console.log('Environment:', window.__ENV__);
```

Deberías ver las variables configuradas.

### Debug Mode

Agrega `?debug=1` a la URL para ver logs adicionales:

```
[layout] Runtime env injected: {hasSupabaseUrl: true, hasSupabaseKey: true}
```

---

## 📝 Notas Técnicas

### Cómo funciona el sistema

1. **Build-time**: El Dockerfile acepta `ARG` para todas las variables
2. **Runtime**: El layout inyecta las variables via script inline en el `<head>`
3. **Cliente**: `window.__ENV__` se lee antes de inicializar Supabase

### Diferencia entre Build Args y Environment Variables

| | Build Arguments | Environment Variables |
|---|---|---|
| **Cuándo** | Durante `docker build` | Durante `docker run` |
| **Para qué** | Compilar la app | Runtime de la app |
| **NEXT_PUBLIC_*** | ✅ Requerido | ✅ Requerido |
| **Server-side** | ✅ Requerido | ✅ Requerido |

### Archivos clave

- `Dockerfile` - Define ARGs para build
- `docker-compose.yml` - Pasa ARGs al build
- `lib/env/client-env.ts` - Sistema de runtime env
- `lib/supabase/browser-client.ts` - Cliente de Supabase del navegador
- `app/[locale]/layout.tsx` - Inyección de variables en el HTML

---

## 🚀 Comandos útiles

```bash
# Verificar variables localmente
node scripts/check-env.js

# Generar env.js manualmente
node scripts/generate-env.js

# Build local con variables
NEXT_PUBLIC_SUPABASE_URL=xxx NEXT_PUBLIC_SUPABASE_ANON_KEY=yyy SUPABASE_SERVICE_ROLE_KEY=zzz npm run build
```

---

## ⚠️ Errores Comunes

### "Dynamic server usage: Route /api/... couldn't be rendered statically"

Este error es **normal** durante el build. Las rutas API que usan `cookies()` o `request.url` ahora están marcadas como dinámicas (`export const dynamic = 'force-dynamic'`).

### "Invalid Supabase URL format"

Verifica que `NEXT_PUBLIC_SUPABASE_URL` tenga el formato correcto:
- ✅ `https://abc123.supabase.co`
- ❌ `http://supabase_kong:8000`
