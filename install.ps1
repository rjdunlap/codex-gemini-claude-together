param(
  [string]$CodexHome = "$env:USERPROFILE\.codex"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourcePlugin = Join-Path $repoRoot "plugins\codex-together"
$targetPlugin = Join-Path $CodexHome "plugins\local\codex-together"
$configPath = Join-Path $CodexHome "config.toml"
$skillSource = Join-Path $sourcePlugin "skills\codex-together"
$skillTarget = Join-Path $CodexHome "skills\codex-together"

New-Item -ItemType Directory -Force (Split-Path -Parent $targetPlugin), (Split-Path -Parent $skillTarget) | Out-Null
Copy-Item $sourcePlugin $targetPlugin -Recurse -Force
Copy-Item $skillSource $skillTarget -Recurse -Force

$serverScript = (Join-Path $targetPlugin "scripts\codex_together_mcp.mjs").Replace("\", "/")
$stanza = @"

[mcp_servers.codex-together]
command = "node"
args = ["$serverScript"]
"@

if (!(Test-Path $configPath)) {
  New-Item -ItemType File -Force $configPath | Out-Null
}

$config = [string](Get-Content $configPath -Raw)
if ($config -notmatch '(?m)^\[mcp_servers\.codex-together\]$') {
  Add-Content -Path $configPath -Value $stanza
  Write-Host "Added MCP config for codex-together."
} else {
  Write-Host "MCP config for codex-together already exists; left config.toml unchanged."
}

Write-Host "Installed plugin to $targetPlugin"
Write-Host "Set GEMINI_API_KEY and/or ANTHROPIC_API_KEY, then restart Codex."
