[CmdletBinding()]
param(
    [string]$RunId = '',
    [string]$RepeatRunId = '',
    [string]$RecoveryRunId = ''
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$statePath = Join-Path $repositoryRoot '.local\foundation-environment\state.json'
$secretsPath = Join-Path $repositoryRoot '.local\foundation-environment\secrets.json'

if (-not (Test-Path -LiteralPath $statePath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $secretsPath -PathType Leaf)) {
    throw 'Start the local foundation environment before running full catalog acceptance.'
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
$env:LOG_LEVEL = 'error'
$env:DATABASE_STATEMENT_TIMEOUT_MS = '30000'
$env:DATABASE_URL = $databaseUri.Uri.AbsoluteUri
$env:S3_ACCESS_KEY_ID = [string]$secrets.storageAccessKey
$env:S3_BUCKET_PRIVATE = 'project-name-local-private'
$env:S3_BUCKET_PUBLIC = 'project-name-local-public'
$env:S3_BUCKET_QUARANTINE = 'project-name-local-quarantine'
$env:S3_ENDPOINT = "http://127.0.0.1:$([int]$state.storagePort)"
$env:S3_FORCE_PATH_STYLE = 'true'
$env:S3_MAX_OBJECT_BYTES = '8388608'
$env:S3_MAX_ATTEMPTS = '3'
$env:S3_MULTIPART_PART_SIZE_BYTES = '5242880'
$env:S3_MULTIPART_THRESHOLD_BYTES = '5242880'
$env:S3_REGION = 'local'
$env:S3_REQUEST_TIMEOUT_MS = '5000'
$env:S3_SECRET_ACCESS_KEY = [string]$secrets.storageSecretKey
$env:SIGNED_URL_TTL_SECONDS = '300'
$env:CATALOG_PUBLIC_BASE_URL = "http://127.0.0.1:$([int]$state.webPort)"

if ([string]::IsNullOrWhiteSpace($RunId)) {
    Remove-Item Env:CATALOG_FULL_RUN_ID -ErrorAction SilentlyContinue
}
else {
    $env:CATALOG_FULL_RUN_ID = $RunId
}

if ([string]::IsNullOrWhiteSpace($RepeatRunId)) {
    Remove-Item Env:CATALOG_FULL_REPEAT_RUN_ID -ErrorAction SilentlyContinue
}
else {
    $env:CATALOG_FULL_REPEAT_RUN_ID = $RepeatRunId
}

if ([string]::IsNullOrWhiteSpace($RecoveryRunId)) {
    Remove-Item Env:CATALOG_FULL_RECOVERY_RUN_ID -ErrorAction SilentlyContinue
}
else {
    $env:CATALOG_FULL_RECOVERY_RUN_ID = $RecoveryRunId
}

$scriptPath = Join-Path $PSScriptRoot 'catalog-full-acceptance.mjs'
& $state.worker.executable $scriptPath
if ($LASTEXITCODE -ne 0) {
    throw "Full catalog acceptance failed (exit $LASTEXITCODE)."
}
