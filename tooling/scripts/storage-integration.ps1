[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$RustfsRoot,

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
        throw "Refusing to operate outside the storage integration cache: $resolvedCandidate"
    }
    return $resolvedCandidate
}

function Get-FreeTcpPort {
    $listener = [System.Net.Sockets.TcpListener]::new(
        [System.Net.IPAddress]::Loopback,
        0
    )
    $listener.Start()
    try {
        return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    }
    finally {
        $listener.Stop()
    }
}

function Wait-LoopbackPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,

        [Parameter(Mandatory = $true)]
        [System.Diagnostics.Process]$Process,

        [int]$TimeoutSeconds = 45
    )

    $deadline = [DateTimeOffset]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTimeOffset]::UtcNow -lt $deadline) {
        $Process.Refresh()
        if ($Process.HasExited) {
            throw "RustFS exited before its loopback endpoint became ready."
        }
        $client = [System.Net.Sockets.TcpClient]::new()
        try {
            $connected = $client.ConnectAsync('127.0.0.1', $Port).Wait(250)
            if ($connected -and $client.Connected) {
                return
            }
        }
        catch {
            # A refused connection is expected while the disposable emulator starts.
        }
        finally {
            $client.Dispose()
        }
        Start-Sleep -Milliseconds 150
    }
    throw "RustFS did not open its loopback endpoint within the allowed startup window."
}

function Remove-StoppedRun {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunPath
    )

    $safeRunPath = Assert-ChildPath -Candidate $RunPath -Parent $CacheRoot
    $pidPath = Join-Path $safeRunPath 'process-id.txt'
    if (Test-Path -LiteralPath $pidPath -PathType Leaf) {
        $processId = [int](Get-Content -LiteralPath $pidPath -Raw).Trim()
        $existing = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($null -ne $existing) {
            throw "Refusing to remove storage evidence while process $processId is running."
        }
    }
    Remove-Item -LiteralPath $safeRunPath -Recurse -Force
}

$rustfsExecutable = Join-Path $RustfsRoot 'rustfs.exe'
$nodeExecutable = Join-Path $NodeRoot 'node.exe'
$pnpmExecutable = Join-Path $PnpmRoot 'pnpm.cmd'
foreach ($requiredFile in @($rustfsExecutable, $nodeExecutable, $pnpmExecutable)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
        throw "Required executable is missing: $requiredFile"
    }
}

$resolvedRepository = (Resolve-Path -LiteralPath $RepositoryRoot).Path
New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
$resolvedCache = (Resolve-Path -LiteralPath $CacheRoot).Path

if ($CleanupStoppedEvidenceOnly) {
    $removedRuns = 0
    foreach ($staleRun in @(Get-ChildItem -LiteralPath $resolvedCache -Directory -Filter 'run-*')) {
        Remove-StoppedRun -RunPath $staleRun.FullName
        $removedRuns += 1
    }
    [pscustomobject]@{ removedStoppedRuns = $removedRuns } | ConvertTo-Json -Compress
    exit 0
}

$runId = [Guid]::NewGuid().ToString('N')
$runRoot = Assert-ChildPath -Candidate (Join-Path $resolvedCache "run-$runId") -Parent $resolvedCache
$dataRoot = Join-Path $runRoot 'data'
$logRoot = Join-Path $runRoot 'logs'
New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

$apiPort = Get-FreeTcpPort
$accessKey = "pn$([Guid]::NewGuid().ToString('N'))"
$secretKey = "$([Guid]::NewGuid().ToString('N'))$([Guid]::NewGuid().ToString('N'))"
$stdoutPath = Join-Path $logRoot 'stdout.log'
$stderrPath = Join-Path $logRoot 'stderr.log'
$process = $null
$completed = $false

try {
    $env:RUSTFS_ACCESS_KEY = $accessKey
    $env:RUSTFS_SECRET_KEY = $secretKey
    $env:RUSTFS_LOG_LEVEL = 'info'
    $process = Start-Process `
        -FilePath $rustfsExecutable `
        -ArgumentList @(
            'server',
            '--address', "127.0.0.1:$apiPort",
            $dataRoot
        ) `
        -WorkingDirectory $runRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -PassThru
    Set-Content -LiteralPath (Join-Path $runRoot 'process-id.txt') -Value $process.Id -NoNewline
    Wait-LoopbackPort -Port $apiPort -Process $process

    $suffix = $runId.Substring(0, 12)
    $env:PATH = "$NodeRoot;$PnpmRoot;$env:PATH"
    $env:APP_ENV = 'test'
    $env:LOG_LEVEL = 'info'
    $env:S3_ACCESS_KEY_ID = $accessKey
    $env:S3_BUCKET_PUBLIC = "project-name-$suffix-public"
    $env:S3_BUCKET_PRIVATE = "project-name-$suffix-private"
    $env:S3_BUCKET_QUARANTINE = "project-name-$suffix-quarantine"
    $env:S3_ENDPOINT = "http://127.0.0.1:$apiPort"
    $env:S3_FORCE_PATH_STYLE = 'true'
    $env:S3_MAX_OBJECT_BYTES = '1048576'
    $env:S3_REGION = 'local'
    $env:S3_REQUEST_TIMEOUT_MS = '3000'
    $env:S3_SECRET_ACCESS_KEY = $secretKey
    $env:SIGNED_URL_TTL_SECONDS = '300'

    & $pnpmExecutable --dir $resolvedRepository --filter '@project-name/storage' test:integration
    if ($LASTEXITCODE -ne 0) {
        throw "Storage integration contract failed (exit $LASTEXITCODE)."
    }

    $completed = $true
}
finally {
    if ($null -ne $process) {
        $process.Refresh()
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id
            [void]$process.WaitForExit(10000)
        }
        $process.Dispose()
    }

    $logs = @($stdoutPath, $stderrPath) |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
        ForEach-Object { Get-Content -LiteralPath $_ -Raw }
    $combinedLogs = $logs -join "`n"
    if ($combinedLogs.Contains($accessKey) -or $combinedLogs.Contains($secretKey)) {
        $completed = $false
        Write-Error 'RustFS logs contained a generated credential; evidence was retained.'
    }

    if ($completed) {
        Remove-StoppedRun -RunPath $runRoot
    }
}

if (-not $completed) {
    throw "Storage integration did not complete; stopped evidence remains under the dedicated cache."
}

[pscustomobject]@{
    anonymousListingDenied = $true
    anonymousPrivateReadDenied = $true
    anonymousWriteDenied = $true
    checksumValidated = $true
    dependencyFailure = 'safe-unavailable'
    emulator = 'RustFS 1.0.0-beta.11 loopback-only'
    immutablePut = $true
    signedReadWrite = $true
    trustZones = 3
} | ConvertTo-Json -Compress
