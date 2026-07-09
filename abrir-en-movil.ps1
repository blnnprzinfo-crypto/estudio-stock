$ErrorActionPreference = "Stop"
$port = 8787
$folder = Split-Path -Parent $MyInvocation.MyCommand.Path
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -ne "WellKnown"
  } |
  Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $ip) {
  $ip = "localhost"
}

Write-Host ""
Write-Host "Estudio Stock esta listo."
Write-Host "Abre esto en el movil conectado al mismo WiFi:"
Write-Host "http://$ip`:$port"
Write-Host ""
Write-Host "Deja esta ventana abierta mientras lo uses."
Write-Host ""

Set-Location $folder
python -m http.server $port --bind 0.0.0.0
