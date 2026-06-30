param([string]$Remote = "nigeljohnson@Nigel-Pi.local")

$ErrorActionPreference = "Stop"
$RemotePath = "/home/nigeljohnson/homeassistant/www/home-controller"

$releases = (ssh $Remote "ls -t $RemotePath/releases").Split("`n") |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -ne '' }

if ($releases.Count -eq 0) {
    Write-Error "No releases found."
    exit 1
}

$current = (ssh $Remote "readlink $RemotePath/current").Trim().Split('/')[-1]

Write-Host "Available releases:" -ForegroundColor Cyan
for ($i = 0; $i -lt $releases.Count; $i++) {
    $marker = if ($releases[$i] -eq $current) { "  <-- current" } else { "" }
    Write-Host "  [$i] $($releases[$i])$marker"
}

if ($releases.Count -lt 2) {
    Write-Host "No previous release to roll back to." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
$choice = Read-Host "Enter release number to activate (default: 1 = previous)"
if ($choice -eq '') { $choice = 1 }
$target = $releases[[int]$choice]

Write-Host "Activating $target..." -ForegroundColor Yellow
ssh $Remote "ln -sfn $RemotePath/releases/$target $RemotePath/current"
Write-Host "Done. Rolled back to $target." -ForegroundColor Green
