[CmdletBinding()]
param(
    [string]$NodeRoot = '',
    [string]$PnpmRoot = '',
    [string]$PostgresRoot = '',
    [string]$DockerExecutable = '',
    [string]$IntegrationCacheRoot = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$FailureMessage = 'Command failed'
    )

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMessage (exit $LASTEXITCODE)"
    }
}

function Invoke-Pnpm {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    Invoke-Checked -Executable $pnpmExecutable -Arguments $Arguments -FailureMessage "pnpm $($Arguments -join ' ') failed"
}

function Invoke-Stage {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Operation
    )

    $startedAt = [DateTimeOffset]::UtcNow
    Write-Output "stage=$Name"
    & $Operation
    $stages.Add([ordered]@{
        durationMilliseconds = [int]([DateTimeOffset]::UtcNow - $startedAt).TotalMilliseconds
        name = $Name
        status = 'passed'
    }) | Out-Null
}

function Set-BuildEnvironment {
    $runtimePassword = [guid]::NewGuid().ToString('N')
    $migrationPassword = [guid]::NewGuid().ToString('N')
    $postgresScheme = 'postgre' + 'sql'
    $values = [ordered]@{
        APP_ENV = 'ci'
        ARTIFACT_SECRET_CANARY = "artifact-$([guid]::NewGuid().ToString('N'))"
        BUILD_ID = 'phase-1a-ci'
        CI = 'true'
        DATABASE_STATEMENT_TIMEOUT_MS = '500'
        DATABASE_URL = "${postgresScheme}://foundation_runtime:${runtimePassword}@127.0.0.1:1/foundation"
        HEALTH_CHECK_TIMEOUT_MS = '500'
        LOG_LEVEL = 'error'
        MIGRATION_DATABASE_URL = "${postgresScheme}://foundation_migrator:${migrationPassword}@127.0.0.1:1/foundation"
        NEXT_PUBLIC_APP_ENV = 'ci'
        NEXT_TELEMETRY_DISABLED = '1'
        REQUEST_BODY_LIMIT_BYTES = '1048576'
        S3_ACCESS_KEY_ID = "ci$([guid]::NewGuid().ToString('N'))"
        S3_BUCKET_PRIVATE = 'project-name-ci-private'
        S3_BUCKET_PUBLIC = 'project-name-ci-public'
        S3_BUCKET_QUARANTINE = 'project-name-ci-quarantine'
        S3_ENDPOINT = 'http://127.0.0.1:1'
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
        WORKER_CONCURRENCY = '1'
        WORKER_HEALTH_HOST = '127.0.0.1'
        WORKER_HEALTH_PORT = '9464'
        WORKER_JOB_TIMEOUT_MS = '3000'
        WORKER_MAX_ATTEMPTS = '3'
        WORKER_POLL_INTERVAL_MS = '250'
        WORKER_RUNTIME_DATABASE_ROLE = 'foundation_runtime'
        WORKER_SHUTDOWN_TIMEOUT_MS = '6000'
    }
    foreach ($entry in $values.GetEnumerator()) {
        $script:previousEnvironment[$entry.Key] = [System.Environment]::GetEnvironmentVariable($entry.Key, 'Process')
        [System.Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
    }
    $script:buildEnvironment = $values
}

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if ($NodeRoot -eq '') {
    $pinnedNodeVersion = (Get-Content -LiteralPath (Join-Path $repositoryRoot '.node-version') -Raw).Trim()
    $cachedNodeRoot = Join-Path $env:USERPROFILE ".cache\project-name\node-v$pinnedNodeVersion\node-v$pinnedNodeVersion-win-x64"
    $NodeRoot = if (Test-Path -LiteralPath (Join-Path $cachedNodeRoot 'node.exe') -PathType Leaf) { $cachedNodeRoot } else { Split-Path -Parent ((Get-Command 'node.exe' -ErrorAction Stop).Source) }
}
if ($PnpmRoot -eq '') {
    $pinnedPnpmVersion = ((Get-Content -LiteralPath (Join-Path $repositoryRoot 'package.json') -Raw | ConvertFrom-Json).packageManager -split '@')[-1]
    $cachedPnpmRoot = Join-Path $env:USERPROFILE ".cache\project-name\pnpm-$pinnedPnpmVersion"
    $PnpmRoot = if (Test-Path -LiteralPath (Join-Path $cachedPnpmRoot 'pnpm.cmd') -PathType Leaf) { $cachedPnpmRoot } else { Split-Path -Parent ((Get-Command 'pnpm.cmd' -ErrorAction Stop).Source) }
}
if ($PostgresRoot -eq '') {
    $PostgresRoot = if ($env:PROJECT_NAME_POSTGRES_ROOT) { $env:PROJECT_NAME_POSTGRES_ROOT } else { Join-Path $env:USERPROFILE '.cache\project-name\postgresql-18.4-2-windows-x64\pgsql' }
}
if ($DockerExecutable -eq '') {
    $dockerCommand = Get-Command 'docker.exe' -ErrorAction SilentlyContinue
    if ($null -ne $dockerCommand) {
        $DockerExecutable = $dockerCommand.Source
    }
    else {
        $DockerExecutable = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
    }
}
if ($IntegrationCacheRoot -eq '') {
    $IntegrationCacheRoot = Join-Path $env:USERPROFILE '.cache\project-name\phase-1a-validation'
}

$NodeRoot = [System.IO.Path]::GetFullPath($NodeRoot)
$PnpmRoot = [System.IO.Path]::GetFullPath($PnpmRoot)
$PostgresRoot = [System.IO.Path]::GetFullPath($PostgresRoot)
$DockerExecutable = [System.IO.Path]::GetFullPath($DockerExecutable)
$IntegrationCacheRoot = [System.IO.Path]::GetFullPath($IntegrationCacheRoot)
$nodeExecutable = Join-Path $NodeRoot 'node.exe'
$pnpmExecutable = Join-Path $PnpmRoot 'pnpm.cmd'
$postgresExecutable = Join-Path $PostgresRoot 'bin\postgres.exe'
foreach ($requiredExecutable in @($nodeExecutable, $pnpmExecutable, $postgresExecutable, $DockerExecutable)) {
    if (-not (Test-Path -LiteralPath $requiredExecutable -PathType Leaf)) {
        throw "Required verification prerequisite is missing: $requiredExecutable"
    }
}

$originalPath = $env:PATH
$previousEnvironment = @{}
$buildEnvironment = $null
$stages = [System.Collections.Generic.List[object]]::new()
$evidenceRoot = Join-Path $repositoryRoot '.local\verification'
New-Item -ItemType Directory -Path $evidenceRoot -Force | Out-Null
New-Item -ItemType Directory -Path $IntegrationCacheRoot -Force | Out-Null

Push-Location $repositoryRoot
try {
    $env:PATH = "$NodeRoot;$PnpmRoot;$originalPath"
    Invoke-Stage -Name 'toolchain-and-frozen-install' -Operation {
        $expectedNode = (Get-Content -LiteralPath '.node-version' -Raw).Trim()
        $expectedPnpm = ((Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).packageManager -split '@')[-1]
        if ((& $nodeExecutable --version).TrimStart('v').Trim() -ne $expectedNode) { throw 'Node version mismatch.' }
        if ((& $pnpmExecutable --version).Trim() -ne $expectedPnpm) { throw 'pnpm version mismatch.' }
        if ((@(& $postgresExecutable --version) -join "`n") -notmatch '\b18\.4\b') { throw 'PostgreSQL version mismatch.' }
        Invoke-Checked -Executable $DockerExecutable -Arguments @('info') -FailureMessage 'Docker runtime unavailable'
        Invoke-Pnpm -Arguments @('install', '--frozen-lockfile')
    }

    Invoke-Stage -Name 'format-documentation-scope-and-boundaries' -Operation {
        Invoke-Pnpm -Arguments @('format:check')
        Invoke-Pnpm -Arguments @('docs:check')
        Invoke-Pnpm -Arguments @('phase-scope:check')
        Invoke-Pnpm -Arguments @('architecture:check')
        Invoke-Checked -Executable 'git.exe' -Arguments @('diff', '--check') -FailureMessage 'Git whitespace validation failed'
    }

    Invoke-Stage -Name 'lint-and-strict-typecheck' -Operation {
        Invoke-Pnpm -Arguments @('lint')
        Invoke-Pnpm -Arguments @('typecheck')
    }

    Invoke-Stage -Name 'unit-contract-and-coverage' -Operation {
        Invoke-Pnpm -Arguments @('test:coverage')
    }

    Invoke-Stage -Name 'postgres-migration-job-and-identity-integration' -Operation {
        Invoke-Checked -Executable 'powershell.exe' -Arguments @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $repositoryRoot 'tooling\scripts\database-integration.ps1'),
            '-PostgresRoot', $PostgresRoot,
            '-NodeRoot', $NodeRoot,
            '-PnpmRoot', $PnpmRoot,
            '-RepositoryRoot', $repositoryRoot,
            '-CacheRoot', (Join-Path $IntegrationCacheRoot 'database')
        ) -FailureMessage 'PostgreSQL/recovery integration failed'
    }

    Invoke-Stage -Name 'versitygw-storage-contract-integration' -Operation {
        Invoke-Checked -Executable 'powershell.exe' -Arguments @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $repositoryRoot 'tooling\scripts\storage-integration.ps1'),
            '-DockerExecutable', $DockerExecutable,
            '-NodeRoot', $NodeRoot,
            '-PnpmRoot', $PnpmRoot,
            '-RepositoryRoot', $repositoryRoot,
            '-CacheRoot', (Join-Path $IntegrationCacheRoot 'storage')
        ) -FailureMessage 'Storage integration failed'
    }

    Invoke-Stage -Name 'production-build-and-artifact-secret-scan' -Operation {
        Set-BuildEnvironment
        Invoke-Pnpm -Arguments @('build')
        Invoke-Pnpm -Arguments @('security:artifacts')
        Invoke-Checked -Executable 'powershell.exe' -Arguments @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $repositoryRoot 'tooling\scripts\catalog-scale-acceptance.ps1'),
            '-NodeRoot', $NodeRoot,
            '-PnpmRoot', $PnpmRoot,
            '-PostgresRoot', $PostgresRoot,
            '-CacheRoot', (Join-Path $IntegrationCacheRoot 'catalog-scale'),
            '-SkipBuild'
        ) -FailureMessage 'Catalog scale acceptance failed'
    }

    Invoke-Stage -Name 'chromium-firefox-webkit-smoke' -Operation {
        Invoke-Pnpm -Arguments @('exec', 'playwright', 'install', 'chromium', 'firefox', 'webkit')
        Invoke-Checked -Executable 'powershell.exe' -Arguments @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $repositoryRoot 'tooling\scripts\browser-smoke.ps1'), '-SkipBuild'
        ) -FailureMessage 'Browser smoke failed'
        Invoke-Checked -Executable 'powershell.exe' -Arguments @(
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $repositoryRoot 'tooling\scripts\catalog-browser-acceptance.ps1'),
            '-NodeRoot', $NodeRoot,
            '-PnpmRoot', $PnpmRoot,
            '-PostgresRoot', $PostgresRoot,
            '-DockerExecutable', $DockerExecutable,
            '-CacheRoot', (Join-Path $IntegrationCacheRoot 'catalog-browser'),
            '-SkipBuild'
        ) -FailureMessage 'Active catalog browser acceptance failed'
    }

    Invoke-Stage -Name 'committed-secret-and-critical-advisory-scan' -Operation {
        Invoke-Pnpm -Arguments @('security:secrets')
        Invoke-Pnpm -Arguments @('audit', '--audit-level', 'critical')
        & $pnpmExecutable licenses list --json | Set-Content -LiteralPath (Join-Path $evidenceRoot 'licenses.json') -Encoding UTF8
        if ($LASTEXITCODE -ne 0) { throw 'Dependency license inventory failed.' }
    }

    $manifest = [ordered]@{
        branch = (& git.exe branch --show-current).Trim()
        commit = (& git.exe rev-parse HEAD).Trim()
        generatedAt = [DateTimeOffset]::UtcNow.ToString('O')
        phase = '1A_FOUNDATION'
        providerNeutral = $true
        schemaVersion = 1
        stages = $stages
        toolchain = [ordered]@{
            node = (& $nodeExecutable --version).Trim()
            playwright = (& $pnpmExecutable exec playwright --version).Trim()
            pnpm = (& $pnpmExecutable --version).Trim()
            postgres = (& $postgresExecutable --version).Trim()
            docker = (& $DockerExecutable version --format '{{.Server.Version}}').Trim()
            versitygw = 'v1.4.1@sha256:0400cb59f59da0f1cf9f7fd49505191abc348dfadf54509bf1988caaff4eb96f'
        }
    }
    $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $evidenceRoot 'foundation-evidence.json') -Encoding UTF8
    [pscustomobject]@{ evidence = '.local/verification/foundation-evidence.json'; stages = $stages.Count; status = 'passed' } | ConvertTo-Json -Compress
}
finally {
    if ($null -ne $buildEnvironment) {
        foreach ($entry in $buildEnvironment.GetEnumerator()) {
            [System.Environment]::SetEnvironmentVariable($entry.Key, $previousEnvironment[$entry.Key], 'Process')
        }
    }
    $env:PATH = $originalPath
    Pop-Location
}
