param(
  [int]$Port = 8080
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location "site/themes/veecasa/assets"

Write-Host "Starting local server in: $(Get-Location)"
Write-Host "URL: http://localhost:$Port/mortgage-calculator.html"

if (Get-Command python -ErrorAction SilentlyContinue) {
  python -m http.server $Port
}
elseif (Get-Command py -ErrorAction SilentlyContinue) {
  py -m http.server $Port
}
elseif (Get-Command npx -ErrorAction SilentlyContinue) {
  npx --yes serve . -l $Port
}
else {
  Write-Error "Need Python (python/py) or Node (npx) installed."
}
