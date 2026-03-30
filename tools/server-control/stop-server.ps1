$ErrorActionPreference = "Stop"

Write-Host "[TS-API] Arresto server locale..."

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$rootPattern = [regex]::Escape($root)

$targets = Get-CimInstance Win32_Process | Where-Object {
  if ($_.Name -ne "node.exe") { return $false }
  $cmd = $_.CommandLine
  if ([string]::IsNullOrWhiteSpace($cmd)) { return $false }
  $isProjectProcess = $cmd -match $rootPattern
  $isDevServerProcess = $cmd -match "npm-cli\.js`" run dev" -or $cmd -match "next[\\/]dist[\\/]bin[\\/]next.*\bdev\b"
  return $isProjectProcess -and $isDevServerProcess
}

if ($targets) {
  $ids = @($targets | ForEach-Object { $_.ProcessId })
  $ids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  Write-Host ("[TS-API] Processi fermati: " + ($ids -join ","))
} else {
  Write-Host "[TS-API] Nessun processo da fermare."
}

Write-Host "[TS-API] Verifica endpoint..."
try {
  Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 | Out-Null
  Write-Host "[TS-API] Attenzione: endpoint ancora raggiungibile."
} catch {
  Write-Host "[TS-API] Server fermo."
}

exit 0

