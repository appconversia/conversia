# Verificación de instalación - yjbarriles
# Ejecutar desde la raíz del proyecto: .\scripts\verificar-instalacion.ps1

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3000"

Write-Host "=== Verificacion de instalacion ===" -ForegroundColor Cyan

# 1. .env
if (-not (Test-Path ".env")) {
    Write-Host "[FALLO] No existe .env" -ForegroundColor Red
    exit 1
}
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "DATABASE_URL=.+postgresql") {
    Write-Host "[FALLO] DATABASE_URL no configurada en .env" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] .env con DATABASE_URL" -ForegroundColor Green

# 2. node_modules
if (-not (Test-Path "node_modules\next")) {
    Write-Host "[FALLO] Ejecuta: npm install" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dependencias instaladas" -ForegroundColor Green

# 3. Prisma client
if (-not (Test-Path "node_modules\.prisma\client")) {
    Write-Host "[AVISO] Regenerando Prisma..."; npx prisma generate
}
Write-Host "[OK] Prisma client" -ForegroundColor Green

# 4. Servidor respondiendo
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health?db=1" -TimeoutSec 10
    if ($health.status -eq "ok" -and $health.db -eq "connected") {
        Write-Host "[OK] App + DB: $($health.usersCount) usuarios" -ForegroundColor Green
    } else {
        Write-Host "[OK] App responde (db: $($health.db))" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[AVISO] Servidor no responde en $baseUrl - inicia con: npm run dev" -ForegroundColor Yellow
}

Write-Host "`n=== Listo. Abre: $baseUrl ===" -ForegroundColor Cyan
