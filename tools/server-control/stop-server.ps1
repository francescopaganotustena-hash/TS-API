$ErrorActionPreference = "Stop"

Write-Host "[TS-API] Arresto server locale..."

$targets = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "node.exe" -and (
    $_.CommandLine -match "C:\\TS-API\\" -or
    $_.CommandLine -match "npm-cli\.js`" run dev"
  )
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

