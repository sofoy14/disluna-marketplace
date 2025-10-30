# Variables de Entorno Requeridas para Wompi

## Configuración de Wompi

Agrega las siguientes variables a tu archivo `.env.local`:

```bash
# Wompi Configuration
WOMPI_ENVIRONMENT=sandbox
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_xxxxx
WOMPI_PRIVATE_KEY=prv_test_xxxxx
WOMPI_INTEGRITY_SECRET=test_integrity_xxxxx
WOMPI_WEBHOOK_SECRET=webhook_secret_xxxxx
NEXT_PUBLIC_WOMPI_BASE_URL=https://sandbox.wompi.co

# Billing Configuration
NEXT_PUBLIC_BILLING_ENABLED=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
WOMPI_CRON_SECRET=cron_secret_xxxxx
```

## Descripción de Variables

### WOMPI_ENVIRONMENT
- **Valor**: `sandbox` o `production`
- **Descripción**: Ambiente de Wompi a utilizar
- **Desarrollo**: `sandbox`
- **Producción**: `production`

### NEXT_PUBLIC_WOMPI_PUBLIC_KEY
- **Valor**: Llave pública de comercio de Wompi
- **Formato**: `pub_test_xxxxx` (sandbox) o `pub_prod_xxxxx` (producción)
- **Descripción**: Llave pública para autenticación con Wompi
- **Obtener**: Dashboard de Wompi > Desarrolladores > Llaves

### WOMPI_PRIVATE_KEY
- **Valor**: Llave privada de comercio de Wompi
- **Formato**: `prv_test_xxxxx` (sandbox) o `prv_prod_xxxxx` (producción)
- **Descripción**: Llave privada para operaciones del servidor
- **Obtener**: Dashboard de Wompi > Desarrolladores > Llaves

### WOMPI_INTEGRITY_SECRET
- **Valor**: Secreto de integridad de Wompi
- **Formato**: `test_integrity_xxxxx` (sandbox) o `prod_integrity_xxxxx` (producción)
- **Descripción**: Secreto para generar firmas de integridad SHA256
- **Obtener**: Dashboard de Wompi > Desarrolladores > Secretos para integración técnica

### WOMPI_WEBHOOK_SECRET
- **Valor**: Secreto del webhook de Wompi
- **Descripción**: Secreto para validar webhooks HMAC-SHA256
- **Obtener**: Dashboard de Wompi > Desarrolladores > Webhooks

### NEXT_PUBLIC_WOMPI_BASE_URL
- **Valor**: URL base de la API de Wompi
- **Sandbox**: `https://sandbox.wompi.co`
- **Producción**: `https://production.wompi.co`

### NEXT_PUBLIC_BILLING_ENABLED
- **Valor**: `true` o `false`
- **Descripción**: Habilita o deshabilita el sistema de billing
- **Desarrollo**: `true`
- **Producción**: `true`

### NEXT_PUBLIC_APP_URL
- **Valor**: URL base de tu aplicación
- **Desarrollo**: `http://localhost:3000`
- **Producción**: `https://tudominio.com`

### WOMPI_CRON_SECRET
- **Valor**: Token secreto para autorizar cron jobs
- **Descripción**: Token para proteger endpoints de cron jobs
- **Generar**: String aleatorio seguro (ej: `cron_secret_xxxxx`)

## Configuración en Vercel

Para producción en Vercel, configura estas variables en el dashboard:

1. Ve a tu proyecto en Vercel
2. Settings > Environment Variables
3. Agrega todas las variables con valores de producción
4. Asegúrate de marcar "Production" para cada variable

## Configuración de Webhooks

1. Accede al dashboard de Wompi
2. Ve a "Desarrolladores" > "Webhooks"
3. Configura la URL: `https://tudominio.com/api/webhooks/wompi`
4. Selecciona el evento: `transaction.updated`
5. Copia el secreto del webhook a `WOMPI_WEBHOOK_SECRET`

## Configuración de Cron Jobs

En `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/billing",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/dunning", 
      "schedule": "0 2 * * *"
    }
  ]
}
```

## Validación de Configuración

El sistema valida automáticamente que todas las variables requeridas estén presentes. Si falta alguna variable, verás un error al iniciar la aplicación.

Para verificar manualmente:

```bash
# Verificar configuración de Wompi
curl -H "Authorization: Bearer $WOMPI_PRIVATE_KEY" \
  https://sandbox.wompi.co/v1/merchants
```

## Seguridad

- **Nunca** expongas las llaves privadas en el frontend
- **Nunca** commitees las variables de entorno al repositorio
- Usa diferentes llaves para desarrollo y producción
- Rota las llaves periódicamente
- Monitorea el uso de las llaves en el dashboard de Wompi





