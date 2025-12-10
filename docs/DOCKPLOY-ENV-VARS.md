# Configuración de Variables de Entorno en Dockploy

## Problema

Las variables `NEXT_PUBLIC_*` deben estar disponibles durante el **build time** de Next.js para que se incrusten en el bundle del cliente. Si no están disponibles durante el build, no estarán en el bundle del cliente y causarán errores.

## Solución

El Dockerfile ha sido configurado para aceptar las variables como `ARG` durante el build. Sin embargo, **Dockploy necesita pasar estas variables como build arguments** durante el proceso de build.

### Configuración en Dockploy

En Dockploy, necesitas configurar las variables de entorno y asegurarte de que se pasen al proceso de build:

1. **Ve a la configuración de tu aplicación en Dockploy**
2. **En la sección "Environment Variables"**, agrega todas las variables necesarias:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_BILLING_ENABLED`
   - `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`
   - `NEXT_PUBLIC_WOMPI_BASE_URL`

3. **IMPORTANTE**: En Dockploy, verifica si hay una opción para pasar variables como "Build Arguments" o "Build-time variables". Si existe, activa esa opción para las variables `NEXT_PUBLIC_*`.

### Verificación

Después de configurar y hacer un nuevo build, verifica:

1. En los logs de build de Dockploy, busca:
   ```
   [dotenv@17.2.3] injecting env (X) from .env.local
   ```
   Donde X debería ser mayor que 0 si las variables están siendo inyectadas.

2. Accede a `/api/debug/supabase-env` en tu aplicación desplegada para verificar si las variables están disponibles.

3. Revisa la consola del navegador - no debería aparecer el error de variables faltantes.

### Si Dockploy no soporta Build Arguments

Si Dockploy no permite pasar variables como build arguments automáticamente, tendrás que modificar el comando de build en Dockploy para usar `--build-arg`:

```bash
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY ... -t app .
```

### Alternativa: Variables en Runtime (No Recomendado)

Si no puedes pasar variables durante el build, podrías intentar inyectar las variables en runtime, pero esto requiere cambios significativos en el código y no es la forma recomendada de trabajar con Next.js.

## Variables Requeridas para Build

Las siguientes variables `NEXT_PUBLIC_*` DEBEN estar disponibles durante el build:

- `NEXT_PUBLIC_SUPABASE_URL` ⚠️ CRÍTICA
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ⚠️ CRÍTICA
- `NEXT_PUBLIC_APP_URL` (recomendada)
- `NEXT_PUBLIC_SITE_URL` (opcional)
- `NEXT_PUBLIC_BILLING_ENABLED` (opcional)
- `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` (opcional)
- `NEXT_PUBLIC_WOMPI_BASE_URL` (opcional)

