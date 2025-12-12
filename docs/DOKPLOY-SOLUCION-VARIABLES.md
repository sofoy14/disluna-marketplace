# Solución: Variables de Entorno en Dokploy

## 🔴 Problema

Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están configuradas en Dokploy pero no se reconocen en runtime, causando el error:

```
Missing Supabase configuration. Please check environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 🔍 Causa Raíz

El problema es que **Dokploy necesita configurar las variables de dos maneras**:

1. **Build Arguments**: Para que estén disponibles durante el build (para el cliente)
2. **Runtime Environment Variables**: Para que estén disponibles cuando la aplicación está ejecutándose (para el servidor)

Si solo están configuradas como variables de entorno de runtime, el servidor puede leerlas, pero si hay algún problema con la inyección, fallará.

## ✅ Solución: Configurar en Dokploy

### Opción 1: Si Dokploy tiene "Build Arguments" o "Build-time Variables"

1. Ve a tu aplicación en Dokploy
2. Navega a **Settings** → **Environment Variables**
3. Para cada variable `NEXT_PUBLIC_*`:
   - ✅ Configúrala como variable de entorno normal
   - ✅ **MÁS IMPORTANTE**: Si hay una opción "Use as Build Argument" o "Build-time variable", **actívala**

4. Variables que necesitan estar como build arguments:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`

### Opción 2: Si Dokploy NO tiene Build Arguments (Solo Runtime)

Si Dokploy solo permite variables de entorno de runtime:

1. **Las variables DEBEN estar configuradas** en Dokploy como Environment Variables
2. **Reinicia la aplicación** después de configurarlas
3. **Verifica que estén disponibles** ejecutando en el contenedor:
   ```bash
   docker exec -it <container-name> env | grep NEXT_PUBLIC_SUPABASE
   ```

Si las variables están en el contenedor pero aún así falla, el problema puede ser:
- Las variables tienen espacios extras
- Las variables tienen comillas innecesarias
- El contenedor necesita ser reconstruido

### Opción 3: Solución Manual con Docker Build Args

Si puedes acceder al servidor donde corre Dokploy o modificar el comando de build:

1. En Dokploy, busca la configuración de "Build Command" o "Docker Build"
2. Modifica el comando para incluir `--build-arg`:
   ```bash
   docker build \
     --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
     --build-arg NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
     -t app .
   ```

## 🔧 Verificación

### 1. Verificar en los Logs

Después de hacer un nuevo build, revisa los logs de Dokploy. Deberías ver:
- No hay errores sobre variables faltantes
- El build se completa exitosamente

### 2. Verificar en Runtime

Una vez desplegado, verifica que las variables estén disponibles:

1. Accede a tu aplicación
2. Ve a `/api/debug/env-check` o `/api/debug/supabase-env`
3. Deberías ver que las variables están configuradas

### 3. Verificar en el Contenedor

Si tienes acceso SSH al servidor:

```bash
# Listar todos los contenedores
docker ps

# Ejecutar comando en el contenedor
docker exec -it <container-id> env | grep NEXT_PUBLIC_SUPABASE
```

Deberías ver:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## 🐛 Si el Problema Persiste

### Diagnóstico

1. **Verifica que las variables no tengan espacios**:
   ```env
   # ✅ Correcto
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   
   # ❌ Incorrecto
   NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co 
   ```

2. **Verifica que las variables no tengan comillas**:
   ```env
   # ✅ Correcto
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   
   # ❌ Incorrecto
   NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
   ```

3. **Verifica los logs mejorados**:
   Ahora el error muestra información de diagnóstico:
   ```
   Missing Supabase configuration...
   Diagnostic info:
   - NODE_ENV: production
   - URL present: false/true
   - AnonKey present: false/true
   - URL length: 0
   - AnonKey length: 0
   ```

### Solución Temporal: Rebuild Completo

Si nada funciona:

1. **Elimina el contenedor y la imagen**:
   ```bash
   docker stop <container-id>
   docker rm <container-id>
   docker rmi <image-id>
   ```

2. **En Dokploy, haz un rebuild completo**
3. **Verifica que las variables estén configuradas ANTES del rebuild**

## 📝 Notas Importantes

1. **Build Time vs Runtime**:
   - Build time: Variables necesarias para compilar el código (incluidas en el bundle)
   - Runtime: Variables necesarias cuando la aplicación está ejecutándose

2. **NEXT_PUBLIC_* Variables**:
   - Idealmente deberían estar en build time (para el cliente)
   - También pueden leerse en runtime del servidor (Server Components/API routes)

3. **El código actual**:
   - El código está configurado para leer de `process.env` en runtime
   - Si las variables están en el contenedor, deberían funcionar

## 🎯 Resumen

**Acción inmediata:**
1. Verifica en Dokploy que las variables estén configuradas
2. Busca la opción "Build Arguments" o "Build-time variables" y actívala
3. Haz un rebuild completo
4. Verifica con `/api/debug/supabase-env`

Si Dokploy no tiene build arguments, las variables deben estar como runtime variables y deberían funcionar para Server Components.
