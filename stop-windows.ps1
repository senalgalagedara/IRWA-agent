# LineSense AI - Stop all services on Windows
$RepoRoot = $PSScriptRoot

Write-Host "Stopping LineSense AI services..." -ForegroundColor Yellow

# Stop Database
& "$PSScriptRoot\scripts\dev-db.ps1" stop

# Terminate node and python processes running linesense if needed
Write-Host "Done. Any open terminal windows can now be closed." -ForegroundColor Green
