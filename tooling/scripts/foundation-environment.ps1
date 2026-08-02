[CmdletBinding()]
param(
    [ValidateSet('Start', 'Stop', 'Status', 'Reset')]
    [string]$Action = 'Start',

    [string]$PostgresRoot = '',

    [string]$RustfsRoot = '',

    [ValidateRange(1, 65535)]
    [int]$WebPort = 3000,

    [ValidateRange(1, 65535)]
    [int]$WorkerPort = 9464,

    [ValidateRange(1, 65535)]
    [int]$DatabasePort = 55432,

    [ValidateRange(1, 65535)]
    [int]$StoragePort = 4569
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
        throw "Refusing to operate outside the project-owned local runtime root: $resolvedCandidate"
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

function Test-LoopbackPort {
    param([Parameter(Mandatory = $true)][int]$Port)

    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        return $client.ConnectAsync('127.0.0.1', $Port).Wait(200) -and $client.Connected
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Wait-LoopbackPort {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process,
        [int]$TimeoutSeconds = 45
    )

    $deadline = [DateTimeOffset]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTimeOffset]::UtcNow -lt $deadline) {
        $Process.Refresh()
        if ($Process.HasExited) {
            throw "Process $($Process.Id) exited before loopback port $Port became ready."
        }
        if (Test-LoopbackPort -Port $Port) { return }
        Start-Sleep -Milliseconds 150
    }
    throw "Loopback port $Port did not become ready within $TimeoutSeconds seconds."
}

function Wait-Health {
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process,
        [int]$TimeoutSeconds = 45
    )

    $deadline = [DateTimeOffset]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTimeOffset]::UtcNow -lt $deadline) {
        $Process.Refresh()
        if ($Process.HasExited) { throw "Process $($Process.Id) exited before health became ready." }
        try {
            $response = Invoke-RestMethod -Uri $Uri -TimeoutSec 2
            if ($response.status -eq 'ok') { return }
        }
        catch {
            # Startup connection failures are expected inside the bounded wait.
        }
        Start-Sleep -Milliseconds 250
    }
    throw "Health endpoint did not become ready: $Uri"
}

function New-ProcessReference {
    param(
        [Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process,
        [Parameter(Mandatory = $true)][string]$Executable
    )

    return [ordered]@{
        executable = [System.IO.Path]::GetFullPath($Executable)
        pid = $Process.Id
        startTimeUtcTicks = $Process.StartTime.ToUniversalTime().Ticks
    }
}

function Stop-TrackedProcess {
    param(
        [AllowNull()]$Reference,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ($null -eq $Reference) { return }
    $process = Get-Process -Id ([int]$Reference.pid) -ErrorAction SilentlyContinue
    if ($null -eq $process) { return }
    $actualPath = [System.IO.Path]::GetFullPath($process.Path)
    $expectedPath = [System.IO.Path]::GetFullPath([string]$Reference.executable)
    $actualTicks = $process.StartTime.ToUniversalTime().Ticks
    if (
        -not $actualPath.Equals($expectedPath, [System.StringComparison]::OrdinalIgnoreCase) -or
        $actualTicks -ne [long]$Reference.startTimeUtcTicks
    ) {
        throw "Refusing to stop $Name because its tracked PID was reused by another process."
    }
    Stop-Process -Id $process.Id
    if (-not $process.WaitForExit(5000)) {
        Stop-Process -Id $process.Id -Force
        [void]$process.WaitForExit(5000)
    }
}

function Get-EndpointStatus {
    param([Parameter(Mandatory = $true)][string]$Uri)

    try {
        return (Invoke-RestMethod -Uri $Uri -TimeoutSec 2).status
    }
    catch {
        return 'stopped'
    }
}

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$localRoot = Join-Path $repositoryRoot '.local'
$runtimeRoot = Assert-ChildPath -Candidate (Join-Path $localRoot 'foundation-environment') -Parent $localRoot
$statePath = Join-Path $runtimeRoot 'state.json'
$secretsPath = Join-Path $runtimeRoot 'secrets.json'
$postgresData = Join-Path $runtimeRoot 'postgres-data'
$storageData = Join-Path $runtimeRoot 'storage-data'
$logRoot = Join-Path $runtimeRoot 'logs'

if ($PostgresRoot -eq '') {
    $PostgresRoot = if ($env:PROJECT_NAME_POSTGRES_ROOT) {
        $env:PROJECT_NAME_POSTGRES_ROOT
    } else {
        Join-Path $env:USERPROFILE '.cache\project-name\postgresql-18.4-2-windows-x64\pgsql'
    }
}
if ($RustfsRoot -eq '') {
    $RustfsRoot = if ($env:PROJECT_NAME_RUSTFS_ROOT) {
        $env:PROJECT_NAME_RUSTFS_ROOT
    } else {
        Join-Path $env:USERPROFILE '.cache\project-name\rustfs-1.0.0-beta.11\bin'
    }
}

$postgresBin = Join-Path ([System.IO.Path]::GetFullPath($PostgresRoot)) 'bin'
$pgCtl = Join-Path $postgresBin 'pg_ctl.exe'
$initdb = Join-Path $postgresBin 'initdb.exe'
$psql = Join-Path $postgresBin 'psql.exe'
$createdb = Join-Path $postgresBin 'createdb.exe'
$rustfsExecutable = Join-Path ([System.IO.Path]::GetFullPath($RustfsRoot)) 'rustfs.exe'
$nodeExecutable = (Get-Command 'node.exe' -ErrorAction Stop).Source
$pnpmExecutable = (Get-Command 'pnpm.cmd' -ErrorAction Stop).Source

function Read-State {
    if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) { return $null }
    return Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
}

function Stop-Environment {
    $state = Read-State
    if ($null -ne $state) {
        Stop-TrackedProcess -Reference $state.worker -Name 'worker'
        Stop-TrackedProcess -Reference $state.web -Name 'web'
        Stop-TrackedProcess -Reference $state.storage -Name 'storage'
    }
    if (Test-Path -LiteralPath (Join-Path $postgresData 'PG_VERSION') -PathType Leaf) {
        & $pgCtl status -D $postgresData *> $null
        if ($LASTEXITCODE -eq 0) {
            Invoke-Checked -Executable $pgCtl -Arguments @('stop', '-D', $postgresData, '-m', 'fast', '-w', '-t', '30') -FailureMessage 'PostgreSQL stop failed'
        }
    }
    if (Test-Path -LiteralPath $statePath -PathType Leaf) {
        Remove-Item -LiteralPath $statePath -Force
    }
}

if ($Action -eq 'Stop') {
    Stop-Environment
    [pscustomobject]@{ environment = 'foundation'; status = 'stopped' } | ConvertTo-Json -Compress
    exit 0
}

if ($Action -eq 'Reset') {
    Stop-Environment
    if (Test-Path -LiteralPath $runtimeRoot) {
        $verifiedRuntimeRoot = Assert-ChildPath -Candidate $runtimeRoot -Parent $localRoot
        Remove-Item -LiteralPath $verifiedRuntimeRoot -Recurse -Force
    }
    [pscustomobject]@{ environment = 'foundation'; status = 'reset'; recoverable = $false } | ConvertTo-Json -Compress
    exit 0
}

if ($Action -eq 'Status') {
    [pscustomobject]@{
        database = if (Test-LoopbackPort -Port $DatabasePort) { 'running' } else { 'stopped' }
        storage = if (Test-LoopbackPort -Port $StoragePort) { 'running' } else { 'stopped' }
        web = Get-EndpointStatus -Uri "http://127.0.0.1:$WebPort/api/v1/health/live"
        worker = Get-EndpointStatus -Uri "http://127.0.0.1:$WorkerPort/health/live"
    } | ConvertTo-Json -Compress
    exit 0
}

foreach ($requiredExecutable in @($nodeExecutable, $pnpmExecutable, $pgCtl, $initdb, $psql, $createdb, $rustfsExecutable)) {
    if (-not (Test-Path -LiteralPath $requiredExecutable -PathType Leaf)) {
        throw "Required Phase 1A prerequisite is missing: $requiredExecutable"
    }
}
$expectedNode = (Get-Content -LiteralPath (Join-Path $repositoryRoot '.node-version') -Raw).Trim()
$actualNode = (& $nodeExecutable --version).TrimStart('v').Trim()
$expectedPnpm = ((Get-Content -LiteralPath (Join-Path $repositoryRoot 'package.json') -Raw | ConvertFrom-Json).packageManager -split '@')[-1]
$actualPnpm = (& $pnpmExecutable --version).Trim()
if ($actualNode -ne $expectedNode -or $actualPnpm -ne $expectedPnpm) {
    throw "Pinned toolchain mismatch. Expected Node $expectedNode / pnpm $expectedPnpm."
}
if (@($WebPort, $WorkerPort, $DatabasePort, $StoragePort) | Group-Object | Where-Object Count -gt 1) {
    throw 'Local Foundation ports must be distinct.'
}

$existingState = Read-State
if ($null -ne $existingState) {
    $trackedEnvironmentIsHealthy =
        (Test-LoopbackPort -Port $DatabasePort) -and
        (Test-LoopbackPort -Port $StoragePort) -and
        (Get-EndpointStatus -Uri "http://127.0.0.1:$WebPort/api/v1/health/live") -eq 'ok' -and
        (Get-EndpointStatus -Uri "http://127.0.0.1:$WorkerPort/health/live") -eq 'ok'
    if ($trackedEnvironmentIsHealthy) {
        [pscustomobject]@{
            message = 'Foundation environment is already tracked; use pnpm dev:status or pnpm dev:stop.'
            status = 'already-started'
        } | ConvertTo-Json -Compress
        exit 0
    }
    Stop-Environment
}
foreach ($port in @($WebPort, $WorkerPort, $DatabasePort, $StoragePort)) {
    if (Test-LoopbackPort -Port $port) {
        throw "Required loopback port is already in use: $port"
    }
}

New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
New-Item -ItemType Directory -Path $storageData -Force | Out-Null
if (-not (Test-Path -LiteralPath $secretsPath -PathType Leaf)) {
    [ordered]@{
        adminPassword = [guid]::NewGuid().ToString('N')
        migrationPassword = [guid]::NewGuid().ToString('N')
        runtimePassword = [guid]::NewGuid().ToString('N')
        sessionSigningKey = "$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))"
        storageAccessKey = "local$([guid]::NewGuid().ToString('N'))"
        storageSecretKey = "$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))"
    } | ConvertTo-Json | Set-Content -LiteralPath $secretsPath -Encoding UTF8
    Set-ItemProperty -LiteralPath $secretsPath -Name IsReadOnly -Value $true
}
$secrets = Get-Content -LiteralPath $secretsPath -Raw | ConvertFrom-Json

$passwordFile = $null
$postgresStarted = $false
$storageProcess = $null
$webProcess = $null
$workerProcess = $null
try {
    if (-not (Test-Path -LiteralPath (Join-Path $postgresData 'PG_VERSION') -PathType Leaf)) {
        $passwordFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($passwordFile, [string]$secrets.adminPassword, [System.Text.UTF8Encoding]::new($false))
        Invoke-Checked -Executable $initdb -Arguments @(
            '-D', $postgresData,
            '--username=foundation_admin',
            "--pwfile=$passwordFile",
            '--auth-host=scram-sha-256',
            '--auth-local=scram-sha-256',
            '--encoding=UTF8',
            '--locale=C',
            '--no-instructions'
        ) -FailureMessage 'PostgreSQL initialization failed'
        $unsafeRules = @(Get-Content -LiteralPath (Join-Path $postgresData 'pg_hba.conf') | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '\btrust\b' })
        if ($unsafeRules.Count -ne 0) { throw 'Local PostgreSQL contains trust authentication rules.' }
    }

    Invoke-Checked -Executable $pgCtl -Arguments @(
        'start', '-D', $postgresData,
        '-l', (Join-Path $logRoot 'postgres.log'),
        '-w', '-t', '30',
        '-o', "-h 127.0.0.1 -p $DatabasePort"
    ) -FailureMessage 'PostgreSQL start failed'
    $postgresStarted = $true
    $env:PGCONNECT_TIMEOUT = '5'
    $env:PGPASSWORD = [string]$secrets.adminPassword

    $migratorExists = (@(& $psql -h 127.0.0.1 -p $DatabasePort -U foundation_admin -d postgres -Atc "SELECT 1 FROM pg_roles WHERE rolname = 'foundation_migrator';") -join '').Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect local PostgreSQL roles.' }
    if ($migratorExists -ne '1') {
        $migratorSql = "CREATE ROLE foundation_migrator LOGIN PASSWORD '$($secrets.migrationPassword)' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;"
        Invoke-Checked -Executable $psql -Arguments @('-h', '127.0.0.1', '-p', "$DatabasePort", '-U', 'foundation_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', $migratorSql) -FailureMessage 'Local migrator role creation failed'
    }
    $runtimeExists = (@(& $psql -h 127.0.0.1 -p $DatabasePort -U foundation_admin -d postgres -Atc "SELECT 1 FROM pg_roles WHERE rolname = 'foundation_runtime';") -join '').Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect local PostgreSQL runtime role.' }
    if ($runtimeExists -ne '1') {
        $runtimeSql = "CREATE ROLE foundation_runtime LOGIN PASSWORD '$($secrets.runtimePassword)' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;"
        Invoke-Checked -Executable $psql -Arguments @('-h', '127.0.0.1', '-p', "$DatabasePort", '-U', 'foundation_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', $runtimeSql) -FailureMessage 'Local runtime role creation failed'
    }
    $databaseExists = (@(& $psql -h 127.0.0.1 -p $DatabasePort -U foundation_admin -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = 'foundation';") -join '').Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect local PostgreSQL database.' }
    if ($databaseExists -ne '1') {
        Invoke-Checked -Executable $createdb -Arguments @('-h', '127.0.0.1', '-p', "$DatabasePort", '-U', 'foundation_admin', '-O', 'foundation_migrator', 'foundation') -FailureMessage 'Local database creation failed'
    }

    $databaseUrlFor = {
        param([string]$UserName, [string]$Password)
        $builder = [System.UriBuilder]::new()
        $builder.Scheme = 'postgresql'
        $builder.Host = '127.0.0.1'
        $builder.Port = $DatabasePort
        $builder.UserName = $UserName
        $builder.Password = $Password
        $builder.Path = 'foundation'
        $builder.Query = 'schema=public&connect_timeout=5'
        return $builder.Uri.AbsoluteUri
    }

    $env:APP_ENV = 'local'
    $env:BUILD_ID = 'phase-1a-local'
    $env:DATABASE_STATEMENT_TIMEOUT_MS = '5000'
    $env:DATABASE_URL = & $databaseUrlFor 'foundation_runtime' ([string]$secrets.runtimePassword)
    $env:HEALTH_CHECK_TIMEOUT_MS = '2000'
    $env:LOG_LEVEL = 'info'
    $env:MIGRATION_DATABASE_URL = & $databaseUrlFor 'foundation_migrator' ([string]$secrets.migrationPassword)
    $env:NEXT_PUBLIC_APP_ENV = 'local'
    $env:NEXT_TELEMETRY_DISABLED = '1'
    $env:REQUEST_BODY_LIMIT_BYTES = '1048576'
    $env:S3_ACCESS_KEY_ID = [string]$secrets.storageAccessKey
    $env:S3_BUCKET_PRIVATE = 'project-name-local-private'
    $env:S3_BUCKET_PUBLIC = 'project-name-local-public'
    $env:S3_BUCKET_QUARANTINE = 'project-name-local-quarantine'
    $env:S3_ENDPOINT = "http://127.0.0.1:$StoragePort"
    $env:S3_FORCE_PATH_STYLE = 'true'
    $env:S3_MAX_OBJECT_BYTES = '1048576'
    $env:S3_REGION = 'local'
    $env:S3_REQUEST_TIMEOUT_MS = '3000'
    $env:S3_SECRET_ACCESS_KEY = [string]$secrets.storageSecretKey
    $env:SESSION_SIGNING_KEY = [string]$secrets.sessionSigningKey
    $env:SIGNED_URL_TTL_SECONDS = '300'
    $env:SYNTHETIC_IDENTITY_ENABLED = 'true'
    $env:WORKER_CONCURRENCY = '1'
    $env:WORKER_HEALTH_HOST = '127.0.0.1'
    $env:WORKER_HEALTH_PORT = "$WorkerPort"
    $env:WORKER_JOB_TIMEOUT_MS = '5000'
    $env:WORKER_MAX_ATTEMPTS = '3'
    $env:WORKER_POLL_INTERVAL_MS = '500'
    $env:WORKER_RUNTIME_DATABASE_ROLE = 'foundation_runtime'
    $env:WORKER_SHUTDOWN_TIMEOUT_MS = '10000'

    Invoke-Checked -Executable $pnpmExecutable -Arguments @('--dir', $repositoryRoot, '--filter', '@project-name/db', 'db:migrate:deploy') -FailureMessage 'Prisma migration deploy failed'
    Invoke-Checked -Executable $pnpmExecutable -Arguments @('--dir', $repositoryRoot, '--filter', '@project-name/jobs', 'jobs:migrate') -FailureMessage 'Graphile migration deploy failed'
    $env:PGPASSWORD = [string]$secrets.migrationPassword
    Invoke-Checked -Executable $psql -Arguments @('-h', '127.0.0.1', '-p', "$DatabasePort", '-U', 'foundation_migrator', '-d', 'foundation', '-v', 'ON_ERROR_STOP=1', '-f', (Join-Path $repositoryRoot 'infrastructure\local\runtime-grants.sql')) -FailureMessage 'Runtime grants failed'

    $env:RUSTFS_ACCESS_KEY = [string]$secrets.storageAccessKey
    $env:RUSTFS_SECRET_KEY = [string]$secrets.storageSecretKey
    $env:RUSTFS_LOG_LEVEL = 'info'
    $storageProcess = Start-Process -FilePath $rustfsExecutable -ArgumentList @('server', '--address', "127.0.0.1:$StoragePort", 'storage-data') -WorkingDirectory $runtimeRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'storage.out.log') -RedirectStandardError (Join-Path $logRoot 'storage.err.log') -PassThru
    Wait-LoopbackPort -Port $StoragePort -Process $storageProcess
    Invoke-Checked -Executable $pnpmExecutable -Arguments @('--dir', $repositoryRoot, '--filter', '@project-name/storage', 'storage:provision:local') -FailureMessage 'Local storage provisioning failed'

    Invoke-Checked -Executable $pnpmExecutable -Arguments @('--dir', $repositoryRoot, 'exec', 'turbo', 'run', 'build', '--filter=@project-name/web', '--filter=@project-name/worker') -FailureMessage 'Foundation application build failed'
    $webProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @('node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', "$WebPort") -WorkingDirectory (Join-Path $repositoryRoot 'apps\web') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'web.out.log') -RedirectStandardError (Join-Path $logRoot 'web.err.log') -PassThru
    $workerProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @('dist/index.js') -WorkingDirectory (Join-Path $repositoryRoot 'apps\worker') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'worker.out.log') -RedirectStandardError (Join-Path $logRoot 'worker.err.log') -PassThru
    Wait-Health -Uri "http://127.0.0.1:$WebPort/api/v1/health/ready" -Process $webProcess
    Wait-Health -Uri "http://127.0.0.1:$WorkerPort/health/ready" -Process $workerProcess

    [ordered]@{
        databasePort = $DatabasePort
        schemaVersion = 1
        storage = New-ProcessReference -Process $storageProcess -Executable $rustfsExecutable
        storagePort = $StoragePort
        web = New-ProcessReference -Process $webProcess -Executable $nodeExecutable
        webPort = $WebPort
        worker = New-ProcessReference -Process $workerProcess -Executable $nodeExecutable
        workerPort = $WorkerPort
    } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding UTF8

    [pscustomobject]@{
        database = 'ok'
        storage = 'ok'
        web = "http://127.0.0.1:$WebPort"
        workerHealth = "http://127.0.0.1:$WorkerPort/health/ready"
    } | ConvertTo-Json -Compress
}
catch {
    foreach ($process in @($workerProcess, $webProcess, $storageProcess)) {
        if ($null -ne $process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force
            [void]$process.WaitForExit(5000)
        }
    }
    if ($postgresStarted) {
        & $pgCtl stop -D $postgresData -m fast -w -t 30 *> $null
    }
    throw
}
finally {
    if ($null -ne $passwordFile -and (Test-Path -LiteralPath $passwordFile)) {
        Remove-Item -LiteralPath $passwordFile -Force
    }
}
