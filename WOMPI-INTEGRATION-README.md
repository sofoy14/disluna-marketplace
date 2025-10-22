# Integración Wompi - Sistema de Suscripciones

## Configuración Inicial

### 1. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env.local`:

```bash
# Wompi Sandbox (desarrollo)
WOMPI_ENVIRONMENT=sandbox
WOMPI_PUBLIC_KEY=pub_test_XXX
WOMPI_PRIVATE_KEY=priv_test_XXX
WOMPI_EVENTS_SECRET=test_events_XXX

# Wompi Producción (comentado hasta configuración)
# WOMPI_ENVIRONMENT=production
# WOMPI_PUBLIC_KEY=pub_prod_XXX
# WOMPI_PRIVATE_KEY=priv_prod_XXX
# WOMPI_EVENTS_SECRET=prod_events_XXX

# Feature flags
NEXT_PUBLIC_BILLING_ENABLED=true
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_XXX
NEXT_PUBLIC_WOMPI_BASE_URL=https://sandbox.wompi.co

# Cron secret para validar llamadas internas
CRON_SECRET=your_cron_secret_here
```

### 2. Configuración de Wompi

1. **Crear cuenta Sandbox**: Ve a https://comercios.wompi.co/
2. **Obtener llaves**: En el dashboard, obtén:
   - `pub_test_XXX` (llave pública)
   - `priv_test_XXX` (llave privada)
   - `test_events_XXX` (secreto de eventos)
3. **Configurar webhook**: URL: `https://tu-dominio.com/api/billing/webhook`

### 3. Migración de Base de Datos

Ejecuta la migración para crear las tablas de billing:

```bash
npm run db-migrate
```

## Estructura del Sistema

### Tablas Creadas

- `plans` - Catálogo de planes de suscripción
- `payment_sources` - Métodos de pago guardados de Wompi
- `subscriptions` - Suscripciones activas
- `invoices` - Facturas mensuales
- `transactions` - Log de transacciones Wompi

### Endpoints API

#### Métodos de Pago
- `GET /api/billing/acceptance-token` - Obtener tokens de aceptación
- `POST /api/billing/payment-methods` - Crear método de pago
- `GET /api/billing/payment-sources` - Listar métodos de pago
- `GET /api/billing/payment-sources/[id]` - Obtener método específico

#### Suscripciones
- `POST /api/billing/subscriptions` - Crear suscripción
- `POST /api/billing/subscriptions/[id]/change-plan` - Cambiar plan
- `DELETE /api/billing/subscriptions/[id]` - Cancelar suscripción
- `POST /api/billing/preview` - Previsualizar cambio de plan

#### Facturas y Transacciones
- `GET /api/billing/invoices` - Listar facturas
- `POST /api/billing/retry/[invoice_id]` - Reintentar factura
- `POST /api/billing/webhook` - Webhook de Wompi

#### Reportes y Métricas
- `GET /api/billing/metrics/mrr` - Métricas de MRR
- `GET /api/billing/reports/invoices` - Exportar facturas CSV

#### Cron Jobs
- `GET /api/cron/billing` - Cobros mensuales automáticos
- `GET /api/cron/dunning` - Sistema de reintentos

## Componentes Frontend

### Componentes Disponibles

- `AcceptanceModal` - Modal para aceptar términos y condiciones
- `AddCardForm` - Formulario para agregar tarjetas
- `AddNequiForm` - Formulario para agregar Nequi
- `BillingDashboard` - Dashboard de métricas y facturas

### Uso Básico

```tsx
import { BillingDashboard } from '@/components/billing/BillingDashboard';
import { AddCardForm } from '@/components/billing/AddCardForm';

// Dashboard de billing
<BillingDashboard workspaceId="workspace-id" />

// Agregar método de pago
<AddCardForm 
  onSuccess={(paymentSource) => console.log('Success!', paymentSource)}
  onCancel={() => console.log('Cancelled')}
  workspaceId="workspace-id"
/>
```

## Flujo de Trabajo

### 1. Configurar Método de Pago

1. Usuario abre modal de aceptación de términos
2. Usuario acepta términos y obtiene `acceptance_token`
3. Usuario completa formulario de tarjeta/Nequi
4. Tokenización en cliente con llave pública
5. Creación de `payment_source` en servidor con llave privada
6. Guardado en base de datos

### 2. Crear Suscripción

1. Usuario selecciona plan
2. Usuario selecciona método de pago disponible
3. Creación de suscripción en base de datos
4. Configuración de período de facturación

### 3. Cobros Automáticos

1. Cron job ejecuta diariamente a las 6:00 AM
2. Busca suscripciones cuyo período termina hoy
3. Crea factura para cada suscripción
4. Ejecuta transacción en Wompi usando `payment_source_id`
5. Extiende período de suscripción si es exitoso

### 4. Manejo de Webhooks

1. Wompi envía evento a `/api/billing/webhook`
2. Validación de firma SHA-256
3. Actualización de estado de transacción
4. Reconciliación de facturas y suscripciones

### 5. Sistema de Reintentos (Dunning)

1. Cron job ejecuta diariamente a las 8:00 AM
2. Busca facturas fallidas para reintentar
3. Calendario: +2, +5, +9 días
4. Después de 3 intentos: suspender suscripción

## Testing

### Tarjetas de Prueba Wompi

| Número | Resultado |
|--------|-----------|
| `4242424242424242` | APPROVED |
| `4111111111111111` | DECLINED |
| `4000000000000002` | ERROR |

### Nequi de Prueba

- Teléfono: `3001234567` → PENDING → simular aprobación manual

## Monitoreo

### Métricas Disponibles

- **MRR**: Monthly Recurring Revenue
- **Tasa de éxito**: Transacciones APPROVED vs total
- **Churn rate**: Suscripciones canceladas vs activas
- **Métodos de pago**: Disponibles vs no disponibles

### Logs Importantes

- Creación de transacciones
- Estados de webhooks
- Errores de cron jobs
- Fallos de validación de firma

## Seguridad

### Validaciones Implementadas

- ✅ Validación de firma SHA-256 en webhooks
- ✅ Idempotencia por `reference` única
- ✅ RLS policies en Supabase
- ✅ No almacenamiento de datos sensibles (PAN, CVC)
- ✅ Rotación de llaves recomendada cada 6 meses

### Cumplimiento PCI DSS

- ✅ Delegación completa a Wompi (PCI DSS Level 1)
- ✅ Solo almacenamiento de tokens y `payment_source_id`
- ✅ Validación de integridad en todos los webhooks

## Despliegue

### Checklist de Producción

- [ ] Llaves de producción configuradas
- [ ] Webhook URL configurada en Wompi
- [ ] Dominio HTTPS con certificado válido
- [ ] Cron jobs configurados en Vercel
- [ ] Feature flags activados
- [ ] Monitoreo y alertas configuradas
- [ ] Pruebas de carga ejecutadas

### Soft Launch

1. **Semana 1**: 5% de workspaces
2. **Semana 2**: 25% si no hay errores
3. **Semana 3**: 50%
4. **Semana 4**: 100%

## Soporte

- **Documentación Wompi**: https://docs.wompi.co/
- **Soporte Wompi**: soporte@wompi.co
- **SLA**: 99.9% uptime
- **Respuesta**: 24 horas

## Notas Importantes

- **Moneda**: Todas las transacciones en COP
- **Timezone**: Colombia (America/Bogota, UTC-5)
- **Límites**: 100 req/min por IP (contactar para aumentar)
- **3DS/3RI**: Wompi maneja automáticamente en cobros recurrentes


