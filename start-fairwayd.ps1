# ===============================
# Fairwayd – Local Startup Script
# ===============================

Write-Host "=== Fairwayd Startup ===" -ForegroundColor Cyan

# 1) Docker Desktop Check
Write-Host "Checking Docker Desktop..."
try {
    docker info | Out-Null
    Write-Host "Docker is running." -ForegroundColor Green
} catch {
    Write-Host "Docker Desktop is NOT running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# 2) Start Postgres Container
$containerName = "fairwayd-postgres"
$container = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $containerName }

if (-not $container) {
    Write-Host "Container $containerName not found!" -ForegroundColor Red
    exit 1
}

$running = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $containerName }

if (-not $running) {
    Write-Host "Starting Postgres container..."
    docker start $containerName | Out-Null
    Start-Sleep -Seconds 3
    Write-Host "Postgres container started." -ForegroundColor Green
} else {
    Write-Host "Postgres container already running." -ForegroundColor Green
}

# 3) Quick DB Check
Write-Host "Checking database connectivity..."
docker exec $containerName psql -U app -d fairwayd -c "\dt public.*" | Out-Null
Write-Host "Database reachable." -ForegroundColor Green

# 4) Start API
$apiPath = "C:\dev\fairwayd\apps\api"

Write-Host "Starting API..."
Start-Process powershell -WorkingDirectory $apiPath -ArgumentList "-NoExit", "-Command npm run start:dev"

Write-Host "API starting in new window." -ForegroundColor Green
Write-Host "Swagger will be available at /docs once NestJS is ready."
