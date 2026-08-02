[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PostgresRoot,

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
        throw "Refusing to operate outside the smoke cache root: $resolvedCandidate"
    }

    return $resolvedCandidate
}

$postgresBin = Join-Path $PostgresRoot 'bin'
$requiredExecutables = @('initdb.exe', 'pg_ctl.exe', 'createdb.exe', 'psql.exe')
foreach ($executable in $requiredExecutables) {
    $candidate = Join-Path $postgresBin $executable
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw "Required PostgreSQL executable is missing: $candidate"
    }
}

New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
if ($CleanupStoppedEvidenceOnly) {
    $removedClusters = 0
    foreach ($staleCluster in @(Get-ChildItem -LiteralPath $CacheRoot -Directory -Filter 'cluster-*')) {
        $staleClusterPath = Assert-ChildPath -Candidate $staleCluster.FullName -Parent $CacheRoot
        $postmasterPidPath = Join-Path $staleClusterPath 'postmaster.pid'
        if (Test-Path -LiteralPath $postmasterPidPath -PathType Leaf) {
            $postmasterPid = (Get-Content -LiteralPath $postmasterPidPath -TotalCount 1) -as [int]
            if ($null -ne $postmasterPid -and $null -ne (Get-Process -Id $postmasterPid -ErrorAction SilentlyContinue)) {
                throw "Refusing to remove a running PostgreSQL smoke cluster: $staleClusterPath"
            }
        }
        Remove-Item -LiteralPath $staleClusterPath -Recurse -Force
        $matchingLog = "$staleClusterPath.log"
        if (Test-Path -LiteralPath $matchingLog -PathType Leaf) {
            Assert-ChildPath -Candidate $matchingLog -Parent $CacheRoot | Out-Null
            Remove-Item -LiteralPath $matchingLog -Force
        }
        $removedClusters += 1
    }
    [pscustomobject]@{ removedStoppedClusters = $removedClusters } | ConvertTo-Json -Compress
    return
}

$runId = [guid]::NewGuid().ToString('N')
$dataDirectory = Assert-ChildPath -Candidate (Join-Path $CacheRoot "cluster-$runId") -Parent $CacheRoot
$logFile = Assert-ChildPath -Candidate (Join-Path $CacheRoot "cluster-$runId.log") -Parent $CacheRoot
$passwordFile = [System.IO.Path]::GetTempFileName()
$password = "local-$([guid]::NewGuid().ToString('N'))"

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()

$serverStarted = $false
try {
    Write-Output 'stage=initdb'
    [System.IO.File]::WriteAllText(
        $passwordFile,
        $password,
        [System.Text.UTF8Encoding]::new($false)
    )

    & (Join-Path $postgresBin 'initdb.exe') `
        -D $dataDirectory `
        '--username=foundation_admin' `
        "--pwfile=$passwordFile" `
        '--auth-host=scram-sha-256' `
        '--auth-local=scram-sha-256' `
        '--encoding=UTF8' `
        '--locale=C' `
        '--no-instructions' | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'initdb failed'
    }

    $unsafeRules = @(
        Get-Content -LiteralPath (Join-Path $dataDirectory 'pg_hba.conf') |
            Where-Object { $_ -notmatch '^\s*#' -and $_ -match '\btrust\b' }
    )
    if ($unsafeRules.Count -ne 0) {
        throw 'Smoke cluster contains trust authentication rules'
    }

    Write-Output 'stage=start'
    & (Join-Path $postgresBin 'pg_ctl.exe') `
        start `
        -D $dataDirectory `
        -l $logFile `
        -w `
        -t 30 `
        -o "-h 127.0.0.1 -p $port"
    if ($LASTEXITCODE -ne 0) {
        throw 'pg_ctl start failed'
    }
    $serverStarted = $true

    $env:PGPASSWORD = $password
    $env:PGCONNECT_TIMEOUT = '5'
    Write-Output 'stage=createdb'
    & (Join-Path $postgresBin 'createdb.exe') `
        -h '127.0.0.1' `
        -p $port `
        -U 'foundation_admin' `
        'foundation_smoke'
    if ($LASTEXITCODE -ne 0) {
        throw 'createdb failed'
    }

    Write-Output 'stage=query'
    $databaseName = & (Join-Path $postgresBin 'psql.exe') `
        -h '127.0.0.1' `
        -p $port `
        -U 'foundation_admin' `
        -d 'foundation_smoke' `
        -Atc 'select current_database();'
    if ($LASTEXITCODE -ne 0 -or $databaseName -ne 'foundation_smoke') {
        throw 'PostgreSQL query smoke failed'
    }

    [pscustomobject]@{
        database = $databaseName
        host = '127.0.0.1'
        passwordAuth = 'scram-sha-256'
        trustRules = $unsafeRules.Count
    } | ConvertTo-Json -Compress
}
finally {
    $env:PGPASSWORD = $null
    $env:PGCONNECT_TIMEOUT = $null

    if ($serverStarted -or (Test-Path -LiteralPath (Join-Path $dataDirectory 'postmaster.pid'))) {
        Write-Output 'stage=stop'
        & (Join-Path $postgresBin 'pg_ctl.exe') `
            stop `
            -D $dataDirectory `
            -m fast `
            -w `
            -t 30
    }

    if (Test-Path -LiteralPath $passwordFile -PathType Leaf) {
        Remove-Item -LiteralPath $passwordFile -Force
    }

    if (Test-Path -LiteralPath $dataDirectory) {
        Assert-ChildPath -Candidate $dataDirectory -Parent $CacheRoot | Out-Null
        Remove-Item -LiteralPath $dataDirectory -Recurse -Force
    }

    if (Test-Path -LiteralPath $logFile -PathType Leaf) {
        Assert-ChildPath -Candidate $logFile -Parent $CacheRoot | Out-Null
        Remove-Item -LiteralPath $logFile -Force
    }
}
