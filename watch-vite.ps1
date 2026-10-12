$ErrorActionPreference = 'Continue'
$project = 'D:\Web\app-gesit'
$vite = Join-Path $project 'node_modules\vite\bin\vite.js'
$node = 'C:\Program Files\nodejs\node.exe'
$stdout = Join-Path $project 'vite-dev.log'
$stderr = Join-Path $project 'vite-dev-error.log'
Set-Location $project
while ($true) {
  $process = Start-Process -FilePath $node -ArgumentList @($vite, '--host', '0.0.0.0', '--port', '3000') -WorkingDirectory $project -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
  Wait-Process -Id $process.Id
  Start-Sleep -Seconds 2
}
