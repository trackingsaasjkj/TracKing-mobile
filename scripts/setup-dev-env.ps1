# Script para configurar .env.local con la IP local correcta (Windows)
# Uso: .\scripts\setup-dev-env.ps1

Write-Host "🔧 Configurando entorno de desarrollo..." -ForegroundColor Cyan
Write-Host ""

# Detectar IP local
$IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" } | Select-Object -First 1).IPAddress

if (-not $IP) {
  Write-Host "❌ No se pudo detectar la IP automáticamente" -ForegroundColor Red
  Write-Host "Por favor, ingresa tu IP local manualmente:"
  $IP = Read-Host "IP"
}

Write-Host "📍 IP detectada: $IP" -ForegroundColor Green
Write-Host ""

# Crear .env.local
$envContent = @"
# Backend API URL - Desarrollo (IP Local)
# Este archivo es ignorado por Git y solo se usa en desarrollo local
# Generado automáticamente por setup-dev-env.ps1
EXPO_PUBLIC_API_URL=http://$IP`:3000
"@

Set-Content -Path ".env.local" -Value $envContent -Encoding UTF8

Write-Host "✅ .env.local creado con éxito" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Contenido de .env.local:" -ForegroundColor Cyan
Get-Content ".env.local"
Write-Host ""
Write-Host "🚀 Ahora puedes ejecutar: npm start" -ForegroundColor Green
