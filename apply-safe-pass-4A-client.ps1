$ErrorActionPreference = "Stop"

$srcDir = "C:\Users\bee19\Documents\stro-chievery\src"
$appFile = Join-Path $srcDir "App.jsx"
$backupFile = Join-Path $srcDir "App-BEFORE-SAFE-PASS-4A-FULL-REPLACE.jsx"

Copy-Item $appFile $backupFile -Force

$content = Get-Content $appFile -Raw

# 1. Add safe permission helpers
$content = $content -replace `
'const isSuperadmin = authUser\?\.globalRole === "superadmin";', `
'const isSuperadmin = authUser?.globalRole === "superadmin";

  const canOperateRoom =
    userRole === "superadmin" || userRole === "host" || userRole === "moderator";

  const canControlStage =
    userRole === "superadmin" || userRole === "host";'

# 2. Prevent viewer blank video box when no local stream exists
$content = $content -replace `
'\{screenShareOn \|\| cameraOn \? \(', `
'{(screenShareOn && screenStream) || (cameraOn && localCameraStream) ? ('

# 3. Viewer-friendly live stage message instead of blank stage
$content = $content -replace `
'Avant Global Vision Stage Ready', `
'{screenShareOn || cameraOn ? "Live Stage Signal Active" : "Avant Global Vision Stage Ready"}'

$content = $content -replace `
'• Or Share your Screen', `
'{screenShareOn || cameraOn
                          ? "The host is live. Viewer broadcast transport will be activated in the next media pass."
                          : "• Or Share your Screen"}'

# 4. Hide the top control bar from normal users without JSX wrapping
$content = $content -replace `
'<section style=\{styles\.controlSection\}>', `
'<section style={canOperateRoom ? styles.controlSection : { display: "none" }}>'

# 5. Prevent normal users from opening the Control Center panel
$content = $content -replace `
'\{selectedPanel === "controls" && \(', `
'{canOperateRoom && selectedPanel === "controls" && ('

# 6. Make Controls tab inactive for users if still visible
$content = $content -replace `
'style=\{selectedPanel === "controls" \? styles\.controlButtonAccent : styles\.controlButton\}', `
'style={canOperateRoom ? (selectedPanel === "controls" ? styles.controlButtonAccent : styles.controlButton) : styles.controlButtonDisabled}'

$content = $content -replace `
'onClick=\{\(\) => setSelectedPanel\("controls"\)\}', `
'onClick={() => canOperateRoom && setSelectedPanel("controls")}'

Set-Content -Path $appFile -Value $content -Encoding UTF8

Write-Host ""
Write-Host "SAFE PASS 4A CLIENT FULL REPLACEMENT COMPLETE"
Write-Host "Backup created:"
Write-Host $backupFile
Write-Host ""