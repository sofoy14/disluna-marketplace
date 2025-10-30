# Script para iniciar Cloudflare Tunnel y exponer el puerto 3000
# Asegúrate de tener cloudflared instalado: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

Write-Host "🚇 Iniciando Cloudflare Tunnel en el puerto 3000..." -ForegroundColor Cyan
Write-Host "⚠️  Asegúrate de que tu aplicación esté corriendo en http://localhost:3000" -ForegroundColor Yellow
Write-Host ""

# Verificar si cloudflared está instalado
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $cloudflared) {
    Write-Host "❌ Error: cloudflared no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instala cloudflared desde:" -ForegroundColor Yellow
    Write-Host "https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "O usa winget:" -ForegroundColor Yellow
    Write-Host "winget install --id Cloudflare.cloudflared" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ cloudflared encontrado: $($cloudflared.Source)" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Iniciando tunnel..." -ForegroundColor Cyan
Write-Host "   El tunnel generará una URL pública que apuntará a http://localhost:3000" -ForegroundColor Gray
Write-Host ""

# Iniciar el tunnel
cloudflared tunnel --url http://localhost:3000


