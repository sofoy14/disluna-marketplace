# Script para configurar Wompi en modo PRODUCCIÓN
# Ejecutar: powershell -ExecutionPolicy Bypass -File configure-production.ps1

# Crear backup del archivo actual
Copy-Item .env.local .env.local.sandbox.backup

# Crear nuevo archivo .env.local con credenciales de PRODUCCIÓN
@"
# Wompi PRODUCCIÓN Configuration - DINERO REAL
WOMPI_ENVIRONMENT=production
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_prod_C01dSld0Z6syyGgA3u7SkF0TMqZdyQAu
WOMPI_PRIVATE_KEY=prv_prod_dc02fE63hn6RTaqwPrIYB14vKeEkw27k
WOMPI_INTEGRITY_SECRET=prod_integrity_vJqHB0dzaWk5ym0qxxnQYlK6ZotJjfIz
WOMPI_WEBHOOK_SECRET=prod_events_qV7dkxX6oae5AxHLETiau73hSnzxBxnH

# URLs
NEXT_PUBLIC_WOMPI_BASE_URL=https://production.wompi.co
NEXT_PUBLIC_APP_URL=https://ali-jade.vercel.app

# Billing Configuration
NEXT_PUBLIC_BILLING_ENABLED=true
WOMPI_CRON_SECRET=cron_secret_2024_abc123xyz789
"@ | Out-File -FilePath .env.local -Encoding UTF8

Write-Host "✅ Wompi configurado en modo PRODUCCIÓN"
Write-Host "⚠️  ADVERTENCIA: Ahora se procesará DINERO REAL"
Write-Host "📋 Webhook URL: https://ali-jade.vercel.app/api/wompi/webhook"
Write-Host "💾 Backup creado en .env.local.sandbox.backup"



