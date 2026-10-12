$vite = 'D:\Web\app-gesit\node_modules\vite\bin\vite.js'
$stdout = 'D:\Web\app-gesit\vite-dev.log'
$stderr = 'D:\Web\app-gesit\vite-dev-error.log'
$p = Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList @($vite, '--host', '0.0.0.0', '--port', '3000') -WorkingDirectory 'D:\Web\app-gesit' -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
Write-Output $p.Id
