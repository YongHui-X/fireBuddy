param(
  [ValidatePattern('^[^\s@]+@[^\s@]+$')]
  [string]$Email = 'jen@demo.com'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$seedPath = Join-Path $repositoryRoot 'supabase\reseed_jen_demo.sql'
$expectedContainer = 'supabase_db_fireBuddy'

if (-not (Test-Path -LiteralPath $seedPath -PathType Leaf)) {
  throw "Jen demo seed SQL was not found at $seedPath"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker is required to reseed the local FireBuddy database.'
}

$matchingContainers = @(docker ps --filter "name=^/$expectedContainer$" --format '{{.Names}}')
if ($LASTEXITCODE -ne 0) {
  throw 'Docker could not inspect the local Supabase containers.'
}

if ($matchingContainers.Count -ne 1 -or $matchingContainers[0] -ne $expectedContainer) {
  throw "Expected the local database container $expectedContainer to be running exactly once."
}

Write-Host "Reseeding local FireBuddy finance data for $Email..."
Get-Content -Raw -LiteralPath $seedPath |
  docker exec -i $expectedContainer psql `
    --username postgres `
    --dbname postgres `
    --no-psqlrc `
    --set ON_ERROR_STOP=1 `
    --set "target_email=$Email"

if ($LASTEXITCODE -ne 0) {
  throw 'The Jen demo reseed failed. PostgreSQL rolled back the transaction.'
}

Write-Host 'Jen demo finance data reseeded and verified.'
