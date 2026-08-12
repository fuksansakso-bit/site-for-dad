[CmdletBinding()]
param([switch]$SkipBuild)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$pnpm = (Get-Command 'pnpm.cmd' -ErrorAction Stop).Source
$previousArtifact = [Environment]::GetEnvironmentVariable('ARTIFACT_SECRET_CANARY', 'Process')
$previousService = [Environment]::GetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', 'Process')

Push-Location $repositoryRoot
try {
    $env:ARTIFACT_SECRET_CANARY = "artifact-$([guid]::NewGuid().ToString('N'))"
    $env:SUPABASE_SERVICE_ROLE_KEY = "service-$([guid]::NewGuid().ToString('N'))"
    if (-not $SkipBuild) {
        & $pnpm build
        if ($LASTEXITCODE -ne 0) { throw 'Next.js build failed.' }
    }
    & $pnpm security:artifacts
    if ($LASTEXITCODE -ne 0) { throw 'Artifact secret scan failed.' }
    & $pnpm exec playwright test tests/browser/phase2a.spec.ts --project=chromium --project=chromium-narrow
    if ($LASTEXITCODE -ne 0) { throw 'Phase 2A browser smoke failed.' }
}
finally {
    [Environment]::SetEnvironmentVariable('ARTIFACT_SECRET_CANARY', $previousArtifact, 'Process')
    [Environment]::SetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', $previousService, 'Process')
    Pop-Location
}
