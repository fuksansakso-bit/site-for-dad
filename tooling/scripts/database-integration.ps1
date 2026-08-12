[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PostgresRoot,

    [Parameter(Mandatory = $true)]
    [string]$NodeRoot,

    [Parameter(Mandatory = $true)]
    [string]$PnpmRoot,

    [Parameter(Mandatory = $true)]
    [string]$RepositoryRoot,

    [Parameter(Mandatory = $true)]
    [string]$CacheRoot,

    [switch]$CleanupStoppedEvidenceOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-ChildPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Candidate,

        [Parameter(Mandatory = $true)]
        [string]$Parent
    )

    $resolvedCandidate = [System.IO.Path]::GetFullPath($Candidate)
    $resolvedParent = [System.IO.Path]::GetFullPath($Parent).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    ) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $resolvedCandidate.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to operate outside the database integration cache: $resolvedCandidate"
    }
    return $resolvedCandidate
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Executable,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [string]$FailureMessage = 'Command failed'
    )

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMessage (exit $LASTEXITCODE)"
    }
}

function Invoke-Pnpm {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [string]$FailureMessage = 'pnpm command failed'
    )

    Invoke-Checked -Executable $pnpmExecutable -Arguments $Arguments -FailureMessage $FailureMessage
}

$resolvedRepositoryRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)
$postgresBin = Join-Path ([System.IO.Path]::GetFullPath($PostgresRoot)) 'bin'
$pnpmExecutable = Join-Path ([System.IO.Path]::GetFullPath($PnpmRoot)) 'pnpm.cmd'
$nodeExecutable = Join-Path ([System.IO.Path]::GetFullPath($NodeRoot)) 'node.exe'
foreach ($requiredExecutable in @(
    (Join-Path $postgresBin 'createdb.exe'),
    (Join-Path $postgresBin 'initdb.exe'),
    (Join-Path $postgresBin 'pg_ctl.exe'),
    (Join-Path $postgresBin 'psql.exe'),
    $nodeExecutable,
    $pnpmExecutable
)) {
    if (-not (Test-Path -LiteralPath $requiredExecutable -PathType Leaf)) {
        throw "Required executable is missing: $requiredExecutable"
    }
}

New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
if ($CleanupStoppedEvidenceOnly) {
    $removedRuns = 0
    foreach ($staleRun in @(Get-ChildItem -LiteralPath $CacheRoot -Directory -Filter 'run-*')) {
        $staleRunPath = Assert-ChildPath -Candidate $staleRun.FullName -Parent $CacheRoot
        $postmasterPidPath = Join-Path $staleRunPath 'postgres-data\postmaster.pid'
        if (Test-Path -LiteralPath $postmasterPidPath -PathType Leaf) {
            $postmasterPid = (Get-Content -LiteralPath $postmasterPidPath -TotalCount 1) -as [int]
            if ($null -ne $postmasterPid -and $null -ne (Get-Process -Id $postmasterPid -ErrorAction SilentlyContinue)) {
                throw "Refusing to remove evidence for a running PostgreSQL process: $staleRunPath"
            }
        }
        Remove-Item -LiteralPath $staleRunPath -Recurse -Force
        $removedRuns += 1
    }
    [pscustomobject]@{ removedStoppedRuns = $removedRuns } | ConvertTo-Json -Compress
    return
}

$runId = [guid]::NewGuid().ToString('N')
$runRoot = Assert-ChildPath -Candidate (Join-Path $CacheRoot "run-$runId") -Parent $CacheRoot
$dataDirectory = Assert-ChildPath -Candidate (Join-Path $runRoot 'postgres-data') -Parent $CacheRoot
$logFile = Assert-ChildPath -Candidate (Join-Path $runRoot 'postgres.log') -Parent $CacheRoot
$recoveryMigrations = Assert-ChildPath -Candidate (Join-Path $runRoot 'recovery-migrations') -Parent $CacheRoot
$passwordFile = [System.IO.Path]::GetTempFileName()
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null

$adminPassword = "local$([guid]::NewGuid().ToString('N'))"
$migrationPassword = "local$([guid]::NewGuid().ToString('N'))"
$runtimePassword = "local$([guid]::NewGuid().ToString('N'))"
$sessionSigningKey = "local$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))"

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()

$serverStarted = $false
$integrationPassed = $false
$originalPath = $env:Path
try {
    $env:Path = "$NodeRoot;$PnpmRoot;$originalPath"
    [System.IO.File]::WriteAllText(
        $passwordFile,
        $adminPassword,
        [System.Text.UTF8Encoding]::new($false)
    )

    Write-Output 'stage=initdb'
    Invoke-Checked `
        -Executable (Join-Path $postgresBin 'initdb.exe') `
        -Arguments @(
            '-D', $dataDirectory,
            '--username=foundation_admin',
            "--pwfile=$passwordFile",
            '--auth-host=scram-sha-256',
            '--auth-local=scram-sha-256',
            '--encoding=UTF8',
            '--locale=C',
            '--no-instructions'
        ) `
        -FailureMessage 'initdb failed'

    $unsafeRules = @(
        Get-Content -LiteralPath (Join-Path $dataDirectory 'pg_hba.conf') |
            Where-Object { $_ -notmatch '^\s*#' -and $_ -match '\btrust\b' }
    )
    if ($unsafeRules.Count -ne 0) {
        throw 'Integration cluster contains trust authentication rules'
    }

    Write-Output 'stage=start'
    Invoke-Checked `
        -Executable (Join-Path $postgresBin 'pg_ctl.exe') `
        -Arguments @(
            'start',
            '-D', $dataDirectory,
            '-l', $logFile,
            '-w',
            '-t', '30',
            '-o', "-h 127.0.0.1 -p $port"
        ) `
        -FailureMessage 'PostgreSQL start failed'
    $serverStarted = $true

    $env:PGCONNECT_TIMEOUT = '5'
    $env:PGPASSWORD = $adminPassword
    $psql = Join-Path $postgresBin 'psql.exe'
    $createdb = Join-Path $postgresBin 'createdb.exe'

    Write-Output 'stage=roles-and-databases'
    $roleSql = @"
CREATE ROLE foundation_migrator LOGIN PASSWORD '$migrationPassword'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE foundation_runtime LOGIN PASSWORD '$runtimePassword'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
"@
    Invoke-Checked `
        -Executable $psql `
        -Arguments @('-h', '127.0.0.1', '-p', "$port", '-U', 'foundation_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', $roleSql) `
        -FailureMessage 'Role creation failed'

    foreach ($databaseName in @('foundation_empty', 'foundation_upgrade', 'foundation_recovery')) {
        Invoke-Checked `
            -Executable $createdb `
            -Arguments @('-h', '127.0.0.1', '-p', "$port", '-U', 'foundation_admin', '-O', 'foundation_migrator', $databaseName) `
            -FailureMessage "Database creation failed: $databaseName"
    }

    $databaseUrlFor = {
        param(
            [string]$DatabaseName,
            [string]$UserName,
            [string]$Password
        )

        $builder = [System.UriBuilder]::new()
        $builder.Scheme = 'postgresql'
        $builder.Host = '127.0.0.1'
        $builder.Port = $port
        $builder.UserName = $UserName
        $builder.Password = $Password
        $builder.Path = $DatabaseName
        $builder.Query = 'schema=public&connect_timeout=5'
        return $builder.Uri.AbsoluteUri
    }

    $migrationUrlFor = {
        param([string]$DatabaseName)
        return & $databaseUrlFor $DatabaseName 'foundation_migrator' $migrationPassword
    }
    $runtimeUrlFor = {
        param([string]$DatabaseName)
        return & $databaseUrlFor $DatabaseName 'foundation_runtime' $runtimePassword
    }

    $env:APP_ENV = 'test'
    $env:LOG_LEVEL = 'info'
    $env:DATABASE_STATEMENT_TIMEOUT_MS = '5000'
    $env:WORKER_RUNTIME_DATABASE_ROLE = 'foundation_runtime'
    $env:SESSION_SIGNING_KEY = $sessionSigningKey
    $env:SYNTHETIC_IDENTITY_ENABLED = 'true'

    Write-Output 'stage=empty-and-repeat-deploy'
    $env:MIGRATION_DATABASE_URL = & $migrationUrlFor 'foundation_empty'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'db:migrate:deploy')
    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'db:migrate:deploy') -FailureMessage 'Repeated migration deploy failed'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'db:migrate:status') -FailureMessage 'Migration status failed'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'db:migrate:diff') -FailureMessage 'Migration drift check failed'

    Write-Output 'stage=queue-migration-explicit-and-repeat'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/jobs', 'jobs:migrate') -FailureMessage 'Queue migration failed'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/jobs', 'jobs:migrate') -FailureMessage 'Repeated queue migration failed'

    Write-Output 'stage=runtime-least-privilege'
    $env:PGPASSWORD = $migrationPassword
    Invoke-Checked `
        -Executable $psql `
        -Arguments @(
            '-h', '127.0.0.1', '-p', "$port", '-U', 'foundation_migrator', '-d', 'foundation_empty',
            '-v', 'ON_ERROR_STOP=1', '-f', (Join-Path $resolvedRepositoryRoot 'legacy\infrastructure\local\runtime-grants.sql')
        ) `
        -FailureMessage 'Runtime grants failed'

    $env:DATABASE_URL = & $runtimeUrlFor 'foundation_empty'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'test:integration') -FailureMessage 'Database integration tests failed'

    Write-Output 'stage=durable-job-contract'
    $env:WORKER_CONCURRENCY = '1'
    $env:WORKER_HEALTH_HOST = '127.0.0.1'
    $healthListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $healthListener.Start()
    $env:WORKER_HEALTH_PORT = ([System.Net.IPEndPoint]$healthListener.LocalEndpoint).Port.ToString()
    $healthListener.Stop()
    $env:WORKER_JOB_TIMEOUT_MS = '1000'
    $env:WORKER_MAX_ATTEMPTS = '3'
    $env:WORKER_POLL_INTERVAL_MS = '100'
    $env:WORKER_SHUTDOWN_TIMEOUT_MS = '5000'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/jobs', 'test:integration') -FailureMessage 'Durable job integration tests failed'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/worker', 'test:integration') -FailureMessage 'Worker process integration tests failed'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/identity', 'test:integration') -FailureMessage 'Identity integration tests failed'

    $env:PGPASSWORD = $runtimePassword
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $psql -h '127.0.0.1' -p $port -U 'foundation_runtime' -d 'foundation_empty' -v 'ON_ERROR_STOP=1' -c 'CREATE TABLE forbidden_runtime_probe (id integer);' 2>$null
    $runtimeCreateExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($runtimeCreateExitCode -eq 0) {
        throw 'Runtime role unexpectedly created a table'
    }
    $ErrorActionPreference = 'Continue'
    & $psql -h '127.0.0.1' -p $port -U 'foundation_runtime' -d 'foundation_empty' -v 'ON_ERROR_STOP=1' -c 'CREATE TABLE graphile_worker.forbidden_runtime_probe (id integer);' 2>$null
    $queueRuntimeCreateExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($queueRuntimeCreateExitCode -eq 0) {
        throw 'Runtime role unexpectedly created a queue table'
    }

    Write-Output 'stage=upgrade-from-first-snapshot'
    $env:PGPASSWORD = $migrationPassword
    $firstMigration = Join-Path $resolvedRepositoryRoot 'packages\db\prisma\migrations\20260802160000_foundation_identity_audit\migration.sql'
    Invoke-Checked `
        -Executable $psql `
        -Arguments @('-h', '127.0.0.1', '-p', "$port", '-U', 'foundation_migrator', '-d', 'foundation_upgrade', '-v', 'ON_ERROR_STOP=1', '-f', $firstMigration) `
        -FailureMessage 'First snapshot application failed'
    $env:MIGRATION_DATABASE_URL = & $migrationUrlFor 'foundation_upgrade'
    Invoke-Pnpm `
        -Arguments @('--filter', '@project-name/db', 'exec', 'prisma', 'migrate', 'resolve', '--applied', '20260802160000_foundation_identity_audit', '--config', 'prisma.config.ts') `
        -FailureMessage 'Snapshot baseline resolve failed'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'db:migrate:deploy') -FailureMessage 'Snapshot upgrade failed'
    $appliedUpgradeCount = & $psql -h '127.0.0.1' -p $port -U 'foundation_migrator' -d 'foundation_upgrade' -Atc "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;"
    $appliedUpgradeExitCode = $LASTEXITCODE
    $canonicalMigrations = Join-Path $resolvedRepositoryRoot 'packages\db\prisma\migrations'
    $expectedMigrationCount = @(
        Get-ChildItem -LiteralPath $canonicalMigrations -Directory |
            Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'migration.sql') -PathType Leaf }
    ).Count
    if ($appliedUpgradeExitCode -ne 0 -or [int]$appliedUpgradeCount -ne $expectedMigrationCount) {
        throw "Snapshot upgrade applied $appliedUpgradeCount of $expectedMigrationCount migrations"
    }

    Write-Output 'stage=failed-migration-recovery'
    $env:MIGRATION_DATABASE_URL = & $migrationUrlFor 'foundation_recovery'
    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'db:migrate:deploy') -FailureMessage 'Recovery baseline deploy failed'
    Copy-Item -LiteralPath $canonicalMigrations -Destination $recoveryMigrations -Recurse
    $probeMigrationName = '20260802162000_recovery_probe'
    $probeMigrationDirectory = Assert-ChildPath -Candidate (Join-Path $recoveryMigrations $probeMigrationName) -Parent $runRoot
    New-Item -ItemType Directory -Path $probeMigrationDirectory -Force | Out-Null
    Copy-Item `
        -LiteralPath (Join-Path $resolvedRepositoryRoot 'packages\db\test\fixtures\failure-migration.sql') `
        -Destination (Join-Path $probeMigrationDirectory 'migration.sql')
    $env:PRISMA_MIGRATIONS_PATH = $recoveryMigrations

    $failureOutput = Join-Path $runRoot 'expected-migration-failure.log'
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $pnpmExecutable --filter '@project-name/db' db:migrate:deploy *> $failureOutput
    $failedMigrationExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    if ($failedMigrationExitCode -eq 0) {
        throw 'Synthetic failing migration unexpectedly succeeded'
    }
    $probeExists = & $psql -h '127.0.0.1' -p $port -U 'foundation_migrator' -d 'foundation_recovery' -Atc "SELECT to_regclass('public.migration_recovery_probe') IS NOT NULL;"
    if ($LASTEXITCODE -ne 0 -or $probeExists -ne 't') {
        throw 'Failed migration did not create the expected partial object'
    }
    Invoke-Checked `
        -Executable $psql `
        -Arguments @('-h', '127.0.0.1', '-p', "$port", '-U', 'foundation_migrator', '-d', 'foundation_recovery', '-v', 'ON_ERROR_STOP=1', '-c', 'DROP TABLE migration_recovery_probe;') `
        -FailureMessage 'Forward cleanup of partial migration failed'
    Invoke-Pnpm `
        -Arguments @('--filter', '@project-name/db', 'exec', 'prisma', 'migrate', 'resolve', '--rolled-back', $probeMigrationName, '--config', 'prisma.config.ts') `
        -FailureMessage 'Failed migration resolve did not succeed'
    Copy-Item `
        -LiteralPath (Join-Path $resolvedRepositoryRoot 'packages\db\test\fixtures\compensated-migration.sql') `
        -Destination (Join-Path $probeMigrationDirectory 'migration.sql') `
        -Force
    Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'db:migrate:deploy') -FailureMessage 'Compensated migration deploy failed'
    $recoveredProbeExists = & $psql -h '127.0.0.1' -p $port -U 'foundation_migrator' -d 'foundation_recovery' -Atc "SELECT to_regclass('public.migration_recovery_probe') IS NOT NULL;"
    if ($LASTEXITCODE -ne 0 -or $recoveredProbeExists -ne 't') {
        throw 'Compensated migration did not recreate the probe table'
    }

    $env:PRISMA_MIGRATIONS_PATH = $null
    $integrationPassed = $true
    [pscustomobject]@{
        appendOnlyAudit = $true
        drift = 'clean'
        emptyReplay = 'passed'
        identityIntegration = 'session-rbac-revocation-workload-separation-audit-outage'
        passwordAuthentication = 'scram-sha-256'
        recovery = 'rolled-back-and-compensated'
        repeatedDeploy = 'passed'
        queueIntegration = 'retry-timeout-idempotency-permanent-failure-graceful-shutdown'
        queueMigrationReplay = 'passed'
        queueRuntimeCreateDenied = $true
        runtimeCreateDenied = $true
        trustRules = $unsafeRules.Count
        upgradeAppliedMigrations = [int]$appliedUpgradeCount
    } | ConvertTo-Json -Compress
}
finally {
    $env:APP_ENV = $null
    $env:DATABASE_STATEMENT_TIMEOUT_MS = $null
    $env:DATABASE_URL = $null
    $env:LOG_LEVEL = $null
    $env:MIGRATION_DATABASE_URL = $null
    $env:PGCONNECT_TIMEOUT = $null
    $env:PGPASSWORD = $null
    $env:PRISMA_MIGRATIONS_PATH = $null
    $env:SESSION_SIGNING_KEY = $null
    $env:SYNTHETIC_IDENTITY_ENABLED = $null
    $env:WORKER_CONCURRENCY = $null
    $env:WORKER_HEALTH_HOST = $null
    $env:WORKER_HEALTH_PORT = $null
    $env:WORKER_JOB_TIMEOUT_MS = $null
    $env:WORKER_MAX_ATTEMPTS = $null
    $env:WORKER_POLL_INTERVAL_MS = $null
    $env:WORKER_SHUTDOWN_TIMEOUT_MS = $null
    $env:WORKER_RUNTIME_DATABASE_ROLE = $null
    $env:Path = $originalPath

    if ($serverStarted -or (Test-Path -LiteralPath (Join-Path $dataDirectory 'postmaster.pid'))) {
        & (Join-Path $postgresBin 'pg_ctl.exe') stop -D $dataDirectory -m fast -w -t 30
    }
    if (Test-Path -LiteralPath $passwordFile -PathType Leaf) {
        Remove-Item -LiteralPath $passwordFile -Force
    }
    if ($integrationPassed -and (Test-Path -LiteralPath $runRoot)) {
        Assert-ChildPath -Candidate $runRoot -Parent $CacheRoot | Out-Null
        Remove-Item -LiteralPath $runRoot -Recurse -Force
    }
    elseif (Test-Path -LiteralPath $runRoot) {
        Write-Warning "Database integration failed; stopped cluster evidence remains under $runRoot"
    }
}
