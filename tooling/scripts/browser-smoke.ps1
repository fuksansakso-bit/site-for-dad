[CmdletBinding()]
param(
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-FreeTcpPort {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    try {
        return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    }
    finally {
        $listener.Stop()
    }
}

function Invoke-Pnpm {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    & $pnpmExecutable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "pnpm command failed (exit $LASTEXITCODE): $($Arguments -join ' ')"
    }
}

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$pnpmCommand = Get-Command 'pnpm.cmd' -ErrorAction Stop
$pnpmExecutable = $pnpmCommand.Source
$databasePort = Get-FreeTcpPort
$storagePort = Get-FreeTcpPort
$runtimePassword = [guid]::NewGuid().ToString('N')
$migrationPassword = [guid]::NewGuid().ToString('N')
$artifactCanary = "artifact-$([guid]::NewGuid().ToString('N'))"
$postgresScheme = 'postgre' + 'sql'
$environment = [ordered]@{
    APP_ENV = 'test'
    ARTIFACT_SECRET_CANARY = $artifactCanary
    BUILD_ID = 'phase-1a-browser'
    DATABASE_STATEMENT_TIMEOUT_MS = '500'
    DATABASE_URL = "${postgresScheme}://foundation_runtime:${runtimePassword}@127.0.0.1:${databasePort}/foundation"
    HEALTH_CHECK_TIMEOUT_MS = '700'
    LOG_LEVEL = 'error'
    MIGRATION_DATABASE_URL = "${postgresScheme}://foundation_migrator:${migrationPassword}@127.0.0.1:${databasePort}/foundation"
    NEXT_PUBLIC_APP_ENV = 'test'
    NEXT_TELEMETRY_DISABLED = '1'
    REQUEST_BODY_LIMIT_BYTES = '1048576'
    S3_ACCESS_KEY_ID = "browser$([guid]::NewGuid().ToString('N'))"
    S3_BUCKET_PRIVATE = 'project-name-browser-private'
    S3_BUCKET_PUBLIC = 'project-name-browser-public'
    S3_BUCKET_QUARANTINE = 'project-name-browser-quarantine'
    S3_ENDPOINT = "http://127.0.0.1:${storagePort}"
    S3_FORCE_PATH_STYLE = 'true'
    S3_MAX_OBJECT_BYTES = '8388608'
    S3_MAX_ATTEMPTS = '3'
    S3_MULTIPART_PART_SIZE_BYTES = '5242880'
    S3_MULTIPART_THRESHOLD_BYTES = '5242880'
    S3_REGION = 'local'
    S3_REQUEST_TIMEOUT_MS = '500'
    S3_SECRET_ACCESS_KEY = "$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))"
    SESSION_SIGNING_KEY = "$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))"
    SIGNED_URL_TTL_SECONDS = '300'
    SYNTHETIC_IDENTITY_ENABLED = 'true'
}
$previousEnvironment = @{}

Push-Location $repositoryRoot
try {
    foreach ($entry in $environment.GetEnumerator()) {
        $previousEnvironment[$entry.Key] = [System.Environment]::GetEnvironmentVariable($entry.Key, 'Process')
        [System.Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
    }

    if (-not $SkipBuild) {
        Invoke-Pnpm -Arguments @('build')
    }
    Invoke-Pnpm -Arguments @('security:artifacts')
    Invoke-Pnpm -Arguments @('exec', 'playwright', 'test')
}
finally {
    foreach ($entry in $environment.GetEnumerator()) {
        [System.Environment]::SetEnvironmentVariable($entry.Key, $previousEnvironment[$entry.Key], 'Process')
    }
    Pop-Location
}
