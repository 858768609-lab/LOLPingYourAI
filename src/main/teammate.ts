import * as electron from 'electron';
import { allSoundNames, allTextureNames } from '../shared/pings';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { OverlayManager } from './overlayManager';
import type { EmoteLibrary } from './emoteLibrary';
import type { SettingsStore } from './settingsStore';
import { settingsDir } from './paths';
import { settingsWindow, openSettingsWindow } from './settingsWindow';
import { createReplyWindow } from './replyWindow';

const pingMap: Record<string, string> = { omw: 'onmyway', needvision: 'vision', visioncleared: 'cleared' };
const reverse: Record<string, string> = { onmyway: 'omw', vision: 'needvision', cleared: 'visioncleared', missing: 'missing', danger: 'danger', assist: 'assist', allin: 'allin', bait: 'bait', retreat: 'retreat', like: 'like', celebrate: 'celebrate', generic: 'generic', push: 'push', enemyvision: 'enemyvision' };

function codexCommand(): string {
  const override = process.env.LOLPINGAI_CODEX ?? process.env.CODEX_CLI_PATH;
  if (override) return override;
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const directory = join(process.env.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin');
    try {
      const candidates = readdirSync(directory, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => join(directory, entry.name, 'codex.exe'))
        .filter(file => existsSync(file))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
      if (candidates[0]) return candidates[0];
    } catch { /* Fall back to a CLI installed on PATH. */ }
  }
  const bundled = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex';
  return existsSync(bundled) ? bundled : 'codex';
}

export async function startTeammate(overlays: OverlayManager, library: EmoteLibrary, settings: SettingsStore) {
  const { app, ipcMain, screen, globalShortcut, powerMonitor } = electron;
  const root = app.isPackaged ? app.getAppPath().replace(/app\.asar$/, 'app.asar.unpacked') : app.getAppPath();
  const load = (file: string) => import(/* @vite-ignore */ pathToFileURL(join(root, 'ai', file)).href);
  const [{ Store }, { Teammate }, { Desktop }, { CodexAdapter }, { ClaudeAdapter }, { startBridge }, { IconCandidates }] = await Promise.all(['store.mjs', 'service.mjs', 'desktop.mjs', 'harness/codex.mjs', 'harness/claude.mjs', 'server.mjs', 'icons.mjs'].map(load));
  const store = new Store(settingsDir());
  const helper = app.isPackaged ? join(process.resourcesPath, process.platform === 'darwin' ? 'desktop-helper' : 'desktop-helper.exe') : join(root, 'native/desktop/build', process.platform === 'darwin' ? 'desktop-helper' : 'desktop-helper.exe');
  const desktop = new Desktop({ electron, helper, dataDir: settingsDir(), overlays, pingIds: reverse });
  const mcp = { command: process.execPath, args: [join(root, 'ai/mcp.mjs')], env: { ELECTRON_RUN_AS_NODE: '1', LOLPINGAI_ENDPOINT: '', LOLPINGAI_TOKEN: '' } };
  const skillDir = join(settingsDir(), '.agents/skills/lolping-your-ai');
  await mkdir(skillDir, { recursive: true, mode: 0o700 });
  await copyFile(join(root, 'skills/lolping-your-ai/SKILL.md'), join(skillDir, 'SKILL.md'));
  const adapters = {
    codex: new CodexAdapter({ command: codexCommand(), cwd: settingsDir(), mcp, skillPath: join(skillDir, 'SKILL.md') }),
    claude: new ClaudeAdapter({ cwd: settingsDir(), mcp, skillPath: join(skillDir, 'SKILL.md'), executable: process.env.LOLPINGAI_CLAUDE }),
  };
  const service = new Teammate({ store, desktop, adapters }); await service.init();
  const icons = new IconCandidates(join(settingsDir(), 'icon-candidates'));
  let iconsRevision = 0;
  let closed = false;
  let reply: Awaited<ReturnType<typeof createReplyWindow>> | undefined;
  let changeTimer: ReturnType<typeof setTimeout> | undefined;
  const changed = () => {
    if (closed || changeTimer) return;
    changeTimer = setTimeout(() => {
      changeTimer = undefined;
      const window = settingsWindow();
      if (!closed && window && !window.isDestroyed()) window.webContents.send('ai:changed', null);
      if (!closed) reply?.publish();
    }, 50);
  };
  const iconsChanged = () => { iconsRevision++; changed(); };
  reply = await createReplyWindow({
    store, status: () => service.status(),
    stop: async () => { service.generation++; await service.stop(); },
    openSettings: () => openSettingsWindow('teammate'),
    registerCaptureWindow: window => overlays.registerCaptureWindow(window),
    onSettingsChange: changed,
  });
  const bridge = await startBridge(service, store, { submit_icon: async (args: unknown) => { const result = await icons.submit(args); iconsChanged(); overlays.toast('表情已生成', '请在“AI 队友”设置中预览新表情。'); return result; } });
  mcp.env.LOLPINGAI_ENDPOINT = bridge.endpoint; mcp.env.LOLPINGAI_TOKEN = bridge.token;
  service.on('notice', (message: string) => overlays.toast('LOLPingYourAI', message));
  service.on('change', changed);
  const enqueue = (signal: string, displayId: number, x: number, y: number, selection?: { x: number; y: number; width: number; height: number }) => {
    const d = screen.getAllDisplays().find(d => d.id === displayId); if (!d) return;
    const globalSelection = selection ? { ...selection, x: selection.x + d.bounds.x, y: selection.y + d.bounds.y } : undefined;
    const pending = service.dispatch({ signal: pingMap[signal] ?? signal, point: { x: x + d.bounds.x, y: y + d.bounds.y }, selection: globalSelection, source: 'user' });
    reply?.onSignal();
    void pending.catch(() => {});
  };
  overlays.on('shared', p => enqueue(p.id, p.displayId, p.x, p.y, p.selection));
  overlays.on('sharedEmote', p => {
    const builtins: Record<string, string> = { unworthy: 'bait', unworthy_cn: 'bait', facepalm: 'bait', poro_ride: 'retreat', super_approved: 'like', nice: 'like', gg_heart: 'celebrate', teamwork: 'celebrate' };
    const signal = service.config.mappings?.[p.ref] ? p.ref : builtins[p.ref] ?? 'reaction';
    enqueue(signal, p.displayId, p.x, p.y);
  });
  const packDir = join(settingsDir(), 'asset-pack');
  const handlers: Record<string, (args: any) => any> = {
    status: () => ({ ...service.status(), iconsRevision, replyWindow: reply?.getSettings(), customEmotes: settings.get().customEmotes }), config: args => service.configure(args), stop: () => { service.generation++; return service.stop(); },
    configureReply: async args => { await reply?.configure(args); if (args.enabled === true) await reply?.show(); },
    showReply: () => reply?.show(),
    doctor: () => desktop.doctor(), bind: args => service.bind(args), approve: args => service.approve(args),
    candidates: () => icons.list(),
    importCrop: async args => { const result = await icons.submit({ name: args.name || '我的表情', pngBase64: args.pngBase64 }, 'local-crop'); iconsChanged(); return result; },
    importPack: async () => { const picked = await electron.dialog.showOpenDialog({ title: '选择本地素材包', properties: ['openDirectory'] }); if (picked.canceled) return { cancelled: true }; const pack = await load('assets.mjs'); return pack.importAssetPack(picked.filePaths[0], packDir, allTextureNames(), allSoundNames()); },
    clearPack: async () => (await load('assets.mjs')).clearAssetPack(packDir),
    acceptIcon: async args => { const result = await library.save(await icons.prepare(args.id), settings.get().customEmotes); if (!result.ok) throw new Error(`Import failed: ${result.error}`); settings.update({ customEmotes: [...settings.get().customEmotes, result.emote] }); return result; },
    generateIcon: async args => {
      if (service.busy()) throw new Error('请等待队友完成当前任务后再生成表情。');
      if (typeof args.prompt !== 'string' || !args.prompt.trim() || args.prompt.length > 4000) throw new Error('请用 1～4000 个字符描述你想要的表情。');
      service.gate.pause(); const adapter = adapters[service.config.harness as keyof typeof adapters];
      const reference = args.reference ? await icons.reference(args.reference) : undefined;
      const id = await adapter.create();
      await adapter.send(id, `Create an original transparent emote for this description: ${args.prompt}\nUse an available image-generation tool if present, otherwise design a standalone SVG. Call submit_icon with the result for user review. If an image is attached, use it as the visual reference. Do not use desktop tools or send acknowledgement pings for this request.`, reference);
      return { started: true, session: id };
    },
    openAccess: () => { if (process.platform !== 'darwin') return; electron.systemPreferences.isTrustedAccessibilityClient(true); return electron.shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'); },
    openScreen: async () => { if (process.platform !== 'darwin') return; await electron.desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }).catch(() => {}); return electron.shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'); },
  };
  ipcMain.handle('ai:call', async (event, method: string, args: unknown) => {
    if (event.sender !== settingsWindow()?.webContents || event.senderFrame !== event.sender.mainFrame) throw new Error('Unauthorized settings sender');
    if (!Object.hasOwn(handlers, method)) throw new Error('Unknown teammate operation');
    return handlers[method](args ?? {});
  });
  const timer = setInterval(() => { void service.wards.tick().catch((e: Error) => service.notice(e.message)); }, 5000);
  powerMonitor.on('resume', () => { void service.wards.tick(); });
  powerMonitor.on('lock-screen', () => { service.generation++; void service.stop().catch((e: Error) => service.notice(e.message)); });
  globalShortcut.register('Control+Alt+Escape', () => { service.generation++; void service.stop().then(() => service.notice('已停止。')).catch((e: Error) => service.notice(e.message)); });
  return { service, open: () => openSettingsWindow('teammate'), close: async () => { closed = true; clearInterval(timer); clearTimeout(changeTimer); service.off('change', changed); bridge.close(); service.close(); globalShortcut.unregister('Control+Alt+Escape'); await reply?.close(); } };
}
