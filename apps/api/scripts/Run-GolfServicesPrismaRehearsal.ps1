# Windows PowerShell 5.1 compatible.
# Uses a one-time, masked Neon connection URL entered ONLY on this workstation.
# NEVER writes the URL into .env, Git, or command-line arguments.
# The JavaScript safety gate pins the ephemeral branch's direct host and database.

$ErrorActionPreference = 'Stop'
$ApiRoot = Split-Path -Parent $PSScriptRoot
$PreviousUrl = [Environment]::GetEnvironmentVariable('NEON_DATABASE_URL', 'Process')
$HadPrevious = Test-Path 'Env:\NEON_DATABASE_URL'
$CredentialPointer = [IntPtr]::Zero
$SecureUrl = $null
$PlainUrl = $null

try {
    Write-Host 'Golf Near Me - Prisma rehearsal (ISOLATED CHILD ONLY)'
    Write-Host 'Allowed Neon host: ep-late-band-ag2ya7lq.c-2.eu-central-1.aws.neon.tech'
    Write-Host 'Required database: fairwayd_stage'
    Write-Host 'Important: Choose Direct connection / no -pooler in Neon.'
    Write-Host 'Nothing from your existing Railway or Stage environment is used.'
    Write-Host ''
    Write-Host 'Paste the DIRECT connection URL below. Input is masked.'
    $SecureUrl = Read-Host -Prompt 'Isolated Neon Prisma-test URL' -AsSecureString

    if ($null -eq $SecureUrl -or $SecureUrl.Length -eq 0) {
        throw 'No connection URL entered; no migration attempted.'
    }

    $CredentialPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureUrl)
    $PlainUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($CredentialPointer)

    [Environment]::SetEnvironmentVariable('NEON_DATABASE_URL', $PlainUrl, 'Process')
    $PlainUrl = $null

    Push-Location $ApiRoot
    try {
        & node (Join-Path $PSScriptRoot 'rehearse-golf-services-prisma.mjs') --apply
        if ($LASTEXITCODE -ne 0) {
            throw 'Prisma rehearsal stopped/failed. Do not run migrate deploy manually.'
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

    if ($CredentialPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($CredentialPointer)
    }
    if ($null -ne $SecureUrl) {
        $SecureUrl.Dispose()
    }
    $PlainUrl = $null
    Write-Host 'Transient connection variable restored. No .env file modified.'
}
