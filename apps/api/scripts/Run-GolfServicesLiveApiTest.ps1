# Windows PowerShell 5.1. Run only against the disposable Prisma-rehearsal Neon branch.
# The URL is entered on this machine and never echoed, written to .env, or passed as a CLI argument.
$ErrorActionPreference = 'Stop'
$ApiRoot = Split-Path -Parent $PSScriptRoot
$PreviousUrl = [Environment]::GetEnvironmentVariable('NEON_DATABASE_URL', 'Process')
$HadPrevious = Test-Path 'Env:\NEON_DATABASE_URL'
$OriginalFlag = [Environment]::GetEnvironmentVariable('GOLF_SERVICES_API_ENABLED', 'Process')
$HadFlag = Test-Path 'Env:\GOLF_SERVICES_API_ENABLED'
$CredentialPointer = [IntPtr]::Zero
$SecureUrl = $null
$PlainUrl = $null

try {
    Write-Host 'Golf Near Me - ISOLATED read-only HTTP API test'
    Write-Host 'Test ONLY: golf-near-me-prisma-rehearsal-20261023'
    Write-Host 'Expected host: ep-late-band-ag2ya7lq.c-2.eu-central-1.aws.neon.tech'
    Write-Host 'Database: fairwayd_stage | Connection pooling: OFF'
    Write-Host 'No Railway deployment, no Prisma migration, no writes.'
    Write-Host 'Enter the direct Neon URL into the masked prompt (never paste it into chat).'
    $SecureUrl = Read-Host -Prompt 'Disposable Neon test URL' -AsSecureString
    if ($null -eq $SecureUrl -or $SecureUrl.Length -eq 0) {
        throw 'No URL entered. Nothing was tested.'
    }
    $CredentialPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureUrl)
    $PlainUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($CredentialPointer)
    [Environment]::SetEnvironmentVariable('NEON_DATABASE_URL', $PlainUrl, 'Process')
    $PlainUrl = $null

    Push-Location $ApiRoot
    try {
        & node (Join-Path $PSScriptRoot 'test-golf-services-live-api.mjs') --run
        if ($LASTEXITCODE -ne 0) {
            throw 'Live API test was stopped/failed. Do not enable Golf Services on Stage.'
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    if ($HadPrevious) {
        [Environment]::SetEnvironmentVariable('NEON_DATABASE_URL', $PreviousUrl, 'Process')
    }
    else {
        [Environment]::SetEnvironmentVariable('NEON_DATABASE_URL', $null, 'Process')
    }
    if ($HadFlag) {
        [Environment]::SetEnvironmentVariable('GOLF_SERVICES_API_ENABLED', $OriginalFlag, 'Process')
    }
    else {
        [Environment]::SetEnvironmentVariable('GOLF_SERVICES_API_ENABLED', $null, 'Process')
    }
    if ($CredentialPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($CredentialPointer)
    }
    if ($null -ne $SecureUrl) {
        $SecureUrl.Dispose()
    }
    $PlainUrl = $null
    Write-Host 'Temporary URL and feature flag restored. No .env file changed.'
}
