# Script para generar .env.local SIN secretos
# Ejecutar: powershell -ExecutionPolicy Bypass -File clean-env.ps1

# Crear backup si existe un .env.local previo
if (Test-Path .env.local) {
    Copy-Item .env.local .env.local.backup -Force
}

# Contenido base sin valores sensibles
$envContent = @"
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
FIRECRAWL_API_KEY=

GOOGLE_CSE_API_KEY=
GOOGLE_CSE_CX=
SERPER_API_KEY=

# Wompi Sandbox Configuration
WOMPI_ENVIRONMENT=sandbox
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_INTEGRITY_SECRET=
WOMPI_WEBHOOK_SECRET=

# URLs
NEXT_PUBLIC_WOMPI_BASE_URL=https://sandbox.wompi.co
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Billing Configuration
NEXT_PUBLIC_BILLING_ENABLED=true
WOMPI_CRON_SECRET=
"@

# Escribir .env.local sin secretos
$envContent | Out-File -FilePath .env.local -Encoding UTF8

# Crear .env.example (plantilla) si no existe
if (-not (Test-Path .env.example)) {
    $envContent | Out-File -FilePath .env.example -Encoding UTF8
}

Write-Host "Archivo .env.local generado sin secretos. Complete los valores manualmente."
if (Test-Path .env.local.backup) {
    Write-Host "Backup creado en .env.local.backup"
}