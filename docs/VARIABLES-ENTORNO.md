# Variables de Entorno Requeridas

Este documento lista todas las variables de entorno necesarias para que la aplicación funcione correctamente.

## 🔴 Variables OBLIGATORIAS (Críticas)

### Supabase - Autenticación y Base de Datos
```env
# URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co

# Clave pública (anon key) - Usada en el cliente
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clave de servicio (service role key) - Usada en el servidor
# ⚠️ MANTÉN ESTA CLAVE SEGURA - Tiene permisos administrativos completos
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Cómo obtenerlas:**
1. Ve a [supabase.com](https://supabase.com) → Tu proyecto → Settings → API
2. Copia la "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
3. Copia la "anon" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copia la "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🟡 Variables RECOMENDADAS (Para funcionalidad completa)

### URLs de la Aplicación
```env
# URL base de tu aplicación (usada para OAuth redirects y callbacks)
# Desarrollo: http://localhost:3000
# Producción: https://aliado.pro (o tu dominio)
NEXT_PUBLIC_APP_URL=https://aliado.pro

# Alternativa a NEXT_PUBLIC_APP_URL (se usa como fallback)
NEXT_PUBLIC_SITE_URL=https://aliado.pro
```

**Nota:** Si no se configuran, el código usa `https://aliado.pro` como fallback, pero es recomendable configurarlas explícitamente.

### Billing/Pagos (Wompi)
```env
# Habilitar/deshabilitar sistema de facturación
NEXT_PUBLIC_BILLING_ENABLED=true

# Ambiente de Wompi: sandbox o production
WOMPI_ENVIRONMENT=sandbox

# Llave pública de Wompi (visible en el cliente)
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_xxxxx

# Llave privada de Wompi (solo servidor)
WOMPI_PRIVATE_KEY=prv_test_xxxxx

# Secreto de integridad para firmas SHA256
WOMPI_INTEGRITY_SECRET=test_integrity_xxxxx

# Secreto para validar webhooks HMAC-SHA256
WOMPI_WEBHOOK_SECRET=webhook_secret_xxxxx

# URL base de la API de Wompi
NEXT_PUBLIC_WOMPI_BASE_URL=https://sandbox.wompi.co

# Secreto para tareas programadas (cron jobs)
WOMPI_CRON_SECRET=cron_secret_xxxxx
```

---

## 🟢 Variables OPCIONALES (Para funcionalidades específicas)

### APIs de LLM y Embeddings
```env
# OpenRouter API Key - Para acceder a modelos LLM y embeddings
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI API Key (alternativa a OpenRouter)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Anthropic API Key (alternativa a OpenRouter)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Búsqueda Web
```env
# Serper API Key - Para búsqueda web (Google Search API)
SERPER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Custom Search Engine (alternativa a Serper)
GOOGLE_CSE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CSE_CX=xxxxxxxxxxxxx

# Firecrawl API Key - Para extracción avanzada de contenido web
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Edge Config (Vercel)
```env
# URL del Edge Config de Vercel (para variables dinámicas)
EDGE_CONFIG=https://edge-config.vercel.app/xxxxx
```

### Whitelist de Emails (Registro)
```env
# Lista de dominios permitidos para registro (separados por comas)
EMAIL_DOMAIN_WHITELIST=ejemplo.com,otro-dominio.com

# Lista de emails específicos permitidos (separados por comas)
EMAIL_WHITELIST=admin@ejemplo.com,user@ejemplo.com
```

---

## 📋 Archivo .env.local Completo (Plantilla)

Crea un archivo `.env.local` en la raíz del proyecto con este contenido:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# 🔴 OBLIGATORIAS - Supabase
# ═══════════════════════════════════════════════════════════════════════════════
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ═══════════════════════════════════════════════════════════════════════════════
# 🟡 RECOMENDADAS - URLs y Configuración
# ═══════════════════════════════════════════════════════════════════════════════
NEXT_PUBLIC_APP_URL=https://aliado.pro
NEXT_PUBLIC_SITE_URL=https://aliado.pro

# ═══════════════════════════════════════════════════════════════════════════════
# 🟡 RECOMENDADAS - Billing/Wompi
# ═══════════════════════════════════════════════════════════════════════════════
NEXT_PUBLIC_BILLING_ENABLED=true
WOMPI_ENVIRONMENT=sandbox
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_xxxxx
WOMPI_PRIVATE_KEY=prv_test_xxxxx
WOMPI_INTEGRITY_SECRET=test_integrity_xxxxx
WOMPI_WEBHOOK_SECRET=webhook_secret_xxxxx
NEXT_PUBLIC_WOMPI_BASE_URL=https://sandbox.wompi.co
WOMPI_CRON_SECRET=cron_secret_xxxxx

# ═══════════════════════════════════════════════════════════════════════════════
# 🟢 OPCIONALES - APIs de LLM
# ═══════════════════════════════════════════════════════════════════════════════
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ═══════════════════════════════════════════════════════════════════════════════
# 🟢 OPCIONALES - Búsqueda Web
# ═══════════════════════════════════════════════════════════════════════════════
SERPER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# GOOGLE_CSE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# GOOGLE_CSE_CX=xxxxxxxxxxxxx
# FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ═══════════════════════════════════════════════════════════════════════════════
# 🟢 OPCIONALES - Edge Config y Whitelist
# ═══════════════════════════════════════════════════════════════════════════════
# EDGE_CONFIG=https://edge-config.vercel.app/xxxxx
# EMAIL_DOMAIN_WHITELIST=ejemplo.com,otro-dominio.com
# EMAIL_WHITELIST=admin@ejemplo.com,user@ejemplo.com
```

---

## 🔍 Verificación de Variables

### Script de Verificación
El proyecto incluye un script para verificar que todas las variables requeridas estén configuradas:

```bash
node scripts/production/check-env.js
```

### Verificación Manual
Puedes verificar manualmente que las variables estén cargadas:

```bash
# En desarrollo
npm run dev
# Revisa la consola - debería mostrar las URLs configuradas

# En producción
npm run build
npm start
```

---

## ⚠️ Notas Importantes

1. **Seguridad:**
   - **NUNCA** subas el archivo `.env.local` al repositorio Git
   - El archivo `.env.local` está en `.gitignore` por defecto
   - Las variables con prefijo `NEXT_PUBLIC_` son visibles en el cliente
   - `SUPABASE_SERVICE_ROLE_KEY` tiene permisos administrativos - manténla segura

2. **Prefijos:**
   - `NEXT_PUBLIC_*` → Variables accesibles en el cliente (navegador)
   - Sin prefijo → Variables solo en el servidor

3. **OAuth y Callbacks:**
   - `NEXT_PUBLIC_APP_URL` o `NEXT_PUBLIC_SITE_URL` son **críticas** para OAuth
   - Sin estas variables, los redirects OAuth pueden fallar
   - En producción, usa siempre HTTPS

4. **Fallbacks:**
   - Si `NEXT_PUBLIC_APP_URL` no está configurada, el código usa `https://aliado.pro`
   - Esto puede causar problemas si tu dominio es diferente

---

## 🚀 Configuración Rápida para Desarrollo

Para empezar rápidamente, configura solo las variables obligatorias:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Luego agrega las demás según necesites las funcionalidades.

---

## 📚 Referencias

- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Next.js - Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [OpenRouter API](https://openrouter.ai/docs)
- [Wompi Documentation](https://docs.wompi.co)

