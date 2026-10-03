# LineSense AI - Start all services on Windows
$RepoRoot = $PSScriptRoot
$BackendDir = Join-Path $RepoRoot "services\backend"
$WebDir = Join-Path $RepoRoot "apps\web"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting LineSense AI on Windows       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Start Database if not running
Write-Host "`n[1/5] Checking Database on port 55432..." -ForegroundColor Yellow
$pgStatus = & "$PSScriptRoot\scripts\dev-db.ps1" status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Starting project-local PostgreSQL cluster..." -ForegroundColor Gray
    & "$PSScriptRoot\scripts\dev-db.ps1" start
} else {
    Write-Host "Database is already running." -ForegroundColor Green
}

# 2. Start Identity Provider (Dev OIDC)
Write-Host "[2/5] Starting Dev OIDC Identity Provider (http://127.0.0.1:8090)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; uv run python -m devtools.dev_oidc"

# 3. Start Backend API
Write-Host "[3/5] Starting Backend FastAPI (http://127.0.0.1:8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; uv run python -m app.main"

# 4. Start Durable Worker
Write-Host "[4/5] Starting Durable Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; uv run python -m app.jobs"

# 5. Start Frontend Dev Server
Write-Host "[5/5] Starting Frontend Web Server (http://localhost:5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WebDir'; npm run dev"

Write-Host "`nAll 5 services have been started!" -ForegroundColor Green
Write-Host "Open http://localhost:5173 in your browser to access LineSense AI." -ForegroundColor Cyan
Write-Host "Demo users: admin@demo.test, planner@demo.test, etc." -ForegroundColor Cyan
Write-Host "Demo password: demo-password`n" -ForegroundColor Cyan
