Param(
  [switch]$VerboseOutput
)

$ErrorActionPreference = "Stop"

function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-WarnMsg($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Watink Business Windows compatibility check" -ForegroundColor Cyan
Write-Host "Repo: $root"

try {
  $node = node -v
  Write-Ok "Node detected: $node"
} catch {
  Write-Fail "Node.js not found in PATH"
  exit 1
}

try {
  $npm = npm -v
  Write-Ok "npm detected: $npm"
} catch {
  Write-Fail "npm not found in PATH"
  exit 1
}

$goFound = $true
try {
  $go = go version
  Write-Ok "Go detected: $go"
} catch {
  $goFound = $false
  Write-WarnMsg "Go not found (required for full backend/business rebuild)"
}

$requiredFiles = @(
  "bussines/internal/routes/routes.go",
  "engine-go/internal/whatsapp/service.go",
  "frontend/src/routes/index.js",
  "start.bat",
  "docker-compose.bussines.yml"
)

$missing = @()
foreach ($f in $requiredFiles) {
  if (Test-Path $f) {
    if ($VerboseOutput) { Write-Ok "Found: $f" }
  } else {
    $missing += $f
  }
}

if ($missing.Count -gt 0) {
  Write-Fail "Missing required files:"
  $missing | ForEach-Object { Write-Host " - $_" }
  exit 1
}

if (-not (Test-Path ".env")) {
  Write-WarnMsg ".env not found at repo root (expected in some local setups)"
}
if (-not (Test-Path "frontend/.env")) {
  Write-WarnMsg "frontend/.env not found"
}

Write-Ok "Windows compatibility baseline check passed."
if (-not $goFound) {
  Write-WarnMsg "Install Go to enable full business/opencore compile checks."
}
