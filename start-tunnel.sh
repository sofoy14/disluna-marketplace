#!/bin/bash

# Script para iniciar Cloudflare Tunnel y exponer el puerto 3000
# Asegúrate de tener cloudflared instalado: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

echo "🚇 Iniciando Cloudflare Tunnel en el puerto 3000..."
echo "⚠️  Asegúrate de que tu aplicación esté corriendo en http://localhost:3000"
echo ""

# Verificar si cloudflared está instalado
if ! command -v cloudflared &> /dev/null; then
    echo "❌ Error: cloudflared no está instalado o no está en el PATH"
    echo ""
    echo "Instala cloudflared desde:"
    echo "https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    echo ""
    echo "O usa tu gestor de paquetes:"
    echo "  macOS: brew install cloudflare/cloudflare/cloudflared"
    echo "  Linux: Consulta la documentación de Cloudflare"
    exit 1
fi

echo "✅ cloudflared encontrado: $(which cloudflared)"
echo ""
echo "🌐 Iniciando tunnel..."
echo "   El tunnel generará una URL pública que apuntará a http://localhost:3000"
echo ""

# Iniciar el tunnel
cloudflared tunnel --url http://localhost:3000


