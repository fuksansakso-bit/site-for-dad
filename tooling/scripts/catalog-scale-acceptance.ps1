[CmdletBinding()]
param(
    [string]$NodeRoot = '',
    [string]$PnpmRoot = '',
    [string]$PostgresRoot = '',
    [string]$CacheRoot = '',
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-ChildPath {
    param(
        [Parameter(Mandatory = $true)][string]$Candidate,
        [Parameter(Mandatory = $true)][string]$Parent
    )

    $resolvedCandidate = [System.IO.Path]::GetFullPath($Candidate)
    $resolvedParent = [System.IO.Path]::GetFullPath($Parent).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    ) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $resolvedCandidate.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to operate outside the catalog scale cache: $resolvedCandidate"
    }
    return $resolvedCandidate
}

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
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$FailureMessage = 'pnpm command failed'
    )

    Invoke-Checked -Executable $pnpmExecutable -Arguments $Arguments -FailureMessage $FailureMessage
}

function Get-FreeTcpPort {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    try {
        $listener.Start()
        return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    }
    finally {
        $listener.Stop()
    }
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
if ($CacheRoot -eq '') {
    $CacheRoot = Join-Path $env:USERPROFILE '.cache\project-name\phase-1b2-catalog-scale'
}

$NodeRoot = [System.IO.Path]::GetFullPath($NodeRoot)
$PnpmRoot = [System.IO.Path]::GetFullPath($PnpmRoot)
$PostgresRoot = [System.IO.Path]::GetFullPath($PostgresRoot)
$CacheRoot = [System.IO.Path]::GetFullPath($CacheRoot)
$pnpmExecutable = Join-Path $PnpmRoot 'pnpm.cmd'
$postgresBin = Join-Path $PostgresRoot 'bin'
$pgStatControl = Join-Path $PostgresRoot 'share\extension\pg_stat_statements.control'
$pgStatLibrary = Join-Path $PostgresRoot 'lib\pg_stat_statements.dll'
foreach ($requiredPath in @(
    (Join-Path $NodeRoot 'node.exe'),
    $pnpmExecutable,
    (Join-Path $postgresBin 'createdb.exe'),
    (Join-Path $postgresBin 'initdb.exe'),
    (Join-Path $postgresBin 'pg_ctl.exe'),
    (Join-Path $postgresBin 'psql.exe'),
    $pgStatControl,
    $pgStatLibrary
)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required catalog scale prerequisite is missing: $requiredPath"
    }
}

New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
$runId = [guid]::NewGuid().ToString('N')
$runRoot = Assert-ChildPath -Candidate (Join-Path $CacheRoot "run-$runId") -Parent $CacheRoot
$dataDirectory = Assert-ChildPath -Candidate (Join-Path $runRoot 'postgres-data') -Parent $CacheRoot
$postgresLog = Assert-ChildPath -Candidate (Join-Path $runRoot 'postgres.log') -Parent $CacheRoot
$passwordFile = [System.IO.Path]::GetTempFileName()
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null

$databasePort = Get-FreeTcpPort
$adminPassword = "local$([guid]::NewGuid().ToString('N'))"
$migrationPassword = "local$([guid]::NewGuid().ToString('N'))"
$runtimePassword = "local$([guid]::NewGuid().ToString('N'))"
$environmentKeys = @(
    'APP_ENV', 'CATALOG_SCALE_STATS_DATABASE_URL', 'DATABASE_STATEMENT_TIMEOUT_MS',
    'DATABASE_URL', 'LOG_LEVEL', 'MIGRATION_DATABASE_URL', 'PGCONNECT_TIMEOUT',
    'PGPASSWORD', 'WORKER_RUNTIME_DATABASE_ROLE'
)
$previousEnvironment = @{}
foreach ($key in $environmentKeys) {
    $previousEnvironment[$key] = [System.Environment]::GetEnvironmentVariable($key, 'Process')
}

$originalPath = $env:PATH
$postgresStarted = $false
$completed = $false
$cleanupFailed = $false
Push-Location $repositoryRoot
try {
    $env:PATH = "$NodeRoot;$PnpmRoot;$originalPath"
    [System.IO.File]::WriteAllText($passwordFile, $adminPassword, [System.Text.UTF8Encoding]::new($false))
    Invoke-Checked -Executable (Join-Path $postgresBin 'initdb.exe') -Arguments @(
        '-D', $dataDirectory,
        '--username=foundation_admin',
        "--pwfile=$passwordFile",
        '--auth-host=scram-sha-256',
        '--auth-local=scram-sha-256',
        '--encoding=UTF8',
        '--locale=C',
        '--no-instructions'
    ) -FailureMessage 'Catalog scale initdb failed'
    Invoke-Checked -Executable (Join-Path $postgresBin 'pg_ctl.exe') -Arguments @(
        'start', '-D', $dataDirectory, '-l', $postgresLog, '-w', '-t', '30',
        '-o', "-h 127.0.0.1 -p $databasePort -c shared_preload_libraries=pg_stat_statements -c compute_query_id=on -c pg_stat_statements.track=all -c pg_stat_statements.track_planning=on"
    ) -FailureMessage 'Catalog scale PostgreSQL start failed'
    $postgresStarted = $true

    $env:PGCONNECT_TIMEOUT = '5'
    $env:PGPASSWORD = $adminPassword
    $psql = Join-Path $postgresBin 'psql.exe'
    $createdb = Join-Path $postgresBin 'createdb.exe'
    $roleSql = @"
CREATE ROLE foundation_migrator LOGIN PASSWORD '$migrationPassword'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE foundation_runtime LOGIN PASSWORD '$runtimePassword'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
"@
    Invoke-Checked -Executable $psql -Arguments @(
        '-h', '127.0.0.1', '-p', "$databasePort", '-U', 'foundation_admin', '-d', 'postgres',
        '-v', 'ON_ERROR_STOP=1', '-c', $roleSql
    ) -FailureMessage 'Catalog scale role creation failed'
    Invoke-Checked -Executable $createdb -Arguments @(
        '-h', '127.0.0.1', '-p', "$databasePort", '-U', 'foundation_admin',
        '-O', 'foundation_migrator', 'catalog_scale'
    ) -FailureMessage 'Catalog scale database creation failed'

    $databaseUrlFor = {
        param([string]$UserName, [string]$Password)
        $builder = [System.UriBuilder]::new()
        $builder.Scheme = 'postgresql'
        $builder.Host = '127.0.0.1'
        $builder.Port = $databasePort
        $builder.UserName = $UserName
        $builder.Password = $Password
        $builder.Path = 'catalog_scale'
        $builder.Query = 'schema=public&connect_timeout=5'
        return $builder.Uri.AbsoluteUri
    }
    $adminUrl = & $databaseUrlFor 'foundation_admin' $adminPassword
    $migrationUrl = & $databaseUrlFor 'foundation_migrator' $migrationPassword
    $runtimeUrl = & $databaseUrlFor 'foundation_runtime' $runtimePassword

    $env:APP_ENV = 'test'
    $env:CATALOG_SCALE_STATS_DATABASE_URL = $adminUrl
    $env:DATABASE_STATEMENT_TIMEOUT_MS = '5000'
    $env:DATABASE_URL = $migrationUrl
    $env:LOG_LEVEL = 'error'
    $env:MIGRATION_DATABASE_URL = $migrationUrl
    $env:WORKER_RUNTIME_DATABASE_ROLE = 'foundation_runtime'

    if (-not $SkipBuild) {
        Invoke-Pnpm -Arguments @('build') -FailureMessage 'Catalog scale workspace build failed'
    }
    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'db:migrate:deploy') -FailureMessage 'Catalog scale migrations failed'
    $env:PGPASSWORD = $adminPassword
    Invoke-Checked -Executable $psql -Arguments @(
        '-h', '127.0.0.1', '-p', "$databasePort", '-U', 'foundation_admin', '-d', 'catalog_scale',
        '-v', 'ON_ERROR_STOP=1', '-c', 'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;'
    ) -FailureMessage 'Catalog scale pg_stat_statements setup failed'
    $env:PGPASSWORD = $migrationPassword
    Invoke-Checked -Executable $psql -Arguments @(
        '-h', '127.0.0.1', '-p', "$databasePort", '-U', 'foundation_migrator', '-d', 'catalog_scale',
        '-v', 'ON_ERROR_STOP=1', '-f', (Join-Path $repositoryRoot 'legacy\infrastructure\local\runtime-grants.sql')
    ) -FailureMessage 'Catalog scale runtime grants failed'

    $env:DATABASE_URL = $runtimeUrl
    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'test:scale') -FailureMessage 'Catalog scale acceptance failed'

    $postgresLogText = if (Test-Path -LiteralPath $postgresLog -PathType Leaf) { Get-Content -LiteralPath $postgresLog -Raw } else { '' }
    foreach ($secret in @($adminPassword, $migrationPassword, $runtimePassword)) {
        if ($postgresLogText.Contains($secret)) {
            throw 'Catalog scale PostgreSQL log exposed a generated credential.'
        }
    }

    $completed = $true
    [pscustomobject]@{
        realDiscoveredMaterials = 1655
        status = 'passed'
        syntheticMaterials = 2048
    } | ConvertTo-Json -Compress
}
finally {
    if ($postgresStarted -or (Test-Path -LiteralPath (Join-Path $dataDirectory 'postmaster.pid'))) {
        & (Join-Path $postgresBin 'pg_ctl.exe') stop -D $dataDirectory -m fast -w -t 30
        if ($LASTEXITCODE -ne 0) { $cleanupFailed = $true }
    }
    if (Test-Path -LiteralPath $passwordFile -PathType Leaf) {
        Remove-Item -LiteralPath $passwordFile -Force
    }
    foreach ($key in $environmentKeys) {
        [System.Environment]::SetEnvironmentVariable($key, $previousEnvironment[$key], 'Process')
    }
    $env:PATH = $originalPath
    Pop-Location

    if ($completed -and -not $cleanupFailed -and (Test-Path -LiteralPath $runRoot)) {
        Assert-ChildPath -Candidate $runRoot -Parent $CacheRoot | Out-Null
        Remove-Item -LiteralPath $runRoot -Recurse -Force
    }
    elseif (Test-Path -LiteralPath $runRoot) {
        Write-Warning "Catalog scale evidence remains under $runRoot"
    }
    if ($cleanupFailed) { throw 'Catalog scale cleanup failed; exact stopped evidence was retained.' }
}
