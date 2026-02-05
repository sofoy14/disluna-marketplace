# Guía de Despliegue en Dokploy

Esta guía explica cómo desplegar correctamente esta aplicación Next.js en Dokploy.

## ⚠️ Problema Conocido: Variables de Entorno

Las variables `NEXT_PUBLIC_*` necesitan estar disponibles **durante el build** de Next.js, pero Dokploy las inyecta solo en **runtime**. Esto causa errores como:

```
Error: Missing Supabase configuration. Please check environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## ✅ Solución

### Opción 1: Configurar Build Arguments en Dokploy (Recomendada)

1. Ve a tu proyecto en Dokploy
2. Navega a **Settings** → **Build**
3. En la sección **Build Arguments**, agrega:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
NEXT_PUBLIC_BILLING_ENABLED=false
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=tu-wompi-key
NEXT_PUBLIC_WOMPI_BASE_URL=https://sandbox.wompi.co
```

4. **Reconstruye el deployment**

### Opción 2: Configurar en docker-compose.yml

Si usas `docker-compose.yml` en Dokploy, asegúrate de pasar las variables como `args`:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
        - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
        - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
        - NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
        - NEXT_PUBLIC_BILLING_ENABLED=${NEXT_PUBLIC_BILLING_ENABLED:-false}
        - NEXT_PUBLIC_WOMPI_PUBLIC_KEY=${NEXT_PUBLIC_WOMPI_PUBLIC_KEY:-}
        - NEXT_PUBLIC_WOMPI_BASE_URL=${NEXT_PUBLIC_WOMPI_BASE_URL:-https://sandbox.wompi.co}
```

Y en Dokploy, configura las mismas variables en **Environment Variables**.

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

### API Keys (Opcionales)

| Variable | Descripción |
|----------|-------------|
| `OPENROUTER_API_KEY` | Para acceso a modelos de IA |
| `OPENAI_API_KEY` | Para OpenAI |
| `FIRECRAWL_API_KEY` | Para scraping web |
| `SERPER_API_KEY` | Para búsquedas Google |

## 🐛 Troubleshooting

### Error: "Missing Supabase configuration"

1. Verifica que las variables estén configuradas en Dokploy
2. Asegúrate de que estén tanto en **Build Arguments** como en **Environment Variables**
3. Reconstruye el deployment (no solo reinicies el contenedor)

### Verificar en el navegador

Abre la consola del navegador y ejecuta:

```javascript
console.log('Environment:', window.__ENV__);
```

Deberías ver las variables configuradas.

### Logs de diagnóstico

El sistema ahora incluye logs de debug. En desarrollo o con `?debug=1` en la URL, verás:

```
[layout] Runtime env injected: {hasSupabaseUrl: true, hasSupabaseKey: true}
```

## 📝 Notas Técnicas

### Cómo funciona el sistema

1. **Build-time**: El Dockerfile acepta `ARG` para las variables `NEXT_PUBLIC_*`
2. **Runtime**: El layout inyecta las variables via script inline en el `<head>`
3. **Cliente**: `window.__ENV__` se lee antes de inicializar Supabase

### Archivos clave

- `lib/env/client-env.ts` - Sistema de runtime env
- `lib/supabase/browser-client.ts` - Cliente de Supabase del navegador
- `app/[locale]/layout.tsx` - Inyección de variables en el HTML

## 🚀 Comandos útiles

```bash
# Verificar variables localmente
node scripts/check-env.js

# Generar env.js manualmente
node scripts/generate-env.js

# Build local con variables
NEXT_PUBLIC_SUPABASE_URL=xxx NEXT_PUBLIC_SUPABASE_ANON_KEY=yyy npm run build
```
