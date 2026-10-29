param(
  [Parameter(Mandatory = $true)]
  [string]$DumpPath,

  [string]$Container = "fairwayd-postgres",
  [string]$DbName    = "fairwayd",
  [string]$DbUser    = "postgres",

  [switch]$Clean
)

$ErrorActionPreference = "Stop"

function Assert-Docker {
  $null = Get-Command docker -ErrorAction Stop
}

function Assert-ContainerRunning([string]$Name) {
  $running = docker ps --format "{{.Names}}" | Select-String -SimpleMatch $Name
  if (-not $running) {
    throw "Docker-Container laeuft nicht oder existiert nicht $Name"
  }
}

Assert-Docker
Assert-ContainerRunning $Container

if (-not (Test-Path -LiteralPath $DumpPath)) {
  throw "Dump-Datei nicht gefunden $DumpPath"
}

$dumpFull = (Resolve-Path -LiteralPath $DumpPath).Path
$dumpFile = Split-Path -Leaf $dumpFull
$tmpInContainer = "/tmp/restore-$dumpFile"

Write-Host "Kopiere Dump in den Container $Container"
docker cp "$dumpFull" "$Container`:$tmpInContainer" | Out-Null

# Optional: --clean loescht Objekte vor dem Restore (gut fuer "zurueckspielen")
$cleanArgs = @()
if ($Clean) {
  $cleanArgs = @("--clean", "--if-exists")
}

Write-Host "Restore startet in DB $DbName"
docker exec $Container pg_restore -U $DbUser -d $DbName @cleanArgs --no-owner --no-privileges $tmpInContainer | Out-Null

Write-Host "Aufraeumen im Container"
docker exec $Container rm -f $tmpInContainer | Out-Null

Write-Host "OK Restore abgeschlossen"
