# Manage project-local PostgreSQL cluster on Windows for LineSense AI
param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "status", "psql")]
    [string]$Action = "status",
    [string]$DatabaseName = "postgres"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $RepoRoot ".local\pgdata"
$LogFile = Join-Path $RepoRoot ".local\pg.log"
$Port = 55432
$PgBin = "C:\Program Files\PostgreSQL\15\bin"

if (-not (Test-Path $PgBin)) {
    # Check for other PostgreSQL versions
    $found = Get-Item "C:\Program Files\PostgreSQL\*\bin\pg_ctl.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $PgBin = Split-Path -Parent $found.FullName
    } else {
        Write-Error "PostgreSQL bin directory not found. Please install PostgreSQL or verify path."
        exit 1
    }
}

$pg_ctl = Join-Path $PgBin "pg_ctl.exe"
$psql = Join-Path $PgBin "psql.exe"

function Test-IsRunning {
    $null = & $pg_ctl -D $DataDir status 2>&1
    return ($LASTEXITCODE -eq 0)
}

switch ($Action) {
    "start" {
        if (Test-IsRunning) {
            Write-Host "[dev-db] PostgreSQL cluster is already running on port $Port." -ForegroundColor Green
            return
        }
        & $pg_ctl -D $DataDir -l $LogFile -w -o "-p $Port -c listen_addresses=127.0.0.1" start
    }
    "stop" {
        if (-not (Test-IsRunning)) {
            Write-Host "[dev-db] PostgreSQL cluster is not running." -ForegroundColor Yellow
            return
        }
        & $pg_ctl -D $DataDir -m fast -w stop
    }
    "status" {
        & $pg_ctl -D $DataDir status
    }
    "psql" {
        $env:PGPASSWORD = "dev-super-only"
        & $psql -h 127.0.0.1 -p $Port -U linesense_super -d $DatabaseName
    }
}
