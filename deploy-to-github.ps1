# Push this folder to GitHub in one step (add + commit + push).
# Run it, press ENTER once, and it uploads.
#
# Usage:
#   .\deploy-to-github.ps1
#   .\deploy-to-github.ps1 -Message "Fix nav colors"
#   .\deploy-to-github.ps1 -NoWait          (no Enter prompt — for watch script)
#
# Requires: Git installed, repo already cloned, remote "origin" set, credentials saved.

param(
  [string]$Message = "Update site",
  [switch]$NoWait
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
Set-Location $RepoRoot

if (-not $NoWait) {
  Write-Host ""
  Write-Host " Press ENTER to add, commit, and push to GitHub." -ForegroundColor Cyan
  Read-Host | Out-Null
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "Git is not installed or not in PATH. Install Git for Windows: https://git-scm.com/download/win"
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if (-not $branch) {
  Write-Error "Not a git repository: $RepoRoot"
}

git add -A
$pending = git status --porcelain
if (-not $pending) {
  Write-Host "Nothing new to commit — working tree clean."
  exit 0
}

git commit -m $Message
git push origin $branch

Write-Host "Done. Pushed to origin/$branch."
