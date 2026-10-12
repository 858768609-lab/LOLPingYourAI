const { app, BrowserWindow, ipcMain } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
app.setName('LOLPingYourAI Test Board');
app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 680, height: 520, x: 100, y: 100, title: 'LOLPingYourAI Test Board', webPreferences: { nodeIntegration: true, contextIsolation: false } });
  ipcMain.on('board:value', (_event, value) => writeFileSync(join(app.getPath('temp'), 'lolping-test-board.json'), JSON.stringify({ value, time: Date.now() })));
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><meta charset="utf-8"><title>LOLPingYourAI Test Board</title><style>body{font:18px system-ui;background:#f6f3eb;padding:32px;color:#243a39}h1{font-size:26px}textarea{display:block;width:95%;height:120px;font:20px system-ui;border:2px solid #398e82;border-radius:12px;padding:10px}small{display:block;margin:24px 0;line-height:1.5}</style><h1>Teammate practice board</h1><p>Only this disposable test window may be edited.</p><textarea aria-label="Practice note" id="note">Ready for a ping.</textarea><small>Test: replace the note with “Ping received”, then restore it when corrected.</small><button onclick="document.querySelector('textarea').value='Ready for a ping.';document.querySelector('textarea').dispatchEvent(new Event('input'))">Reset note</button><script>const {ipcRenderer}=require('electron');document.querySelector('textarea').addEventListener('input',e=>ipcRenderer.send('board:value',e.target.value));ipcRenderer.send('board:value',document.querySelector('textarea').value);</script>`));
});
app.on('window-all-closed', () => app.quit());
