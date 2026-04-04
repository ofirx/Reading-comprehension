# Checks every N seconds: if you have uncommitted changes, runs deploy-to-github.ps1.
# Safer than watching every file (no loops from .git). Press Ctrl+C to stop.
#
# Usage:
#   .\watch-and-deploy.ps1
#   .\watch-and-deploy.ps1 -IntervalSeconds 20 -Message "Auto update"

param(
  [string]$Message = "Update site",
  [int]$IntervalSeconds = 15
)

$RepoRoot = $PSScriptRoot
$deployScript = Join-Path $RepoRoot "deploy-to-github.ps1"
if (-not (Test-Path $deployScript)) {
  Write-Error "Missing deploy-to-github.ps1 in $RepoRoot"
}

Write-Host "Polling every $IntervalSeconds s — will push when there are local changes."
Write-Host "Folder: $RepoRoot"
Write-Host "Ctrl+C to stop.`n"

Set-Location $RepoRoot

while ($true) {
  Start-Sleep -Seconds $IntervalSeconds
  $dirty = git status --porcelain 2>$null
  if ($dirty) {
    Write-Host "`n[$([DateTime]::Now)] Uncommitted changes found — deploying..."
    & $deployScript -Message $Message -NoWait
  }
}
