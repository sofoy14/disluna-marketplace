# Auditoría Completa: Variables de Entorno en Dokploy

## 📋 Resumen Ejecutivo

Se realizó una auditoría integral del sistema de manejo de variables de entorno, identificando la causa raíz de los errores de despliegue en Dokploy y aplicando soluciones robustas.

### Problema Identificado

Las variables `NEXT_PUBLIC_*` fallan en Dokploy porque:
1. **Dokploy inyecta variables en runtime**, no durante el build de Docker
2. **El script `generate-env.js`** corre durante `npm run build` con valores vacíos
3. **El cliente de Supabase** no encuentra las variables al inicializarse

---

## 🔧 Soluciones Implementadas

### 1. Nuevo Sistema de Runtime Env (`lib/env/client-env.ts`)

**Nuevo archivo** que proporciona:
- Inicialización temprana de variables desde `window.__ENV__`
- Fallback a meta tags si `window.__ENV__` está vacío
- Cache de variables para evitar lecturas repetidas
- Funciones de diagnóstico (`checkClientEnv`, `waitForClientEnv`)

```typescript
// Uso
import { getClientEnv, initClientEnv } from "@/lib/env/client-env"

initClientEnv() // Llamar lo antes posible
const url = getClientEnv("NEXT_PUBLIC_SUPABASE_URL", { required: true })
```

### 2. Actualización de Clientes Supabase

Todos los clientes del navegador ahora usan el nuevo sistema:

- ✅ `lib/supabase/browser-client.ts` - Actualizado
- ✅ `lib/supabase/client.ts` - Actualizado  
- ✅ `lib/supabase/robust-client.ts` - Actualizado
- ✅ `lib/env/public-env.ts` - Re-exporta desde client-env

### 3. Layout Mejorado (`app/[locale]/layout.tsx`)

**Cambios clave:**
- Script inline que inyecta variables ANTES de cargar `env.js`
- Prioridad: Runtime env vars > build-time values
- Todos los meta tags necesarios para fallback

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        var env = ${JSON.stringify(publicEnv)};
        window.__ENV__ = window.__ENV__ || {};
        for (var key in env) {
          if (env[key] && env[key].trim && env[key].trim() !== '') {
            window.__ENV__[key] = env[key];
          }
        }
      })();
    `
  }}
/>
```

---

## 📁 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `lib/env/client-env.ts` | **NUEVO** - Sistema robusto de runtime env |
| `lib/env/public-env.ts` | Re-exporta desde client-env |
| `lib/supabase/browser-client.ts` | Usa client-env |
| `lib/supabase/client.ts` | Usa client-env |
| `lib/supabase/robust-client.ts` | Usa client-env |
| `app/[locale]/layout.tsx` | Inyección inline de variables |

---

## 🚀 Instrucciones para Dokploy

### Opción 1: Build Arguments (Recomendada)

1. Ve a **Dokploy** → Tu proyecto → **Settings** → **Build**
2. En **Build Arguments**, agrega:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
NEXT_PUBLIC_BILLING_ENABLED=false
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=
NEXT_PUBLIC_WOMPI_BASE_URL=https://sandbox.wompi.co
```

3. En **Environment Variables**, agrega las mismas variables
4. **Reconstruye** el deployment

### Opción 2: Solo Environment Variables

Con los cambios implementados, ahora también puedes configurar solo en **Environment Variables** (sin Build Args), ya que el sistema de runtime env inyectará las variables en el cliente.

---

## 🧪 Verificación Post-Despliegue

### 1. Verificar en Consola del Navegador

```javascript
// Debería mostrar las variables configuradas
console.log('Environment:', window.__ENV__);

// Verificar Supabase
console.log('Has URL:', !!window.__ENV__.NEXT_PUBLIC_SUPABASE_URL);
console.log('Has Key:', !!window.__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```

### 2. Debug Mode

Agrega `?debug=1` a la URL para ver logs adicionales:

```
[layout] Runtime env injected: {hasSupabaseUrl: true, hasSupabaseKey: true}
```

### 3. Verificar Meta Tags

```javascript
// En consola
document.querySelector('meta[name="supabase-url"]')?.content;
document.querySelector('meta[name="supabase-anon-key"]')?.content;
```

---

## 📊 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUILD TIME                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Dockerfile  │───▶│    Build     │───▶│   env.js     │      │
│  │  ARGs vacíos │    │    Next.js   │    │  (fallback)  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       RUNTIME (Dokploy)                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Dokploy    │───▶│   layout.tsx │───▶│  window.__ENV__    │
│  │   Env Vars   │    │  (injects)   │    │  (runtime)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                              │                  │
│                                              ▼                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Supabase Client (browser)                   │  │
│  │  1. Lee window.__ENV__ (runtime)                         │  │
│  │  2. Fallback a meta tags                                 │  │
│  │  3. Inicializa cliente                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Consideraciones Importantes

### Variables NEXT_PUBLIC_* en Next.js

- **Build-time**: Next.js puede inlinear estas variables en el bundle
- **Runtime**: El sistema implementado ahora las sobrescribe en `window.__ENV__`
- **Server Components**: Usan `lib/env/runtime-env.ts` que lee `process.env`
- **Client Components**: Usan `lib/env/client-env.ts` que lee `window.__ENV__`

### Compatibilidad

- ✅ Server Components: Sin cambios (usan runtime-env.ts)
- ✅ Client Components: Usan el nuevo sistema
- ✅ API Routes: Sin cambios (usaban process.env)
- ✅ Middleware: Sin cambios

---

## 📝 Archivos de Documentación

- `docs/DOKPLOY-DEPLOYMENT.md` - Guía completa de despliegue
- `SOLUCION-ERROR-VARIABLES-ENTORNO.md` - Solución de problemas básica

---

## ✅ Checklist Post-Implementación

- [ ] Variables configuradas en Dokploy Build Arguments
- [ ] Variables configuradas en Dokploy Environment Variables
- [ ] Deployment reconstruido (no solo reiniciado)
- [ ] Verificado en navegador: `window.__ENV__` tiene valores
- [ ] Login funciona correctamente
- [ ] No hay errores de Supabase en consola

---

## 🆘 Si el Problema Persiste

1. **Limpiar caché de Dokploy**:
   ```bash
   # En Dokploy, reconstruir desde cero
   ```

2. **Verificar logs de build**:
   - Buscar "Generated public/env.js" en los logs
   - Verificar que no hay warnings de variables faltantes

3. **Verificar en el contenedor**:
   ```bash
   # SSH al contenedor de Dokploy
   env | grep NEXT_PUBLIC
   ```

4. **Abrir issue** con:
   - Logs del navegador (F12 → Console)
   - Output de `window.__ENV__`
   - URL de la app con `?debug=1`
