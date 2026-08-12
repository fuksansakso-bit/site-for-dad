[CmdletBinding()]
param(
    [switch]$SkipIntegration,
    [switch]$SkipBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Pnpm {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    & $script:PnpmExecutable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "pnpm command failed (exit $LASTEXITCODE): $($Arguments -join ' ')"
    }
}

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$statePath = Join-Path $repositoryRoot '.local\foundation-environment\state.json'
$secretsPath = Join-Path $repositoryRoot '.local\foundation-environment\secrets.json'
$operatorPath = Join-Path $repositoryRoot '.local\catalog-pilot\operator-sessions.json'
foreach ($path in @($statePath, $secretsPath, $operatorPath)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Phase 1E local prerequisite is missing: $path"
    }
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$secrets = Get-Content -LiteralPath $secretsPath -Raw | ConvertFrom-Json
$operator = Get-Content -LiteralPath $operatorPath -Raw | ConvertFrom-Json
$databaseUri = [System.UriBuilder]::new()
$databaseUri.Scheme = 'postgresql'
$databaseUri.Host = '127.0.0.1'
$databaseUri.Port = [int]$state.databasePort
$databaseUri.UserName = 'foundation_runtime'
$databaseUri.Password = [string]$secrets.runtimePassword
$databaseUri.Path = 'foundation'
$databaseUri.Query = 'schema=public&connect_timeout=5'

$environment = [ordered]@{
    APP_ENV = 'local'
    DATABASE_STATEMENT_TIMEOUT_MS = '30000'
    DATABASE_URL = $databaseUri.Uri.AbsoluteUri
    LOG_LEVEL = 'error'
    NEXT_TELEMETRY_DISABLED = '1'
    PHASE1E_BROWSER = 'true'
    PHASE1E_OWNER_TOKEN = [string]$operator.owner.token
    PHASE1E_REAL_CATALOG = 'true'
    PLAYWRIGHT_BASE_URL = "http://127.0.0.1:$([int]$state.webPort)"
    PLAYWRIGHT_EXTERNAL_SERVER = 'true'
}
$previousEnvironment = @{}
$originalPath = $env:PATH
$script:PnpmExecutable = (Get-Command 'pnpm.cmd' -ErrorAction Stop).Source

Push-Location $repositoryRoot
try {
    $env:PATH = "$(Split-Path -Parent ([string]$state.web.executable));$originalPath"
    foreach ($entry in $environment.GetEnumerator()) {
        $previousEnvironment[$entry.Key] = [System.Environment]::GetEnvironmentVariable($entry.Key, 'Process')
        [System.Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
    }
    $health = Invoke-RestMethod -Uri "$($environment.PLAYWRIGHT_BASE_URL)/api/v1/health/ready" -TimeoutSec 10
    if ($health.status -ne 'ok') {
        throw 'Phase 1E web readiness check failed.'
    }
    if (-not $SkipIntegration) {
        Invoke-Pnpm -Arguments @('--filter', '@project-name/db', 'db:generate')
        Invoke-Pnpm -Arguments @(
            '--filter', '@project-name/db', 'exec', 'vitest', 'run', '--config',
            'vitest.integration.config.ts', 'test/integration/phase1e-real.integration.test.ts'
        )
    }
    if (-not $SkipBrowser) {
        Invoke-Pnpm -Arguments @(
            'exec', 'playwright', 'test', 'tests/browser/cart-request-flow.spec.ts', '--project=chromium'
        )
    }
    [pscustomobject]@{
        browser = -not $SkipBrowser
        integration = -not $SkipIntegration
        status = 'PASSED_PHASE_1E_LOCAL_ACCEPTANCE'
        webPort = [int]$state.webPort
    } | ConvertTo-Json -Compress | Write-Output
}
finally {
    foreach ($entry in $environment.GetEnumerator()) {
        [System.Environment]::SetEnvironmentVariable($entry.Key, $previousEnvironment[$entry.Key], 'Process')
    }
    $env:PATH = $originalPath
    Pop-Location
}
