[CmdletBinding()]
param(
    [string]$NodeRoot = '',
    [string]$PnpmRoot = '',
    [string]$PostgresRoot = '',
    [string]$DockerExecutable = '',
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
        throw "Refusing to operate outside the catalog browser cache: $resolvedCandidate"
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

function Get-FreeTcpPorts {
    param([Parameter(Mandatory = $true)][int]$Count)

    $listeners = [System.Collections.Generic.List[System.Net.Sockets.TcpListener]]::new()
    try {
        for ($index = 0; $index -lt $Count; $index += 1) {
            $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
            $listener.Start()
            $listeners.Add($listener)
        }
        return @($listeners | ForEach-Object { ([System.Net.IPEndPoint]$_.LocalEndpoint).Port })
    }
    finally {
        foreach ($listener in $listeners) { $listener.Stop() }
    }
}

function Wait-HttpReady {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $deadline = [DateTimeOffset]::UtcNow.AddSeconds(60)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return }
        }
        catch {
            Start-Sleep -Milliseconds 250
        }
    } while ([DateTimeOffset]::UtcNow -lt $deadline)
    throw "$Name did not become ready at $Url"
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
    $DockerExecutable = if ($null -ne $dockerCommand) { $dockerCommand.Source } else { Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe' }
}
if ($CacheRoot -eq '') {
    $CacheRoot = Join-Path $env:USERPROFILE '.cache\project-name\phase-1b2-catalog-browser'
}

$NodeRoot = [System.IO.Path]::GetFullPath($NodeRoot)
$PnpmRoot = [System.IO.Path]::GetFullPath($PnpmRoot)
$PostgresRoot = [System.IO.Path]::GetFullPath($PostgresRoot)
$DockerExecutable = [System.IO.Path]::GetFullPath($DockerExecutable)
$CacheRoot = [System.IO.Path]::GetFullPath($CacheRoot)
$nodeExecutable = Join-Path $NodeRoot 'node.exe'
$pnpmExecutable = Join-Path $PnpmRoot 'pnpm.cmd'
$postgresBin = Join-Path $PostgresRoot 'bin'
$webWorkingDirectory = Join-Path $repositoryRoot 'apps\web'
$nextRelativeExecutable = 'node_modules/next/dist/bin/next'
$nextExecutable = Join-Path $repositoryRoot 'apps\web\node_modules\next\dist\bin\next'
$composeFile = Join-Path $repositoryRoot 'infrastructure\local\compose.storage.yml'
foreach ($requiredPath in @(
    $nodeExecutable,
    $pnpmExecutable,
    (Join-Path $postgresBin 'createdb.exe'),
    (Join-Path $postgresBin 'initdb.exe'),
    (Join-Path $postgresBin 'pg_ctl.exe'),
    (Join-Path $postgresBin 'psql.exe'),
    $DockerExecutable,
    $composeFile
)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required catalog browser prerequisite is missing: $requiredPath"
    }
}

New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
$runId = [guid]::NewGuid().ToString('N')
$suffix = $runId.Substring(0, 12)
$runRoot = Assert-ChildPath -Candidate (Join-Path $CacheRoot "run-$runId") -Parent $CacheRoot
$dataDirectory = Assert-ChildPath -Candidate (Join-Path $runRoot 'postgres-data') -Parent $CacheRoot
$postgresLog = Assert-ChildPath -Candidate (Join-Path $runRoot 'postgres.log') -Parent $CacheRoot
$webOutput = Assert-ChildPath -Candidate (Join-Path $runRoot 'web.stdout.log') -Parent $CacheRoot
$webError = Assert-ChildPath -Candidate (Join-Path $runRoot 'web.stderr.log') -Parent $CacheRoot
$passwordFile = [System.IO.Path]::GetTempFileName()
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null

$ports = @(Get-FreeTcpPorts -Count 4)
$databasePort = $ports[0]
$storagePort = $ports[1]
$storageAdminPort = $ports[2]
$webPort = $ports[3]
$adminPassword = "local$([guid]::NewGuid().ToString('N'))"
$migrationPassword = "local$([guid]::NewGuid().ToString('N'))"
$runtimePassword = "local$([guid]::NewGuid().ToString('N'))"
$accessKey = "browser$([guid]::NewGuid().ToString('N'))"
$secretKey = "$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))"
$sessionSigningKey = "$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))"
$composeProject = "project-name-catalog-browser-$suffix"
$volumePrefix = "project_name_catalog_browser_$suffix"
$composeArguments = @('compose', '--project-name', $composeProject, '--file', $composeFile)
$environmentKeys = @(
    'APP_ENV', 'BUILD_ID', 'CATALOG_ACTIVE_BROWSER', 'CATALOG_S3_ADMIN_PORT',
    'CATALOG_S3_PORT', 'CATALOG_S3_VOLUME_PREFIX', 'DATABASE_STATEMENT_TIMEOUT_MS',
    'DATABASE_URL', 'HEALTH_CHECK_TIMEOUT_MS', 'LOG_LEVEL', 'MIGRATION_DATABASE_URL',
    'NEXT_PUBLIC_APP_ENV', 'NEXT_TELEMETRY_DISABLED', 'PGCONNECT_TIMEOUT', 'PGPASSWORD',
    'PLAYWRIGHT_BASE_URL', 'PLAYWRIGHT_EXTERNAL_SERVER', 'REQUEST_BODY_LIMIT_BYTES',
    'S3_ACCESS_KEY_ID', 'S3_BUCKET_PRIVATE', 'S3_BUCKET_PUBLIC', 'S3_BUCKET_QUARANTINE',
    'S3_ENDPOINT', 'S3_FORCE_PATH_STYLE', 'S3_MAX_ATTEMPTS', 'S3_MAX_OBJECT_BYTES',
    'S3_MULTIPART_PART_SIZE_BYTES', 'S3_MULTIPART_THRESHOLD_BYTES', 'S3_REGION',
    'S3_REQUEST_TIMEOUT_MS', 'S3_SECRET_ACCESS_KEY', 'SESSION_SIGNING_KEY',
    'SIGNED_URL_TTL_SECONDS', 'SYNTHETIC_IDENTITY_ENABLED', 'WORKER_RUNTIME_DATABASE_ROLE'
)
$previousEnvironment = @{}
foreach ($key in $environmentKeys) {
    $previousEnvironment[$key] = [System.Environment]::GetEnvironmentVariable($key, 'Process')
}

$originalPath = $env:PATH
$postgresStarted = $false
$composeStarted = $false
$webProcess = $null
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
    ) -FailureMessage 'Catalog browser initdb failed'
    Invoke-Checked -Executable (Join-Path $postgresBin 'pg_ctl.exe') -Arguments @(
        'start', '-D', $dataDirectory, '-l', $postgresLog, '-w', '-t', '30',
        '-o', "-h 127.0.0.1 -p $databasePort"
    ) -FailureMessage 'Catalog browser PostgreSQL start failed'
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
    ) -FailureMessage 'Catalog browser role creation failed'
    Invoke-Checked -Executable $createdb -Arguments @(
        '-h', '127.0.0.1', '-p', "$databasePort", '-U', 'foundation_admin',
        '-O', 'foundation_migrator', 'catalog_browser'
    ) -FailureMessage 'Catalog browser database creation failed'

    $databaseUrlFor = {
        param([string]$UserName, [string]$Password)
        $builder = [System.UriBuilder]::new()
        $builder.Scheme = 'postgresql'
        $builder.Host = '127.0.0.1'
        $builder.Port = $databasePort
        $builder.UserName = $UserName
        $builder.Password = $Password
        $builder.Path = 'catalog_browser'
        $builder.Query = 'schema=public&connect_timeout=5'
        return $builder.Uri.AbsoluteUri
    }
    $migrationUrl = & $databaseUrlFor 'foundation_migrator' $migrationPassword
    $runtimeUrl = & $databaseUrlFor 'foundation_runtime' $runtimePassword

    $env:APP_ENV = 'test'
    $env:BUILD_ID = 'phase-1b2-catalog-browser'
    $env:CATALOG_ACTIVE_BROWSER = 'true'
    $env:CATALOG_S3_ADMIN_PORT = "$storageAdminPort"
    $env:CATALOG_S3_PORT = "$storagePort"
    $env:CATALOG_S3_VOLUME_PREFIX = $volumePrefix
    $env:DATABASE_STATEMENT_TIMEOUT_MS = '5000'
    $env:DATABASE_URL = $migrationUrl
    $env:HEALTH_CHECK_TIMEOUT_MS = '1000'
    $env:LOG_LEVEL = 'error'
    $env:MIGRATION_DATABASE_URL = $migrationUrl
    $env:NEXT_PUBLIC_APP_ENV = 'test'
    $env:NEXT_TELEMETRY_DISABLED = '1'
    $env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:$webPort"
    $env:PLAYWRIGHT_EXTERNAL_SERVER = 'true'
    $env:REQUEST_BODY_LIMIT_BYTES = '1048576'
    $env:S3_ACCESS_KEY_ID = $accessKey
    $env:S3_BUCKET_PRIVATE = "project-name-$suffix-private"
    $env:S3_BUCKET_PUBLIC = "project-name-$suffix-public"
    $env:S3_BUCKET_QUARANTINE = "project-name-$suffix-quarantine"
    $env:S3_ENDPOINT = "http://127.0.0.1:$storagePort"
    $env:S3_FORCE_PATH_STYLE = 'true'
    $env:S3_MAX_ATTEMPTS = '3'
    $env:S3_MAX_OBJECT_BYTES = '8388608'
    $env:S3_MULTIPART_PART_SIZE_BYTES = '5242880'
    $env:S3_MULTIPART_THRESHOLD_BYTES = '5242880'
    $env:S3_REGION = 'local'
    $env:S3_REQUEST_TIMEOUT_MS = '5000'
    $env:S3_SECRET_ACCESS_KEY = $secretKey
    $env:SESSION_SIGNING_KEY = $sessionSigningKey
    $env:SIGNED_URL_TTL_SECONDS = '300'
    $env:SYNTHETIC_IDENTITY_ENABLED = 'true'
    $env:WORKER_RUNTIME_DATABASE_ROLE = 'foundation_runtime'

    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'db:migrate:deploy') -FailureMessage 'Catalog browser migrations failed'
    $env:PGPASSWORD = $migrationPassword
    Invoke-Checked -Executable $psql -Arguments @(
        '-h', '127.0.0.1', '-p', "$databasePort", '-U', 'foundation_migrator', '-d', 'catalog_browser',
        '-v', 'ON_ERROR_STOP=1', '-f', (Join-Path $repositoryRoot 'infrastructure\local\runtime-grants.sql')
    ) -FailureMessage 'Catalog browser runtime grants failed'

    if (-not $SkipBuild) {
        Invoke-Pnpm -Arguments @('build') -FailureMessage 'Catalog browser production build failed'
    }
    if (-not (Test-Path -LiteralPath $nextExecutable -PathType Leaf)) {
        throw "Next.js runtime is missing after build: $nextExecutable"
    }

    Invoke-Checked -Executable $DockerExecutable -Arguments ($composeArguments + @(
        'up', '--detach', '--wait', '--wait-timeout', '60', 'catalog-storage'
    )) -FailureMessage 'Catalog browser VersityGW startup failed'
    $composeStarted = $true
    Wait-HttpReady -Url "http://127.0.0.1:$storagePort/health" -Name 'Catalog browser storage'
    Invoke-Pnpm -Arguments @(
        '--filter', '@project-name/storage', 'storage:provision:local'
    ) -FailureMessage 'Catalog browser bucket provisioning failed'
    Invoke-Checked -Executable $nodeExecutable -Arguments @(
        (Join-Path $repositoryRoot 'tooling\scripts\catalog-browser-seed.mjs')
    ) -FailureMessage 'Catalog browser fixture seed failed'

    $env:DATABASE_URL = $runtimeUrl
    $webProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @(
        $nextRelativeExecutable, 'start', '--hostname', '127.0.0.1', '--port', "$webPort"
    ) -WorkingDirectory $webWorkingDirectory -RedirectStandardOutput $webOutput -RedirectStandardError $webError -WindowStyle Hidden -PassThru
    Wait-HttpReady -Url "http://127.0.0.1:$webPort/api/v1/health/live" -Name 'Catalog browser web'
    Invoke-Pnpm -Arguments @(
        'exec', 'playwright', 'test', 'tests/browser/catalog-active.spec.ts'
    ) -FailureMessage 'Active catalog browser acceptance failed'

    $combinedWebLogs = ""
    if (Test-Path -LiteralPath $webOutput -PathType Leaf) { $combinedWebLogs += Get-Content -LiteralPath $webOutput -Raw }
    if (Test-Path -LiteralPath $webError -PathType Leaf) { $combinedWebLogs += Get-Content -LiteralPath $webError -Raw }
    foreach ($secret in @($adminPassword, $migrationPassword, $runtimePassword, $accessKey, $secretKey, $sessionSigningKey)) {
        if ($combinedWebLogs.Contains($secret)) { throw 'Catalog browser web logs exposed a generated credential.' }
    }

    $completed = $true
    [pscustomobject]@{
        catalogVersion = '00000000-0000-4000-8000-00000000b004'
        categories = 3
        items = 4
        media = 4
        projects = 5
        runtimeAmigoRequests = 0
        status = 'passed'
    } | ConvertTo-Json -Compress
}
finally {
    if ($null -ne $webProcess) {
        Stop-Process -Id $webProcess.Id -ErrorAction SilentlyContinue
        Wait-Process -Id $webProcess.Id -Timeout 15 -ErrorAction SilentlyContinue
    }
    if ($composeStarted) {
        if (-not $volumePrefix.StartsWith('project_name_catalog_browser_', [System.StringComparison]::Ordinal)) {
            throw 'Refusing to remove unexpected catalog browser Docker volumes.'
        }
        $cleanupPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        & $DockerExecutable @composeArguments 'down' '--volumes' '--remove-orphans' '--timeout' '30' *> $null
        if ($LASTEXITCODE -ne 0) { $cleanupFailed = $true }
        $ErrorActionPreference = $cleanupPreference
    }
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
        Write-Warning "Catalog browser evidence remains under $runRoot"
    }
    if ($cleanupFailed) { throw 'Catalog browser cleanup failed; exact stopped evidence was retained.' }
}
