# Windows equivalent of `make demo` (make is not installed on Windows by default).
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File scripts\demo.ps1
# Add -NoStart to do everything except launch the servers (database, install, migrate, seed, briefing, tests, smoke).
param([switch]$NoStart)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Step($name, [scriptblock]$run) {
    Write-Host "==> $name"
    & $run
    if ($LASTEXITCODE -ne 0) { throw "Step failed: $name (exit code $LASTEXITCODE)" }
}

if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env"; Write-Host "Created .env from .env.example - add your API keys." }

Step "database" { docker compose up -d db }
do { Start-Sleep -Seconds 1; docker compose exec -T db pg_isready -U munim -d munim | Out-Null } while ($LASTEXITCODE -ne 0)

if (-not (Test-Path ".venv")) { python -m venv .venv }
$py = Join-Path $root ".venv\Scripts\python.exe"
Step "python dependencies" { & $py -m pip install -q -r backend\requirements.txt }
Step "frontend dependencies" { Push-Location frontend; try { npm install --no-audit --no-fund } finally { Pop-Location } }

Push-Location backend
try {
    Step "migrate" { & $py manage.py migrate }
    Step "seed_demo (data and the five stories)" { & $py manage.py seed_demo }
    Step "generate_briefing" { & $py manage.py generate_briefing }
    Step "tests" { & $py manage.py test apps }
} finally { Pop-Location }
Step "smoke" { & $py scripts\smoke.py }

if ($NoStart) { Write-Host "Setup, tests and smoke passed (-NoStart: servers not started)."; exit 0 }
Write-Host "Backend  http://localhost:8010    Frontend http://localhost:5173"
Start-Process -FilePath $py -ArgumentList "manage.py","runserver","0.0.0.0:8010","--noreload" -WorkingDirectory (Join-Path $root "backend")
Push-Location frontend; npm run dev; Pop-Location
