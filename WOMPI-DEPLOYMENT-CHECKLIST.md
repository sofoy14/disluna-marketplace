# Checklist de Despliegue - Integración Wompi

## ✅ Pre-requisitos

### 1. Configuración de Wompi
- [ ] Cuenta Wompi Sandbox creada
- [ ] Llaves obtenidas: `pub_test_XXX`, `priv_test_XXX`, `events_secret_XXX`
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Webhook URL configurada en Wompi: `https://tu-dominio.com/api/billing/webhook`

### 2. Base de Datos
- [ ] Migración ejecutada: `npm run db-migrate`
- [ ] Tablas creadas: `plans`, `payment_sources`, `subscriptions`, `invoices`, `transactions`
- [ ] RLS policies aplicadas
- [ ] Índices creados

### 3. Variables de Entorno
```bash
# Verificar que estas variables estén configuradas:
WOMPI_ENVIRONMENT=sandbox
WOMPI_PUBLIC_KEY=pub_test_XXX
WOMPI_PRIVATE_KEY=priv_test_XXX
WOMPI_EVENTS_SECRET=test_events_XXX
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_XXX
NEXT_PUBLIC_WOMPI_BASE_URL=https://sandbox.wompi.co
NEXT_PUBLIC_BILLING_ENABLED=true
CRON_SECRET=your_cron_secret_here
```

## ✅ Testing

### 1. Pruebas de Integración
- [ ] Ejecutar: `npm run test:wompi`
- [ ] Verificar tokenización de tarjetas
- [ ] Verificar creación de payment sources
- [ ] Verificar transacciones
- [ ] Verificar tokenización de Nequi

### 2. Pruebas Manuales
- [ ] Agregar tarjeta de prueba (`4242424242424242`)
- [ ] Crear suscripción
- [ ] Verificar dashboard de billing
- [ ] Probar cambio de plan
- [ ] Probar cancelación de suscripción

### 3. Pruebas de Webhook
- [ ] Configurar webhook URL en Wompi
- [ ] Probar evento `transaction.updated`
- [ ] Verificar validación de firma SHA-256
- [ ] Probar eventos con firma inválida

## ✅ Cron Jobs

### 1. Configuración Vercel
- [ ] `vercel.json` configurado con cron jobs
- [ ] Cron de billing: `0 6 * * *` (6:00 AM)
- [ ] Cron de dunning: `0 8 * * *` (8:00 AM)

### 2. Validación
- [ ] Probar endpoint `/api/cron/billing` con `CRON_SECRET`
- [ ] Probar endpoint `/api/cron/dunning` con `CRON_SECRET`
- [ ] Verificar logs de cron jobs

## ✅ Seguridad

### 1. Validaciones
- [ ] Validación de firma SHA-256 en webhooks
- [ ] RLS policies en Supabase
- [ ] Autenticación JWT en endpoints
- [ ] No almacenamiento de datos sensibles

### 2. Idempotencia
- [ ] Referencias únicas por transacción
- [ ] Validación de `wompi_id` único
- [ ] Manejo de transacciones duplicadas

## ✅ Monitoreo

### 1. Logs
- [ ] Logs estructurados implementados
- [ ] Logs de transacciones
- [ ] Logs de webhooks
- [ ] Logs de errores

### 2. Métricas
- [ ] Dashboard de MRR
- [ ] Métricas de éxito/fallo
- [ ] Exportación CSV de facturas
- [ ] Alertas configuradas

## ✅ Producción

### 1. Llaves de Producción
- [ ] Llaves de producción obtenidas
- [ ] Variables de entorno actualizadas
- [ ] Webhook URL de producción configurada
- [ ] Dominio HTTPS con certificado válido

### 2. Feature Flags
- [ ] `NEXT_PUBLIC_BILLING_ENABLED=true`
- [ ] Soft launch configurado
- [ ] Rollback plan preparado

### 3. Comunicación
- [ ] Emails de notificación configurados
- [ ] Plantillas de email creadas
- [ ] Notificaciones de pago exitoso
- [ ] Notificaciones de pago fallido
- [ ] Notificaciones de suspensión

## ✅ Post-Despliegue

### 1. Validación
- [ ] Pruebas end-to-end en producción
- [ ] Verificar cobros automáticos
- [ ] Verificar sistema de dunning
- [ ] Verificar cambios de plan

### 2. Monitoreo
- [ ] Alertas configuradas
- [ ] Dashboard funcionando
- [ ] Logs siendo capturados
- [ ] Métricas siendo calculadas

### 3. Documentación
- [ ] README actualizado
- [ ] Documentación de API
- [ ] Guías de usuario
- [ ] Procedimientos de soporte

## 🚨 Rollback Plan

Si algo sale mal:

1. **Desactivar feature flag**: `NEXT_PUBLIC_BILLING_ENABLED=false`
2. **Detener cron jobs**: Comentar en `vercel.json`
3. **Revertir deployment**: `git revert` o rollback en Vercel
4. **Notificar usuarios**: Email de mantenimiento
5. **Investigar y corregir**: Revisar logs y errores

## 📞 Contactos de Emergencia

- **Soporte Wompi**: soporte@wompi.co
- **Documentación**: https://docs.wompi.co/
- **Status Page**: https://status.wompi.co/

## 📋 Tarjetas de Prueba

| Número | Resultado | Uso |
|--------|-----------|-----|
| `4242424242424242` | APPROVED | Pruebas exitosas |
| `4111111111111111` | DECLINED | Pruebas de fallo |
| `4000000000000002` | ERROR | Pruebas de error |
| `3001234567` | PENDING | Pruebas Nequi |

## 🔧 Comandos Útiles

```bash
# Ejecutar migración
npm run db-migrate

# Probar integración
npm run test:wompi

# Verificar tipos de BD
npm run db-types

# Linting
npm run lint:fix

# Formateo
npm run format:write
```





