[CmdletBinding()]
param(
    [string]$NodeRoot = '',

    [string]$PnpmRoot = '',

    [string]$RepositoryRoot = '',

    [string]$CacheRoot = '',

    [string]$DockerExecutable = '',

    [string]$AmigoImageUrl = 'https://shop.amigo.ru/upload/iblock/4ff/4pnr3xspx7u6l550gbtcl8c24zj3ej3q.jpg',

    [switch]$CleanupStoppedEvidenceOnly
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
        throw "Refusing to operate outside the storage integration cache: $resolvedCandidate"
    }
    return $resolvedCandidate
}

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

function Wait-StorageHealth {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutSeconds = 60
    )

    $deadline = [DateTimeOffset]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTimeOffset]::UtcNow -lt $deadline) {
        try {
            $response = Invoke-WebRequest `
                -Uri "http://127.0.0.1:$Port/health" `
                -UseBasicParsing `
                -TimeoutSec 2
            if ($response.StatusCode -eq 200 -and $response.Content.Trim() -eq 'OK') {
                return
            }
        }
        catch {
            # Connection failures are expected during the bounded container startup window.
        }
        Start-Sleep -Milliseconds 250
    }
    throw "VersityGW health did not become ready on loopback port $Port."
}

function Remove-StoppedRun {
    param([Parameter(Mandatory = $true)][string]$RunPath)

    $safeRunPath = Assert-ChildPath -Candidate $RunPath -Parent $CacheRoot
    $statePath = Join-Path $safeRunPath 'run-state.json'
    if (Test-Path -LiteralPath $statePath -PathType Leaf) {
        $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        $expectedRunId = [System.IO.Path]::GetFileName($safeRunPath).Substring(4)
        $expectedSuffix = $expectedRunId.Substring(0, 12)
        $expectedProject = "project-name-storage-gate-$expectedSuffix"
        $expectedVolumePrefix = "project_name_gate_$expectedSuffix"
        if (
            [string]$state.runId -ne $expectedRunId -or
            [string]$state.composeProject -ne $expectedProject -or
            [string]$state.volumePrefix -ne $expectedVolumePrefix
        ) {
            throw "Refusing to clean storage gate with unexpected state: $safeRunPath"
        }

        $containerStates = @(
            & $DockerExecutable ps --all --filter "label=com.docker.compose.project=$expectedProject" --format '{{.State}}'
        )
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to inspect stopped storage gate: $expectedProject"
        }
        if (@($containerStates | Where-Object { $_ -eq 'running' -or $_ -eq 'restarting' }).Count -ne 0) {
            throw "Refusing to clean a running storage gate: $expectedProject"
        }

        $previousAccessKey = $env:S3_ACCESS_KEY_ID
        $previousSecretKey = $env:S3_SECRET_ACCESS_KEY
        $previousRegion = $env:S3_REGION
        $previousPort = $env:CATALOG_S3_PORT
        $previousAdminPort = $env:CATALOG_S3_ADMIN_PORT
        $previousVolumePrefix = $env:CATALOG_S3_VOLUME_PREFIX
        try {
            $env:S3_ACCESS_KEY_ID = 'cleanup-placeholder-access'
            $env:S3_SECRET_ACCESS_KEY = 'cleanup-placeholder-secret'
            $env:S3_REGION = 'local'
            $env:CATALOG_S3_PORT = [string]$state.s3Port
            $env:CATALOG_S3_ADMIN_PORT = [string]$state.adminPort
            $env:CATALOG_S3_VOLUME_PREFIX = $expectedVolumePrefix
            $previousErrorPreference = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            & $DockerExecutable compose --project-name $expectedProject --file $composeFile down --volumes --remove-orphans --timeout 30 *> $null
            $cleanupExitCode = $LASTEXITCODE
            $ErrorActionPreference = $previousErrorPreference
            if ($cleanupExitCode -ne 0) {
                throw "Unable to clean stopped storage gate: $expectedProject"
            }
        }
        finally {
            $env:S3_ACCESS_KEY_ID = $previousAccessKey
            $env:S3_SECRET_ACCESS_KEY = $previousSecretKey
            $env:S3_REGION = $previousRegion
            $env:CATALOG_S3_PORT = $previousPort
            $env:CATALOG_S3_ADMIN_PORT = $previousAdminPort
            $env:CATALOG_S3_VOLUME_PREFIX = $previousVolumePrefix
        }
    }
    Remove-Item -LiteralPath $safeRunPath -Recurse -Force
}

function Get-VerifiedAmigoImage {
    param(
        [Parameter(Mandatory = $true)][string]$SourceUrl,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    $uri = [Uri]$SourceUrl
    if (
        $uri.Scheme -ne 'https' -or
        $uri.Host -ne 'shop.amigo.ru' -or
        -not $uri.AbsolutePath.StartsWith('/upload/iblock/', [System.StringComparison]::Ordinal) -or
        $uri.UserInfo -ne '' -or
        $uri.Query -ne '' -or
        $uri.Fragment -ne ''
    ) {
        throw 'The real AMIGO storage-gate image URL is outside the authorized media boundary.'
    }

    $curl = (Get-Command 'curl.exe' -ErrorAction Stop).Source
    Invoke-Checked -Executable $curl -Arguments @(
        '--proto', '=https',
        '--proto-redir', '=https',
        '--location',
        '--max-redirs', '2',
        '--connect-timeout', '10',
        '--max-time', '60',
        '--max-filesize', '8388608',
        '--fail',
        '--silent',
        '--show-error',
        '--output', $Destination,
        $SourceUrl
    ) -FailureMessage 'Authorized AMIGO storage-gate image download failed'

    $file = Get-Item -LiteralPath $Destination
    if ($file.Length -ne 515180) {
        throw "Real AMIGO storage-gate image size changed: $($file.Length)."
    }
    $header = [byte[]]::new(3)
    $stream = [System.IO.File]::OpenRead($Destination)
    try {
        if ($stream.Read($header, 0, $header.Length) -ne $header.Length) {
            throw 'Real AMIGO storage-gate image is truncated.'
        }
    }
    finally {
        $stream.Dispose()
    }
    if ($header[0] -ne 0xFF -or $header[1] -ne 0xD8 -or $header[2] -ne 0xFF) {
        throw 'Real AMIGO storage-gate image MIME signature is not JPEG.'
    }
    return (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash.ToLowerInvariant()
}

if ($RepositoryRoot -eq '') {
    $RepositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}
if ($NodeRoot -eq '') {
    $pinnedNodeVersion = (Get-Content -LiteralPath (Join-Path $RepositoryRoot '.node-version') -Raw).Trim()
    $cachedNodeRoot = Join-Path $env:USERPROFILE ".cache\project-name\node-v$pinnedNodeVersion\node-v$pinnedNodeVersion-win-x64"
    $NodeRoot = if (Test-Path -LiteralPath (Join-Path $cachedNodeRoot 'node.exe') -PathType Leaf) {
        $cachedNodeRoot
    } else {
        Split-Path -Parent ((Get-Command 'node.exe' -ErrorAction Stop).Source)
    }
}
if ($PnpmRoot -eq '') {
    $pinnedPnpmVersion = ((Get-Content -LiteralPath (Join-Path $RepositoryRoot 'package.json') -Raw | ConvertFrom-Json).packageManager -split '@')[-1]
    $cachedPnpmRoot = Join-Path $env:USERPROFILE ".cache\project-name\pnpm-$pinnedPnpmVersion"
    $PnpmRoot = if (Test-Path -LiteralPath (Join-Path $cachedPnpmRoot 'pnpm.cmd') -PathType Leaf) {
        $cachedPnpmRoot
    } else {
        Split-Path -Parent ((Get-Command 'pnpm.cmd' -ErrorAction Stop).Source)
    }
}
if ($CacheRoot -eq '') {
    $CacheRoot = Join-Path $env:USERPROFILE '.cache\project-name\storage-integration'
}

$nodeExecutable = Join-Path $NodeRoot 'node.exe'
$pnpmExecutable = Join-Path $PnpmRoot 'pnpm.cmd'
foreach ($requiredFile in @($nodeExecutable, $pnpmExecutable)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
        throw "Required executable is missing: $requiredFile"
    }
}

if ($DockerExecutable -eq '') {
    $dockerCommand = Get-Command 'docker.exe' -ErrorAction SilentlyContinue
    if ($null -ne $dockerCommand) {
        $DockerExecutable = $dockerCommand.Source
    }
    else {
        $perUserDocker = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
        if (Test-Path -LiteralPath $perUserDocker -PathType Leaf) {
            $DockerExecutable = $perUserDocker
        }
    }
}
if ($DockerExecutable -eq '' -or -not (Test-Path -LiteralPath $DockerExecutable -PathType Leaf)) {
    throw 'Docker CLI is unavailable; the VersityGW storage gate cannot run.'
}
Invoke-Checked -Executable $DockerExecutable -Arguments @('info') -FailureMessage 'Docker runtime is unavailable'

$resolvedRepository = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$composeFile = Join-Path $resolvedRepository 'infrastructure\local\compose.storage.yml'
if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
    throw "VersityGW Compose file is missing: $composeFile"
}
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
$logRoot = Join-Path $runRoot 'logs'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$amigoImagePath = Join-Path $runRoot 'amigo-storage-gate.jpg'
$s3Port = Get-FreeTcpPort
$adminPort = Get-FreeTcpPort
if ($s3Port -eq $adminPort) { throw 'Storage integration ports must be distinct.' }
$accessKey = "pn$([Guid]::NewGuid().ToString('N'))"
$secretKey = "$([Guid]::NewGuid().ToString('N'))$([Guid]::NewGuid().ToString('N'))"
$composeProject = "project-name-storage-gate-$($runId.Substring(0, 12))"
$volumePrefix = "project_name_gate_$($runId.Substring(0, 12))"
$composeArguments = @('compose', '--project-name', $composeProject, '--file', $composeFile)
$runState = [ordered]@{
    adminPort = $adminPort
    composeProject = $composeProject
    runId = $runId
    s3Port = $s3Port
    schemaVersion = 1
    volumePrefix = $volumePrefix
}
$runState | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runRoot 'run-state.json') -Encoding UTF8
$environmentKeys = @(
    'AMIGO_STORAGE_GATE_IMAGE_PATH',
    'APP_ENV',
    'CATALOG_S3_ADMIN_PORT',
    'CATALOG_S3_PORT',
    'CATALOG_S3_VOLUME_PREFIX',
    'LOG_LEVEL',
    'S3_ACCESS_KEY_ID',
    'S3_BUCKET_PRIVATE',
    'S3_BUCKET_PUBLIC',
    'S3_BUCKET_QUARANTINE',
    'S3_ENDPOINT',
    'S3_FORCE_PATH_STYLE',
    'S3_MAX_ATTEMPTS',
    'S3_MAX_OBJECT_BYTES',
    'S3_MULTIPART_PART_SIZE_BYTES',
    'S3_MULTIPART_THRESHOLD_BYTES',
    'S3_REGION',
    'S3_REQUEST_TIMEOUT_MS',
    'S3_SECRET_ACCESS_KEY',
    'SIGNED_URL_TTL_SECONDS',
    'STORAGE_GATE_RUN_ID',
    'STORAGE_PERSISTENCE_KEY'
)
$previousEnvironment = @{}
foreach ($key in $environmentKeys) {
    $previousEnvironment[$key] = [System.Environment]::GetEnvironmentVariable($key, 'Process')
}

$completed = $false
$composeStarted = $false
$result = $null
try {
    $suffix = $runId.Substring(0, 12)
    $env:AMIGO_STORAGE_GATE_IMAGE_PATH = $amigoImagePath
    $env:APP_ENV = 'test'
    $env:CATALOG_S3_ADMIN_PORT = "$adminPort"
    $env:CATALOG_S3_PORT = "$s3Port"
    $env:CATALOG_S3_VOLUME_PREFIX = $volumePrefix
    $env:LOG_LEVEL = 'info'
    $env:S3_ACCESS_KEY_ID = $accessKey
    $env:S3_BUCKET_PUBLIC = "project-name-$suffix-public"
    $env:S3_BUCKET_PRIVATE = "project-name-$suffix-private"
    $env:S3_BUCKET_QUARANTINE = "project-name-$suffix-quarantine"
    $env:S3_ENDPOINT = "http://127.0.0.1:$s3Port"
    $env:S3_FORCE_PATH_STYLE = 'true'
    $env:S3_MAX_ATTEMPTS = '3'
    $env:S3_MAX_OBJECT_BYTES = '8388608'
    $env:S3_MULTIPART_PART_SIZE_BYTES = '5242880'
    $env:S3_MULTIPART_THRESHOLD_BYTES = '5242880'
    $env:S3_REGION = 'local'
    $env:S3_REQUEST_TIMEOUT_MS = '5000'
    $env:S3_SECRET_ACCESS_KEY = $secretKey
    $env:SIGNED_URL_TTL_SECONDS = '300'
    $env:STORAGE_GATE_RUN_ID = $runId
    $env:STORAGE_PERSISTENCE_KEY = "storage-gate/$runId/restart.txt"
    $env:PATH = "$NodeRoot;$PnpmRoot;$env:PATH"

    Invoke-Checked -Executable $DockerExecutable -Arguments ($composeArguments + @(
        'up', '--detach', '--wait', '--wait-timeout', '60', 'catalog-storage'
    )) -FailureMessage 'VersityGW Compose startup failed'
    $composeStarted = $true
    Wait-StorageHealth -Port $s3Port

    $containerId = (@(& $DockerExecutable @composeArguments 'ps' '--quiet' 'catalog-storage') -join '').Trim()
    if ($LASTEXITCODE -ne 0 -or $containerId -eq '') {
        throw 'Unable to resolve the VersityGW container ID.'
    }
    $mounts = (@(& $DockerExecutable inspect $containerId --format '{{json .Mounts}}') -join '') | ConvertFrom-Json
    if (
        @($mounts).Count -ne 3 -or
        @($mounts | Where-Object Type -ne 'volume').Count -ne 0 -or
        @($mounts.Destination | Sort-Object) -join ',' -ne '/data,/iam,/versioning'
    ) {
        throw 'VersityGW must use exactly three Docker named volumes and no bind mounts.'
    }
    $restartPolicy = (@(& $DockerExecutable inspect $containerId --format '{{.HostConfig.RestartPolicy.Name}}') -join '').Trim()
    if ($restartPolicy -ne 'always') {
        throw "Unexpected VersityGW restart policy: $restartPolicy"
    }

    Invoke-Checked -Executable $pnpmExecutable -Arguments @(
        '--dir', $resolvedRepository, '--filter', '@project-name/storage', 'storage:provision:local'
    ) -FailureMessage 'Private trust-zone bucket provisioning failed'

    $amigoSha256 = Get-VerifiedAmigoImage -SourceUrl $AmigoImageUrl -Destination $amigoImagePath
    Invoke-Checked -Executable $pnpmExecutable -Arguments @(
        '--dir', $resolvedRepository, '--filter', '@project-name/storage', 'test:integration'
    ) -FailureMessage 'VersityGW storage contract failed'

    Invoke-Checked -Executable $pnpmExecutable -Arguments @(
        '--dir', $resolvedRepository, '--filter', '@project-name/storage',
        'storage:restart:persistence', 'seed'
    ) -FailureMessage 'Restart persistence seed failed'
    Invoke-Checked -Executable $DockerExecutable -Arguments ($composeArguments + @(
        'stop', '--timeout', '30', 'catalog-storage'
    )) -FailureMessage 'Graceful VersityGW stop failed'
    $containerExitCode = (@(& $DockerExecutable inspect $containerId --format '{{.State.ExitCode}}') -join '').Trim()
    if ($LASTEXITCODE -ne 0 -or $containerExitCode -ne '0') {
        throw "VersityGW did not stop gracefully (exit $containerExitCode)."
    }
    Invoke-Checked -Executable $DockerExecutable -Arguments ($composeArguments + @(
        'start', 'catalog-storage'
    )) -FailureMessage 'VersityGW restart failed'
    Wait-StorageHealth -Port $s3Port
    Invoke-Checked -Executable $pnpmExecutable -Arguments @(
        '--dir', $resolvedRepository, '--filter', '@project-name/storage',
        'storage:restart:persistence', 'verify'
    ) -FailureMessage 'Named-volume restart persistence failed'

    $logsPath = Join-Path $logRoot 'versitygw.log'
    @(& $DockerExecutable @composeArguments 'logs' '--no-color' 'catalog-storage') |
        Set-Content -LiteralPath $logsPath -Encoding UTF8
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect VersityGW logs.' }
    $combinedLogs = Get-Content -LiteralPath $logsPath -Raw
    if ($combinedLogs.Contains($accessKey) -or $combinedLogs.Contains($secretKey)) {
        throw 'VersityGW logs exposed a generated credential.'
    }

    $result = [ordered]@{
        allBucketsPrivate = $true
        amigoBytes = 515180
        amigoSha256 = $amigoSha256
        anonymousListingDenied = $true
        anonymousReadDenied = $true
        anonymousWriteDenied = $true
        checksumValidated = $true
        concurrentUploads = 'passed'
        dependencyFailure = 'safe-unavailable'
        emulator = 'VersityGW v1.4.1'
        gracefulRestart = 'passed'
        imageDigest = 'sha256:0400cb59f59da0f1cf9f7fd49505191abc348dfadf54509bf1988caaff4eb96f'
        immutableIdempotentPut = $true
        matrixBytes = @(1, 65536, 131072, 159099, 262144, 515180, 1048576, 5242880, 6291456)
        multipartAbort = 'passed'
        multipartUpload = 'passed'
        namedVolumePersistence = 'passed'
        pathStyleSigV4 = 'passed'
        signedReadWrite = 'passed'
        status = 'passed'
        trustZones = 3
    }
    $evidencePath = Join-Path $resolvedCache "storage-gate-$runId.json"
    $result['evidence'] = $evidencePath
    $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $evidencePath -Encoding UTF8
    $completed = $true
}
finally {
    if ($composeStarted) {
        if ($completed) {
            if (-not $volumePrefix.StartsWith('project_name_gate_', [System.StringComparison]::Ordinal)) {
                throw 'Refusing to remove unexpected Docker volumes.'
            }
            $cleanupErrorPreference = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            & $DockerExecutable @composeArguments 'down' '--volumes' '--remove-orphans' '--timeout' '30' *> $null
            $cleanupExitCode = $LASTEXITCODE
            $ErrorActionPreference = $cleanupErrorPreference
            if ($cleanupExitCode -ne 0) {
                $completed = $false
                Write-Error 'VersityGW Compose cleanup failed; exact gate resources were retained.'
            }
        }
        else {
            $cleanupErrorPreference = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            & $DockerExecutable @composeArguments 'stop' '--timeout' '30' *> $null
            $ErrorActionPreference = $cleanupErrorPreference
        }
    }
    foreach ($key in $environmentKeys) {
        [System.Environment]::SetEnvironmentVariable($key, $previousEnvironment[$key], 'Process')
    }
    if ($completed -and (Test-Path -LiteralPath $runRoot)) {
        Remove-StoppedRun -RunPath $runRoot
    }
}

if (-not $completed) {
    throw "Storage integration did not complete; stopped evidence remains under $runRoot."
}

$result | ConvertTo-Json -Depth 4 -Compress
