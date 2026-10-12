import test from 'node:test';
import assert from 'node:assert/strict';
import { CodexAdapter } from '../harness/codex.mjs';

test('newly created or already loaded Codex thread is not resumed again', async () => {
  const a = new CodexAdapter({ cwd: '/tmp', mcp: {}, skillPath: '/skill' });
  const calls = []; a.connect = async () => {};
  a.rpc = async (method, params) => { calls.push({ method, params }); return { thread: { id: 'fresh' } }; };
  const id = await a.create(); await a.resume(id); await a.resume('persisted'); await a.resume('persisted');
  assert.deepEqual(calls.map(c => c.method), ['thread/start', 'thread/resume']);
});

test('Codex interrupt stays pending until completion is confirmed', async () => {
  const a = new CodexAdapter({ mcp: {} }); a.active.set('s', 't'); a.rpc = async () => ({});
  let finished = false; const cancel = a.cancel('s').then(() => { finished = true; });
  await new Promise(r => setImmediate(r)); assert.equal(finished, false);
  a.emit('completed', { threadId: 's', turn: { id: 't', status: 'interrupted' } }); await cancel; assert.equal(finished, true);
});
