import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startBridge } from '../server.mjs';
import { Store } from '../store.mjs';

test('bridge requires the per-launch token and refuses browser-origin calls', async () => {
  const service = { status: () => ({ busy: false }) }, store = { write: async () => {} };
  const bridge = await startBridge(service, store);
  try {
    assert.equal((await fetch(bridge.endpoint + '/status', { method: 'POST' })).status, 401);
    const headers = { Authorization: `Bearer ${bridge.token}` };
    assert.equal((await fetch(bridge.endpoint + '/status', { method: 'POST', headers: { ...headers, Origin: 'https://example.com' } })).status, 401);
    const good = await fetch(bridge.endpoint + '/status', { method: 'POST', headers }); assert.deepEqual(await good.json(), { busy: false });
    assert.equal((await fetch(bridge.endpoint + '/constructor', { method: 'POST', headers })).status, 400);
  } finally { bridge.close(); }
});

const cli = (dir, ...args) => new Promise(resolve => execFile(process.execPath, [fileURLToPath(new URL('../cli.mjs', import.meta.url)), ...args], { env: { ...process.env, LOLPINGAI_DATA_DIR: dir } }, (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr })));

test('CLI reaches the running app and explains offline, unknown and malformed requests', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lolpingai-cli-'));
  try {
    const offline = await cli(dir, 'status'); assert.equal(offline.code, 1); assert.match(offline.stderr, /not running\. Start the desktop app first/);
    const unknown = await cli(dir, 'launch'); assert.equal(unknown.code, 1); assert.match(unknown.stderr, /Unknown command "launch"[\s\S]*Usage: lolpingai/);
    assert.match((await cli(dir, 'help')).stdout, /ping +Send a ping/);
    const bridge = await startBridge({ status: () => ({ busy: false }), configure: async patch => patch }, new Store(dir));
    try {
      assert.deepEqual(JSON.parse((await cli(dir, 'status')).stdout), { busy: false });
      assert.deepEqual(JSON.parse((await cli(dir, 'config', '{"wardHours":1}')).stdout), { wardHours: 1 });
      const malformed = await cli(dir, 'config', '{wardHours'); assert.equal(malformed.code, 1); assert.match(malformed.stderr, /Invalid JSON payload/); assert.doesNotMatch(malformed.stderr, /Start the desktop app/);
    } finally { bridge.close(); }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
