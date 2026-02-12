# Script para verificar imágenes generadas en Nanobanana
# Uso: .\scripts\verify-images.ps1

$requiredImages = @(
    "agua-brisa-gas-pet-600ml-24.png",
    "agua-brisa-pet-600ml-24.png",
    "brisa-ecoflex-1-litro-6.png",
    "brisa-gas-lim-280ml-pet-24.png",
    "brisa-lima-limon-15lt-pet-12.png",
    "brisa-lima-limon-600ml-6.png",
    "brisa-manzana-280ml-pet-24.png",
    "brisa-manzana-600ml-6.png",
    "coca-cola-125lt-rgb12-nvo.png",
    "coca-cola-15lt-pet12-nvo.png",
    "coca-cola-250-ml-12.png",
    "coca-cola-2lt-rp9-nvo.png",
    "coca-cola-350ml-vir30.png",
    "coca-cola-400ml-pet-12.png",
    "coca-cola-saz-350ml-vr30kz.png",
    "coca-cola-saz-400ml-pet12kz.png",
    "coca-cola-so-500ml-pet-12.png",
    "coca-cola-so-8oz-vir-30.png",
    "fresh-citrus-15lt-pet12nvo.png",
    "fresh-citrus-25lt-pet8nvo.png",
    "fresh-citrus-400ml-pet-12nvo.png",
    "fresh-mandarina-15lt-pet12nvo.png",
    "fresh-mandarina-25-lt-pet-8nvo.png",
    "powerade-ion4-ft-500ml-pet6.png",
    "powerade-ion4-mb-500ml-pet6.png",
    "quatro-choice-125lt-vir12.png",
    "quatro-choice-15-lt-pet-12.png",
    "quatro-choice-250ml-pet-12.png",
    "quatro-choice-350ml-vir30.png",
    "quatro-choice-400ml-nr-12.png",
    "schweppes-ginger-15-lt-nr-12.png",
    "schweppes-ginger-400ml-pet12.png",
    "schweppes-soda-15-lt-nr-12.png",
    "schweppes-soda-400ml-pet12.png",
    "sprite-15l-pet-12.png",
    "sprite-3-lts-pet-6.png",
    "sprite-400-ml-nr-12.png"
)

$productsPath = "public\images\products"
$missing = @()
$found = @()
$totalSize = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verificación de Imágenes - Disluna" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($img in $requiredImages) {
    $path = Join-Path $productsPath $img
    if (Test-Path $path) {
        $fileInfo = Get-Item $path
        $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
        $totalSize += $fileInfo.Length
        $found += $img
        Write-Host "✅ $img ($sizeKB KB)" -ForegroundColor Green
    } else {
        $missing += $img
        Write-Host "❌ $img - FALTANTE" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Encontradas: $($found.Count) / $($requiredImages.Count)" -ForegroundColor $(if ($found.Count -eq $requiredImages.Count) { "Green" } else { "Yellow" })
Write-Host "Faltantes: $($missing.Count)" -ForegroundColor $(if ($missing.Count -eq 0) { "Green" } else { "Red" })
Write-Host "Tamaño total: $([math]::Round($totalSize / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host ""

if ($missing.Count -gt 0) {
    Write-Host "Imágenes faltantes:" -ForegroundColor Red
    foreach ($m in $missing) {
        Write-Host "  - $m" -ForegroundColor Red
    }
    exit 1
} else {
    Write-Host "✅ Todas las imágenes están presentes. ¡Listo para deploy!" -ForegroundColor Green
    exit 0
}
