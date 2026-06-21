param(
  [string]$Environment = "production",
  [string]$Repo = "pranavhole/tread",
  [string]$Branch = "main",
  [string]$FrontendService = "frontend",
  [string]$ExistingFrontendService = "tread",
  [string]$BackendService = "backend",
  [string]$WorkerService = "worker",
  [string]$PostgresService = "Postgres",
  [string]$RedisService = "Redis",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Railway {
  param([string[]]$Arguments)

  if ($DryRun) {
    Write-Host "railway $($Arguments -join ' ')"
    return $null
  }

  & npx -y "@railway/cli@latest" @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Railway CLI command failed. Run with -DryRun to inspect the command shape."
  }
}

function RailwayJson {
  param([string[]]$Arguments)

  if ($DryRun) {
    Write-Host "railway $($Arguments -join ' ')"
    return $null
  }

  $output = & npx -y "@railway/cli@latest" @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Railway CLI command failed. Run with -DryRun to inspect the command shape."
  }
  if (-not $output) {
    return $null
  }
  return ($output | ConvertFrom-Json)
}

function Get-Services {
  $services = RailwayJson @("service", "list", "-e", $Environment, "--json")
  if (-not $services) {
    return @()
  }
  return @($services)
}

function Test-ServiceExists {
  param([object[]]$Services, [string]$Name)

  return [bool]($Services | Where-Object { $_.name -eq $Name } | Select-Object -First 1)
}

function Ensure-Service {
  param([string]$Name)

  $services = Get-Services
  if (Test-ServiceExists $services $Name) {
    Write-Host "Service '$Name' already exists."
    return
  }

  Write-Host "Creating service '$Name'..."
  Railway @("add", "--service", $Name)
}

function Ensure-Database {
  param([string]$Name, [string]$Type)

  $services = Get-Services
  if (Test-ServiceExists $services $Name) {
    Write-Host "Database '$Name' already exists."
    return
  }

  Write-Host "Creating $Type database. Railway should name it '$Name'."
  Railway @("add", "--database", $Type)
}

function Set-ServiceConfig {
  param(
    [string]$Service,
    [string]$RootDirectory,
    [string]$BuildCommand,
    [string]$StartCommand,
    [string]$HealthcheckPath = "",
    [string]$PreDeployCommand = ""
  )

  Write-Host "Configuring service '$Service'..."
  Railway @(
    "service", "source", "connect",
    "-s", $Service,
    "-e", $Environment,
    "--repo", $Repo,
    "--branch", $Branch
  )

  $args = @(
    "environment", "edit",
    "-e", $Environment,
    "--service-config", $Service, "source.rootDirectory", $RootDirectory,
    "--service-config", $Service, "build.builder", "RAILPACK",
    "--service-config", $Service, "build.buildCommand", $BuildCommand,
    "--service-config", $Service, "deploy.startCommand", $StartCommand,
    "--service-config", $Service, "deploy.restartPolicyType", "ON_FAILURE",
    "--service-config", $Service, "deploy.restartPolicyMaxRetries", "10",
    "-m", "Configure $Service deployment"
  )

  if ($HealthcheckPath) {
    $args += @(
      "--service-config", $Service, "deploy.healthcheckPath", $HealthcheckPath,
      "--service-config", $Service, "deploy.healthcheckTimeout", "300"
    )
  }

  if ($PreDeployCommand) {
    $args += @("--service-config", $Service, "deploy.preDeployCommand", $PreDeployCommand)
  }

  Railway $args
}

if (-not $DryRun) {
  Railway @("whoami")
}

$services = Get-Services
$activeFrontendService = $FrontendService

if ((-not (Test-ServiceExists $services $FrontendService)) -and (Test-ServiceExists $services $ExistingFrontendService)) {
  $activeFrontendService = $ExistingFrontendService
  Write-Host "Using existing service '$ExistingFrontendService' as the frontend. Rename it to '$FrontendService' in Railway later if you want the cleaner name."
} else {
  Ensure-Service $FrontendService
}

Ensure-Database $PostgresService "postgres"
Ensure-Database $RedisService "redis"
Ensure-Service $BackendService
Ensure-Service $WorkerService

Set-ServiceConfig `
  -Service $activeFrontendService `
  -RootDirectory "/frontend2" `
  -BuildCommand "npm run build" `
  -StartCommand "npm run start" `
  -HealthcheckPath "/"

Set-ServiceConfig `
  -Service $BackendService `
  -RootDirectory "/backend" `
  -BuildCommand "npx prisma generate && npm run build" `
  -StartCommand "npm run start" `
  -HealthcheckPath "/" `
  -PreDeployCommand "npx prisma migrate deploy"

Set-ServiceConfig `
  -Service $WorkerService `
  -RootDirectory "/backend" `
  -BuildCommand "npx prisma generate && npm run build" `
  -StartCommand "node dist/workers/matchEngine.js"

Write-Host "Provisioning complete. Linking variables..."

$linkArgs = @(
  "-Environment", $Environment,
  "-FrontendService", $activeFrontendService,
  "-BackendService", $BackendService,
  "-WorkerService", $WorkerService,
  "-PostgresService", $PostgresService,
  "-RedisService", $RedisService
)

if ($DryRun) {
  $linkArgs += "-DryRun"
}

& powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\railway-link.ps1" @linkArgs
if ($LASTEXITCODE -ne 0) {
  throw "Variable linking failed."
}

Write-Host "Railway project provisioned."
