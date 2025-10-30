# Verificación de Configuración de Wompi

## Variables de Entorno Requeridas

Para que el sistema de pagos de Wompi funcione correctamente, necesitas configurar las siguientes variables de entorno en tu archivo `.env.local`:

```bash
# Wompi Configuration (Sandbox)
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

## Credenciales de Sandbox de Wompi

Si no tienes las credenciales de sandbox de Wompi, puedes obtenerlas:

1. **Registrarte en Wompi**: Ve a https://wompi.co y crea una cuenta
2. **Acceder al Dashboard**: Una vez registrado, accede al dashboard de Wompi
3. **Obtener Credenciales de Sandbox**: En el dashboard, busca la sección de "Desarrollo" o "Sandbox"
4. **Copiar las Llaves**: Copia las siguientes llaves:
   - `Public Key` (empieza con `pub_test_`)
   - `Private Key` (empieza con `prv_test_`)
   - `Integrity Secret` (empieza con `test_integrity_`)
   - `Webhook Secret` (cadena aleatoria para validar webhooks)

## Configuración del Archivo .env.local

1. Crea o edita el archivo `.env.local` en la raíz del proyecto
2. Agrega las variables de entorno con tus credenciales reales
3. Reinicia el servidor de desarrollo: `npm run dev`

## Verificación de la Configuración

Una vez configuradas las variables de entorno, puedes verificar que todo esté funcionando:

1. **Endpoint de Planes**: `GET /api/billing/plans` - Debe devolver los planes disponibles
2. **Endpoint de Checkout**: `POST /api/billing/checkout` - Debe generar datos de checkout
3. **Página de Billing**: `/billing` - Debe mostrar los planes con botones de suscripción

## Estado Actual

✅ **Sistema de Wompi Activado**: `isEnabled: true` en la configuración
✅ **Endpoint de Planes Funcionando**: Devuelve los 4 planes correctamente
✅ **Página de Billing Funcionando**: Carga sin errores
❌ **Endpoint de Checkout**: Error 500 - Probablemente por variables de entorno faltantes

## Próximos Pasos

1. Configurar las variables de entorno de Wompi
2. Reiniciar el servidor
3. Probar el flujo completo de checkout
4. Configurar webhooks en el dashboard de Wompi




