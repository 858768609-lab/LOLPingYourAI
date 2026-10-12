// Real Electron smoke test: protocol + overlay CSP + cross-origin artwork/audio.
// Run after `pnpm build`: pnpm exec electron tools/check-assets.cjs
const { app, BrowserWindow } = require('electron');
const { buildSync } = require('esbuild');
const { mkdtempSync, rmSync, readdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const temporary = mkdtempSync(path.join(tmpdir(), 'lolping-assets-'));
const bundled = path.join(temporary, 'protocol.cjs');
buildSync({ entryPoints: ['src/main/appProtocol.ts'], bundle: true, platform: 'node', external: ['electron'], outfile: bundled });
const { registerAppScheme, serveAppScheme } = require(bundled);
rmSync(temporary, { recursive: true, force: true });
registerAppScheme();
app.whenReady().then(async () => {
  serveAppScheme({ rendererRoot: path.resolve('out/renderer'), emoteDirs: () => [], assetDirs: () => [path.resolve('out/renderer')] });
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, preload: path.resolve('out/preload/overlay.js') } });
  try {
    await win.loadURL('lolping://app/overlay/index.html');
    const sounds = readdirSync('out/renderer/sounds').filter(f => f.endsWith('.wav'));
    const textures = readdirSync('out/renderer/textures').filter(f => f.endsWith('.png'));
    const result = await win.webContents.executeJavaScript(`(async () => {
      const audio = new AudioContext();
      for (const file of ${JSON.stringify(sounds)}) {
        const response = await fetch('lolping://assets/sounds/' + file);
        if (!response.ok) throw new Error(file + ': ' + response.status);
        const buffer = await audio.decodeAudioData(await response.arrayBuffer());
        if (!buffer.length) throw new Error('Empty audio: ' + file);
      }
      for (const file of ${JSON.stringify(textures)}) {
        const image = new Image(); image.src = 'lolping://assets/textures/' + file;
        await image.decode(); if (!image.naturalWidth) throw new Error('Empty image: ' + file);
      }
      await audio.close(); return { sounds: ${sounds.length}, textures: ${textures.length}, passed: true };
    })()`);
    console.log(JSON.stringify(result)); app.exit(0);
  } catch (error) { console.error(error.message); app.exit(1); }
});
