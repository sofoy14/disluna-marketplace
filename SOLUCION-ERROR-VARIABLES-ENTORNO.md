# Solución: Error de Variables de Entorno de Supabase

## 🔴 Error

```
@supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

Este error indica que las variables de entorno de Supabase no están configuradas o no están disponibles en el cliente.

## ✅ Solución Rápida

### 1. Crear archivo `.env.local`

Crea un archivo `.env.local` en la **raíz del proyecto** (mismo nivel que `package.json`):

```env
# ═══════════════════════════════════════════════════════════════════════════════
# 🔴 OBLIGATORIAS - Sin estas, la aplicación NO funcionará
# ═══════════════════════════════════════════════════════════════════════════════

# URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co

# Clave pública (anon key) - CRÍTICA para el cliente
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clave de servicio (service role key) - CRÍTICA para el servidor
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ═══════════════════════════════════════════════════════════════════════════════
# 🟡 RECOMENDADAS - Para OAuth y funcionalidad completa
# ═══════════════════════════════════════════════════════════════════════════════

# URL de tu aplicación (crítica para OAuth)
NEXT_PUBLIC_APP_URL=https://aliado.pro
# O en desarrollo:
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Obtener las Credenciales de Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión y selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia los siguientes valores:

   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **MANTÉN ESTA SEGURA**

### 3. Reiniciar el Servidor

**IMPORTANTE:** Después de crear o modificar `.env.local`, **debes reiniciar el servidor**:

```bash
# Detén el servidor (Ctrl+C)
# Luego reinícialo:
npm run dev
```

O si estás en producción:
```bash
npm run build
npm start
```

## 🔍 Verificación

### Verificar que las variables estén configuradas:

```bash
node scripts/production/check-env.js
```

Este script te mostrará qué variables están configuradas y cuáles faltan.

### Verificar en el código:

Abre la consola del navegador (F12) y ejecuta:

```javascript
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurada' : 'NO CONFIGURADA')
```

## ⚠️ Notas Importantes

1. **Prefijo `NEXT_PUBLIC_`**: 
   - Las variables con este prefijo son **visibles en el cliente** (navegador)
   - Son necesarias para que el código del cliente pueda crear el cliente de Supabase
   - **NO** incluyas información sensible en variables con este prefijo

2. **Archivo `.env.local`**:
   - Este archivo está en `.gitignore` y **NO** se sube al repositorio
   - Cada desarrollador debe crear su propio `.env.local`
   - En producción, configura las variables en tu plataforma de hosting (Vercel, Railway, etc.)

3. **Reinicio del Servidor**:
   - Next.js solo carga las variables de entorno al iniciar
   - **Siempre** reinicia después de cambiar `.env.local`

4. **Variables en Producción**:
   - En Vercel: Ve a Project Settings → Environment Variables
   - En Railway: Ve a Variables
   - En otros hosts: Consulta su documentación

## 🐛 Si el Error Persiste

1. **Verifica que el archivo esté en la raíz del proyecto**:
   ```
   proyecto/
   ├── .env.local          ← Aquí
   ├── package.json
   ├── next.config.js
   └── ...
   ```

2. **Verifica que no haya espacios alrededor del `=`**:
   ```env
   # ✅ Correcto
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   
   # ❌ Incorrecto
   NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
   ```

3. **Verifica que no haya comillas innecesarias**:
   ```env
   # ✅ Correcto
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   
   # ❌ Incorrecto
   NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
   ```

4. **Limpia la caché de Next.js**:
   ```bash
   rm -rf .next
   npm run dev
   ```

## 📚 Referencias

- [Documentación de Next.js - Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Documentación de Supabase](https://supabase.com/docs)
- Ver también: `docs/VARIABLES-ENTORNO.md` para la lista completa de variables

