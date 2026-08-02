[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$NodeExecutable,

    [Parameter(Mandatory = $true)]
    [string]$RepositoryRoot,

    [Parameter(Mandatory = $true)]
    [string]$CacheRoot,

    [int]$WebPort = 3100,

    [int]$WorkerPort = 9465
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $NodeExecutable -PathType Leaf)) {
    throw "Node executable is missing: $NodeExecutable"
}

$resolvedRepositoryRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)
$webRoot = Join-Path $resolvedRepositoryRoot 'apps\web'
$workerRoot = Join-Path $resolvedRepositoryRoot 'apps\worker'
foreach ($requiredPath in @(
    (Join-Path $webRoot '.next'),
    (Join-Path $webRoot 'node_modules\next\dist\bin\next'),
    (Join-Path $workerRoot 'dist\index.js')
)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Runtime smoke prerequisite is missing: $requiredPath"
    }
}

if ($WebPort -lt 1 -or $WebPort -gt 65535 -or $WorkerPort -lt 1 -or $WorkerPort -gt 65535) {
    throw 'Smoke ports must be valid TCP ports'
}

New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
$runId = [guid]::NewGuid().ToString('N')
$webOut = Join-Path $CacheRoot "$runId-web.out.log"
$webError = Join-Path $CacheRoot "$runId-web.err.log"
$workerOut = Join-Path $CacheRoot "$runId-worker.out.log"
$workerError = Join-Path $CacheRoot "$runId-worker.err.log"

$webProcess = $null
$workerProcess = $null
$smokePassed = $false
try {
    $env:NEXT_TELEMETRY_DISABLED = '1'
    $env:WORKER_HEALTH_PORT = $WorkerPort.ToString([System.Globalization.CultureInfo]::InvariantCulture)

    $webProcess = Start-Process `
        -FilePath $NodeExecutable `
        -ArgumentList @(
            'node_modules/next/dist/bin/next',
            'start',
            '--hostname',
            '127.0.0.1',
            '--port',
            $WebPort.ToString([System.Globalization.CultureInfo]::InvariantCulture)
        ) `
        -WorkingDirectory $webRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $webOut `
        -RedirectStandardError $webError `
        -PassThru

    $workerProcess = Start-Process `
        -FilePath $NodeExecutable `
        -ArgumentList @('dist/index.js') `
        -WorkingDirectory $workerRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $workerOut `
        -RedirectStandardError $workerError `
        -PassThru

    $deadline = (Get-Date).AddSeconds(20)
    do {
        try {
            $live = Invoke-RestMethod `
                -Uri "http://127.0.0.1:$WebPort/api/v1/health/live" `
                -TimeoutSec 2
            $workerReady = Invoke-RestMethod `
                -Uri "http://127.0.0.1:$WorkerPort/health/ready" `
                -TimeoutSec 2
            break
        }
        catch {
            if ((Get-Date) -ge $deadline) {
                throw
            }
            Start-Sleep -Milliseconds 250
        }
    } while ($true)

    $homeResponse = Invoke-WebRequest `
        -Uri "http://127.0.0.1:$WebPort/" `
        -TimeoutSec 5 `
        -UseBasicParsing
    $headers = Invoke-WebRequest `
        -Uri "http://127.0.0.1:$WebPort/api/v1/health/live" `
        -TimeoutSec 5 `
        -UseBasicParsing
    $missingStatus = $null
    try {
        Invoke-WebRequest `
            -Uri "http://127.0.0.1:$WebPort/foundation-missing" `
            -TimeoutSec 5 `
            -UseBasicParsing | Out-Null
    }
    catch {
        $missingStatus = [int]$_.Exception.Response.StatusCode
    }

    $result = [pscustomobject]@{
        framePolicy = [string]::Join(',', @($headers.Headers['X-Frame-Options']))
        missingStatus = $missingStatus
        poweredByHeaderPresent = $null -ne $headers.Headers['X-Powered-By']
        webContainsFoundation = $homeResponse.Content -match 'PHASE 1A'
        webLive = $live.status
        webStatus = $homeResponse.StatusCode
        workerReady = $workerReady.status
        xContentType = [string]::Join(',', @($headers.Headers['X-Content-Type-Options']))
    }

    if (
        $result.webStatus -ne 200 -or
        -not $result.webContainsFoundation -or
        $result.webLive -ne 'ok' -or
        $result.workerReady -ne 'ok' -or
        $result.missingStatus -ne 404 -or
        $result.xContentType -ne 'nosniff' -or
        $result.framePolicy -ne 'DENY' -or
        $result.poweredByHeaderPresent
    ) {
        throw "Runtime smoke contract failed: $($result | ConvertTo-Json -Compress)"
    }

    $smokePassed = $true
    $result | ConvertTo-Json -Compress
}
finally {
    foreach ($process in @($webProcess, $workerProcess)) {
        if ($null -ne $process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force
            $process.WaitForExit(5000) | Out-Null
        }
    }
    $env:NEXT_TELEMETRY_DISABLED = $null
    $env:WORKER_HEALTH_PORT = $null

    if ($smokePassed) {
        foreach ($logPath in @($webOut, $webError, $workerOut, $workerError)) {
            if (Test-Path -LiteralPath $logPath -PathType Leaf) {
                Remove-Item -LiteralPath $logPath -Force
            }
        }
    }
    else {
        Write-Warning "Runtime smoke failed; local logs remain under $CacheRoot"
    }
}
