param([string]$Remote = "nigeljohnson@Nigel-Pi.local")

$ErrorActionPreference = "Stop"
$RemotePath = "/home/nigeljohnson/homeassistant/www/home-controller"
$Timestamp  = Get-Date -Format "yyyyMMdd-HHmmss"
$Keep       = 5

Write-Host "Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

Write-Host "Uploading release $Timestamp..." -ForegroundColor Cyan
ssh $Remote "mkdir -p $RemotePath/releases/$Timestamp"
scp -r dist/* "${Remote}:${RemotePath}/releases/${Timestamp}/"

Write-Host "Activating and pruning old releases..." -ForegroundColor Cyan
ssh $Remote "chmod -R o+rx $RemotePath/releases/$Timestamp && ln -sfn $RemotePath/releases/$Timestamp $RemotePath/current && ls -t $RemotePath/releases | tail -n +$($Keep + 1) | xargs -I{} rm -rf $RemotePath/releases/{} 2>/dev/null; true"

Write-Host "Done. Release $Timestamp is live." -ForegroundColor Green
