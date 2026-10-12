; Included by electron-builder's NSIS script (package.json → build.nsis.include).

; "Launch at Windows startup" is a Run value the app writes itself. Electron names it after the AppUserModelId
; (dev.lolpingyourai.desktop, set in src/main/index.ts), so remove it here or Windows keeps trying to start a deleted exe.
; An update runs the old uninstaller too: keep the value then, the setting is still on.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "dev.lolpingyourai.desktop"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "dev.lolpingyourai.desktop"
  ${endIf}
!macroend
