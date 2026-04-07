param(
  [switch]$Rebuild,
  [switch]$Clean
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$composeFile = "docker-compose.mortgage-calculator.yml"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI not found. Install Docker Desktop and ensure 'docker' is in PATH."
}

$composeArgs = @("compose", "-f", $composeFile)

# Remove stale containers/orphans before start to avoid name/network conflicts.
$downArgs = $composeArgs + @("down", "--remove-orphans")
if ($Clean) {
  $downArgs += @("--volumes")
}

Write-Host "Cleaning old containers..."
& docker @downArgs

$upArgs = $composeArgs + @("up", "-d")
if ($Rebuild) {
  $upArgs = $composeArgs + @("up", "--build", "-d")
}

Write-Host "Starting mortgage calculator container..."
& docker @upArgs

Write-Host "URL: http://localhost:8080"
