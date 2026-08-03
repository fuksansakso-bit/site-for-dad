[CmdletBinding()]
param(
    [ValidateSet('NONE', 'OWNER', 'ADMIN')]
    [string]$CopyRole = 'NONE'
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$statePath = Join-Path $repositoryRoot '.local\foundation-environment\state.json'
$secretsPath = Join-Path $repositoryRoot '.local\foundation-environment\secrets.json'
$sessionPath = Join-Path $repositoryRoot '.local\catalog-pilot\operator-sessions.json'

if (-not (Test-Path -LiteralPath $statePath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $secretsPath -PathType Leaf)) {
    throw 'Start the local foundation environment before bootstrapping catalog operators.'
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$secrets = Get-Content -LiteralPath $secretsPath -Raw | ConvertFrom-Json
$databaseUri = [System.UriBuilder]::new()
$databaseUri.Scheme = 'postgresql'
$databaseUri.Host = '127.0.0.1'
$databaseUri.Port = [int]$state.databasePort
$databaseUri.UserName = 'foundation_runtime'
$databaseUri.Password = [string]$secrets.runtimePassword
$databaseUri.Path = 'foundation'
$databaseUri.Query = 'schema=public&connect_timeout=5'

$env:APP_ENV = 'local'
$env:LOG_LEVEL = 'info'
$env:DATABASE_STATEMENT_TIMEOUT_MS = '5000'
$env:DATABASE_URL = $databaseUri.Uri.AbsoluteUri
$env:SESSION_SIGNING_KEY = [string]$secrets.sessionSigningKey
$env:SYNTHETIC_IDENTITY_ENABLED = 'true'
$env:CATALOG_OPERATOR_SESSION_PATH = $sessionPath

$scriptPath = Join-Path $PSScriptRoot 'catalog-pilot-operator.mjs'
& node.exe $scriptPath
if ($LASTEXITCODE -ne 0) {
    throw "Catalog operator bootstrap failed (exit $LASTEXITCODE)."
}

if ($CopyRole -ne 'NONE') {
    $sessions = Get-Content -LiteralPath $sessionPath -Raw | ConvertFrom-Json
    $token = if ($CopyRole -eq 'OWNER') { [string]$sessions.owner.token } else { [string]$sessions.admin.token }
    Set-Clipboard -Value $token
    Write-Output "$CopyRole catalog session copied to the clipboard; no token was printed."
}
