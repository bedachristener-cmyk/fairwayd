# Windows PowerShell 5.1 – disposable Neon database + isolated Vite UI.
# No .env changes, migrations, Railway actions, or changes to standard ports.
$ErrorActionPreference = 'Stop'
$ApiRoot = Split-Path -Parent $PSScriptRoot
$PreviousUrl = [Environment]::GetEnvironmentVariable('NEON_DATABASE_URL', 'Process')
$HadUrl = Test-Path 'Env:\NEON_DATABASE_URL'
$PreviousFeature = [Environment]::GetEnvironmentVariable('GOLF_SERVICES_API_ENABLED', 'Process')
$HadFeature = Test-Path 'Env:\GOLF_SERVICES_API_ENABLED'
$Pointer = [IntPtr]::Zero
$SecureUrl = $null
$Plain = $null

try {
    Write-Host 'Fairwayd Golf Near Me - isolated BROWSER test'
    Write-Host 'Allowed test branch: golf-near-me-prisma-rehearsal-20261023'
    Write-Host 'Database: fairwayd_stage'
    Write-Host 'Select Direct connection (Connection Pooling OFF) in Neon.'
    Write-Host 'Web UI uses a separate loopback port; existing dev services are not stopped.'
    $SecureUrl = Read-Host -Prompt 'Disposable Neon Direct URL (masked)' -AsSecureString
    if ($null -eq $SecureUrl -or $SecureUrl.Length -eq 0) {
        throw 'Empty connection URL; browser test not started.'
    }
    $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureUrl)
    $Plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)
    [Environment]::SetEnvironmentVariable('NEON_DATABASE_URL', $Plain, 'Process')
    $Plain = $null
    Push-Location $ApiRoot
    try {
        & node (Join-Path $PSScriptRoot 'preview-golf-services-web.mjs') --run
        if ($LASTEXITCODE -ne 0) {
            throw 'Isolated UI test failed or was blocked. Existing services are unchanged.'
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    if ($HadUrl) {
        [Environment]::SetEnvironmentVariable('NEON_DATABASE_URL', $PreviousUrl, 'Process')
    }
    else {
        [Environment]::SetEnvironmentVariable('NEON_DATABASE_URL', $null, 'Process')
    }
    if ($HadFeature) {
        [Environment]::SetEnvironmentVariable('GOLF_SERVICES_API_ENABLED', $PreviousFeature, 'Process')
    }
    else {
        [Environment]::SetEnvironmentVariable('GOLF_SERVICES_API_ENABLED', $null, 'Process')
    }
    if ($Pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer)
    }
    if ($null -ne $SecureUrl) {
        $SecureUrl.Dispose()
    }
    $Plain = $null
    Write-Host 'Temporary database URL restored. No .env files modified.'
}
