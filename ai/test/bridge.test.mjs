import test from 'node:test';
import assert from 'node:assert/strict';
import { startBridge } from '../server.mjs';

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
