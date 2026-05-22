# Automatic Option A: save listening text + audio into services.html and deploy to GitHub.
#
# Usage:
#   .\auto-save-to-github.ps1
#   .\auto-save-to-github.ps1 -AudioPath "C:\path\lesson.mp3" -TextPath "C:\path\story.txt"
#   .\auto-save-to-github.ps1 -NoDeploy          (update files only, no git push)
#   .\auto-save-to-github.ps1 -NoWait -Message "Lesson 10 listening"
#
# Put files in assets\uploads-staging\ OR pass -AudioPath / -TextPath.
# Optional token file .github-token is NOT required (uses local git + commit).

param(
  [string]$AudioPath = "",
  [string]$TextPath = "",
  [string]$Message = "Auto-save listening activity to services.html",
  [switch]$NoDeploy,
  [switch]$NoWait
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
Set-Location $RepoRoot
$RxIgnore = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase

$StagingDir = Join-Path $RepoRoot "assets\uploads-staging"
$UploadsDir = Join-Path $RepoRoot "assets\uploads"
$ServicesHtml = Join-Path $RepoRoot "services.html"
$AboutHtml = Join-Path $RepoRoot "about.html"
$ManifestPath = Join-Path $UploadsDir "manifest.json"
$GalleryCount = 6

function Escape-Html([string]$text) {
  if ($null -eq $text) { return "" }
  return $text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
}

function Patch-ServicesHtml {
  param(
    [string]$Html,
    [string]$AudioSrc,
    [string]$Text
  )
  $out = $Html
  if ($AudioSrc) {
    $safe = $AudioSrc.Replace('"', "")
    $out = [regex]::Replace(
      $out,
      '<audio([^>]*id=["'']listeningPageAudio["''][^>]*)>',
      {
        param($m)
        $attrs = $m.Groups[1].Value -replace '(?i)\s+src=["''][^"'']*["'']', ''
        return "<audio$attrs src=`"$safe`">"
      },
      $RxIgnore
    )
  }
  if ($null -ne $Text) {
    $body = Escape-Html $Text
    $out = [regex]::Replace(
      $out,
      '(<pre[^>]*id=["'']listeningTextPreview["''][^>]*>)([\s\S]*?)(</pre>)',
      "`${1}$body`${3}",
      $RxIgnore
    )
  }
  return $out
}

function Read-AudioSrcFromHtml([string]$Html) {
  $m = [regex]::Match($Html, '<audio[^>]*id=["'']listeningPageAudio["''][^>]*\ssrc=["'']([^"'']+)["'']', $RxIgnore)
  if ($m.Success) { return $m.Groups[1].Value }
  return ""
}

function Read-TextFromHtml([string]$Html) {
  $m = [regex]::Match($Html, '<pre[^>]*id=["'']listeningTextPreview["''][^>]*>([\s\S]*?)</pre>', $RxIgnore)
  if (-not $m.Success) { return "" }
  $raw = $m.Groups[1].Value
  $raw = $raw -replace '&amp;', '&' -replace '&lt;', '<' -replace '&gt;', '>'
  if ($raw.Trim().StartsWith("No text file loaded")) { return "" }
  return $raw
}

function Patch-AboutGalleryImg {
  param(
    [string]$Html,
    [int]$Index,
    [string]$Src
  )
  if (-not $Src) { return $Html }
  $id = "galleryImg$Index"
  $safe = $Src.Replace('"', "")
  return [regex]::Replace(
    $Html,
    "(<img[^>]*id=[`"']$id[`"'][^>]*)>",
    {
      param($m)
      $attrs = $m.Groups[1].Value -replace '(?i)\s+src=["''][^"'']*["'']', '' -replace '(?i)\s+data-original-src=["''][^"'']*["'']', ''
      return "<img$attrs src=`"$safe`" data-original-src=`"$safe`">"
    },
    1,
    $RxIgnore
  )
}

function Find-GalleryStagingFiles {
  $found = @()
  if (-not (Test-Path $StagingDir)) { return $found }
  for ($i = 0; $i -lt $GalleryCount; $i++) {
    $matches = Get-ChildItem -Path $StagingDir -File -ErrorAction SilentlyContinue |
      Where-Object { $_.BaseName -eq "gallery-$i" -and $_.Extension -match '^\.(jpg|jpeg|png|gif|webp)$' }
    if ($matches.Count -gt 0) {
      $found += @{ Index = $i; Path = $matches[0].FullName }
    }
  }
  return $found
}

# Resolve audio path
if (-not $AudioPath) {
  $audioCandidates = @(
    Get-ChildItem -Path $StagingDir -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^listening-audio\.' -or $_.Extension -match '^\.(mp3|wav|ogg|webm|m4a)$' }
  )
  if ($audioCandidates.Count -gt 0) {
    $AudioPath = $audioCandidates[0].FullName
  }
}

# Resolve text path
if (-not $TextPath) {
  $textDefault = Join-Path $StagingDir "listening-text.txt"
  if (Test-Path $textDefault) { $TextPath = $textDefault }
}

if (-not (Test-Path $ServicesHtml)) {
  Write-Error "services.html not found at $ServicesHtml"
}
if (-not (Test-Path $AboutHtml)) {
  Write-Error "about.html not found at $AboutHtml"
}

$galleryStaging = Find-GalleryStagingFiles

if (-not $AudioPath -and -not $TextPath -and $galleryStaging.Count -eq 0) {
  Write-Host ""
  Write-Host "Nothing to save. Add files to:" -ForegroundColor Yellow
  Write-Host "  $StagingDir" -ForegroundColor Yellow
  Write-Host "    listening-text.txt" -ForegroundColor Yellow
  Write-Host "    listening-audio.mp3  (or .wav / .ogg / .webm)" -ForegroundColor Yellow
  Write-Host "    gallery-0.jpg … gallery-5.jpg  (Pre reading pictures)" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Or run: .\auto-save-to-github.ps1 -AudioPath `"path\to\audio.mp3`" -TextPath `"path\to\text.txt`"" -ForegroundColor DarkGray
  exit 1
}

if (-not (Test-Path $UploadsDir)) {
  New-Item -ItemType Directory -Path $UploadsDir -Force | Out-Null
}

$html = Get-Content -Path $ServicesHtml -Raw -Encoding UTF8
$aboutHtml = Get-Content -Path $AboutHtml -Raw -Encoding UTF8
$patch = @{
  audioSrc = Read-AudioSrcFromHtml $html
  text     = Read-TextFromHtml $html
}
$aboutPatched = $false

$manifestFiles = @{}
if (Test-Path $ManifestPath) {
  try {
    $existing = Get-Content $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($existing.files) {
      $existing.files.PSObject.Properties | ForEach-Object {
        $manifestFiles[$_.Name] = @{
          path      = $_.Value.path
          kind      = $_.Value.kind
          mimeType  = $_.Value.mimeType
          updatedAt = $_.Value.updatedAt
        }
      }
    }
  } catch {
    $manifestFiles = @{}
  }
}

if ($AudioPath) {
  if (-not (Test-Path $AudioPath)) { Write-Error "Audio file not found: $AudioPath" }
  $ext = [System.IO.Path]::GetExtension($AudioPath).TrimStart('.').ToLower()
  if (-not $ext) { $ext = "mp3" }
  $destName = "listening-audio.$ext"
  $destPath = Join-Path $UploadsDir $destName
  Copy-Item -Path $AudioPath -Destination $destPath -Force
  $rel = "assets/uploads/$destName" -replace '\\', '/'
  $patch.audioSrc = $rel
  $manifestFiles["listening-audio"] = @{
    path      = $rel
    kind      = "blob"
    mimeType  = ""
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
  }
  Write-Host "Audio -> $rel" -ForegroundColor Green
}

if ($TextPath) {
  if (-not (Test-Path $TextPath)) { Write-Error "Text file not found: $TextPath" }
  $textContent = Get-Content -Path $TextPath -Raw -Encoding UTF8
  $destPath = Join-Path $UploadsDir "listening-text.txt"
  Copy-Item -Path $TextPath -Destination $destPath -Force
  $rel = "assets/uploads/listening-text.txt"
  $patch.text = $textContent
  $manifestFiles["listening-text"] = @{
    path      = $rel
    kind      = "text"
    mimeType  = "text/plain"
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
  }
  Write-Host "Text -> $rel (and inside services.html)" -ForegroundColor Green
}

foreach ($g in $galleryStaging) {
  $ext = [System.IO.Path]::GetExtension($g.Path).TrimStart('.').ToLower()
  if (-not $ext) { $ext = "jpg" }
  $destName = "gallery-$($g.Index).$ext"
  $destPath = Join-Path $UploadsDir $destName
  Copy-Item -Path $g.Path -Destination $destPath -Force
  $rel = "assets/uploads/$destName" -replace '\\', '/'
  $aboutHtml = Patch-AboutGalleryImg -Html $aboutHtml -Index $g.Index -Src $rel
  $aboutPatched = $true
  $manifestFiles["gallery-$($g.Index)"] = @{
    path      = $rel
    kind      = "blob"
    mimeType  = ""
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
  }
  Write-Host "Gallery $($g.Index) -> $rel (and inside about.html)" -ForegroundColor Green
}

$patchedHtml = Patch-ServicesHtml -Html $html -AudioSrc $patch.audioSrc -Text $patch.text
[System.IO.File]::WriteAllText($ServicesHtml, $patchedHtml, [System.Text.UTF8Encoding]::new($false))
if ($aboutPatched) {
  [System.IO.File]::WriteAllText($AboutHtml, $aboutHtml, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Updated about.html with gallery image paths." -ForegroundColor Green
}

$manifestOut = [ordered]@{
  version = 1
  files   = [ordered]@{}
}
foreach ($key in ($manifestFiles.Keys | Sort-Object)) {
  $manifestOut.files[$key] = [ordered]@{
    path      = $manifestFiles[$key].path
    kind      = $manifestFiles[$key].kind
    mimeType  = $manifestFiles[$key].mimeType
    updatedAt = $manifestFiles[$key].updatedAt
  }
}
$manifestOut | ConvertTo-Json -Depth 5 | Set-Content -Path $ManifestPath -Encoding UTF8

Write-Host "Updated services.html with saved paths and text." -ForegroundColor Green

if ($NoDeploy) {
  Write-Host "Skipped deploy (-NoDeploy). Run deploy-to-github.ps1 when ready." -ForegroundColor Cyan
  exit 0
}

if (-not $NoWait) {
  Write-Host ""
  Write-Host " Press ENTER to commit and push to GitHub (deploy live site)." -ForegroundColor Cyan
  Read-Host | Out-Null
}

& (Join-Path $RepoRoot "deploy-to-github.ps1") -Message $Message -NoWait

Write-Host ""
Write-Host "Done. Live site updates in 1-2 minutes:" -ForegroundColor Cyan
Write-Host "  https://ofirx.github.io/Reading-comprehension/services.html" -ForegroundColor Cyan
Write-Host "  https://ofirx.github.io/Reading-comprehension/about.html" -ForegroundColor Cyan
