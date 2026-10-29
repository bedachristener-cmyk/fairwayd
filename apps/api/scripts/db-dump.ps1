param(
  [string]$Container = "fairwayd-postgres",
  [string]$DbName    = "fairwayd",
  [string]$DbUser    = "postgres",
  [string]$OutDir    = ""
)

$ErrorActionPreference = "Stop"

function Assert-Docker {
  Get-Command docker -ErrorAction Stop | Out-Null
}

function Assert-ContainerRunning([string]$Name) {
  $running = docker ps --format "{{.Names}}" | Select-String -SimpleMatch $Name
  if (-not $running) {
    throw "Docker-Container laeuft nicht oder existiert nicht: $Name"
  }
}

Assert-Docker
Assert-ContainerRunning $Container

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $scriptDir "..\backups"
}

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
}

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpName = "fairwayd-$DbName-$ts.dump"
$hostDumpPath = Join-Path $OutDir $dumpName
$tmpInContainer = "/tmp/$dumpName"

Write-Host "Erstelle DB Dump im Container $Container"
docker exec $Container pg_dump -U $DbUser -d $DbName -Fc -f $tmpInContainer | Out-Null

Write-Host "Kopiere Dump nach Host"
docker cp "$Container`:$tmpInContainer" "$hostDumpPath" | Out-Null

Write-Host "Aufraeumen im Container"
docker exec $Container rm -f $tmpInContainer | Out-Null

Write-Host "OK Dump erstellt:"
Write-Host $hostDumpPath
