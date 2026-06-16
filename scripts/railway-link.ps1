param(
  [string]$Environment = "production",
  [string]$FrontendService = "frontend",
  [string]$BackendService = "backend",
  [string]$WorkerService = "worker",
  [string]$PostgresService = "Postgres",
  [string]$RedisService = "Redis",
  [string]$JwtSecret = "",
  [string]$GoogleClientId = "optional-google-client-id",
  [string]$TokenTreasuryAddress = "optional-token-treasury-address",
  [switch]$SkipDeploys,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function New-Secret {
  $bytes = New-Object byte[] 48
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }
  return [Convert]::ToBase64String($bytes)
}

function Railway {
  param([string[]]$Arguments)

  if ($DryRun) {
    Write-Host "railway $($Arguments -join ' ')"
    return
  }

  & npx -y "@railway/cli@latest" @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Railway CLI command failed. Run with -DryRun to inspect the command shape."
  }
}

function Reference {
  param([string]$Service, [string]$Variable)

  return '${{' + $Service + '.' + $Variable + '}}'
}

if (-not $DryRun) {
  Railway @("whoami")
}

$skipFlag = @()
if ($SkipDeploys) {
  $skipFlag = @("--skip-deploys")
}

if (-not $JwtSecret) {
  $JwtSecret = New-Secret
}

$backendDomain = Reference $BackendService "RAILWAY_PUBLIC_DOMAIN"
$frontendDomain = Reference $FrontendService "RAILWAY_PUBLIC_DOMAIN"

Write-Host "Setting backend variables on service '$BackendService' in environment '$Environment'..."
$backendArgs = @(
  "variable", "set",
  "-s", $BackendService,
  "-e", $Environment
) + $skipFlag + @(
  "DATABASE_URL=$(Reference $PostgresService "DATABASE_URL")",
  "REDIS_HOST=$(Reference $RedisService "REDISHOST")",
  "REDIS_PORT=$(Reference $RedisService "REDISPORT")",
  "REDIS_PASSWORD=$(Reference $RedisService "REDISPASSWORD")",
  "JWT_SECRET=$JwtSecret",
  "CORS_ORIGINS=https://$frontendDomain",
  "BINANCE_WS_URL=wss://stream.binance.com:9443",
  "MARKET_UNIVERSE_REFRESH_MS=300000"
)
Railway $backendArgs

Write-Host "Setting worker variables on service '$WorkerService' in environment '$Environment'..."
$workerArgs = @(
  "variable", "set",
  "-s", $WorkerService,
  "-e", $Environment
) + $skipFlag + @(
  "DATABASE_URL=$(Reference $PostgresService "DATABASE_URL")",
  "REDIS_HOST=$(Reference $RedisService "REDISHOST")",
  "REDIS_PORT=$(Reference $RedisService "REDISPORT")",
  "REDIS_PASSWORD=$(Reference $RedisService "REDISPASSWORD")",
  "JWT_SECRET=$(Reference $BackendService "JWT_SECRET")"
)
Railway $workerArgs

Write-Host "Setting frontend variables on service '$FrontendService' in environment '$Environment'..."
$frontendArgs = @(
  "variable", "set",
  "-s", $FrontendService,
  "-e", $Environment
) + $skipFlag + @(
  "NEXT_PUBLIC_API_URL=https://$backendDomain",
  "NEXT_PUBLIC_SOCKET_URL=https://$backendDomain",
  "NEXT_PUBLIC_GRAPHQL_HTTP_URL=https://$backendDomain/graphql",
  "NEXT_PUBLIC_GRAPHQL_WS_URL=wss://$backendDomain/graphql",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID=$GoogleClientId",
  "NEXT_PUBLIC_TOKEN_TREASURY_ADDRESS=$TokenTreasuryAddress"
)
Railway $frontendArgs

Write-Host "Railway variables linked."
