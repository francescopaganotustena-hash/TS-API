$ErrorActionPreference = "Stop"

$root = "C:\TS-API"

Write-Host "[TS-API] Avvio server locale..."

if (-not (Test-Path "$root\package.json")) {
  Write-Host "[ERRORE] Cartella progetto non trovata: $root"
  exit 1
}

$alreadyUp = $false
try {
  $resp = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
  if ($resp.StatusCode -ge 200) { $alreadyUp = $true }
} catch {
  $alreadyUp = $false
}

if ($alreadyUp) {
  Write-Host "[TS-API] Server gia attivo su http://localhost:3000"
  exit 0
}

Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile","-Command","cd $root; npm run dev" -WindowStyle Hidden
Write-Host "[TS-API] Avvio richiesto. Attendi alcuni secondi e apri http://localhost:3000"
exit 0

