import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
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

test('Codex turns inherit the model by default and apply optional model and effort per turn', async () => {
  const a = new CodexAdapter({ mcp: {}, skillPath: '/skill' });
  const requests = []; a.rpc = async (method, params) => { if (method === 'config/read') return { config: { model: 'inherited-model' } }; requests.push({ method, params }); return { turn: { id: 'turn' } }; };
  await a.send('s', 'Explain the screenshot', '/image.png');
  await a.send('s', 'Investigate this task', undefined, { effort: 'high' });
  await a.steer('idle-session', 'Reaction after completion', undefined, { effort: 'medium' });
  assert.deepEqual(requests.map(r => r.params.effort), ['low', 'high', 'medium']);
  assert.ok(requests.every(r => r.method === 'turn/start' && r.params.model === 'inherited-model'));
  await a.send('s', 'Use selected model', undefined, { effort: 'low', model: 'gpt-6.1-sol' });
  assert.equal(requests.at(-1).params.model, 'gpt-6.1-sol');
  await a.steer('other-idle-session', 'Selected model after completion', undefined, { model: 'gpt-6-astra' });
  assert.equal(requests.at(-1).params.model, 'gpt-6-astra');
  await assert.rejects(a.send('s', 'Invalid', undefined, { effort: 'unlimited' }), /Unknown response effort/);
  await assert.rejects(a.send('s', 'Invalid model', undefined, { model: 'two models' }), /Invalid model name/);
  assert.equal(requests.length, 5);
});

test('switching a sticky per-thread model override back to inheritance sends the effective config model', async () => {
  const a = new CodexAdapter({ cwd: '/project', mcp: {}, skillPath: '/skill' });
  let configReads = 0; const models = [];
  a.rpc = async (method, params) => {
    if (method === 'config/read') { configReads++; assert.deepEqual(params, { includeLayers: false, cwd: '/project' }); return { config: { model: 'gpt-6-astra', privateSetting: 'must-not-be-used' } }; }
    models.push(params.model); return { turn: { id: `turn-${models.length}` } };
  };
  await a.send('same-thread', 'Fast', undefined, { model: 'gpt-6.1-sol' });
  await a.send('same-thread', 'Restore inherited', undefined, { model: '' });
  await a.send('same-thread', 'Still inherited', undefined, { model: '' });
  assert.deepEqual(models, ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-astra']); assert.equal(configReads, 1);
});

test('inheritance resolves CLI default when config has no model and fails clearly when config/read is unavailable', async () => {
  const a = new CodexAdapter({ mcp: {}, skillPath: '/skill' }); const requests = [];
  a.rpc = async (method, params) => {
    if (method === 'config/read') return { config: { model: null } };
    if (method === 'model/list') return { data: [{ model: 'listed-other', isDefault: false }, { model: 'listed-default', isDefault: true }] };
    requests.push(params); return { turn: { id: 'turn' } };
  };
  await a.send('s', 'Inherited'); assert.equal(requests[0].model, 'listed-default');
  const unsupported = new CodexAdapter({ mcp: {}, skillPath: '/skill' }); const diagnostics = [];
  unsupported.on('diagnostic', value => diagnostics.push(value));
  unsupported.rpc = async (method, params) => { if (method === 'config/read') throw new Error('sensitive raw configuration failure'); requests.push(params); return { turn: { id: 'explicit' } }; };
  await assert.rejects(unsupported.send('s', 'Inherited'), /config\/read.*选择具体模型/);
  assert.equal(requests.length, 1); assert.doesNotMatch(diagnostics.join(''), /sensitive/);
  await unsupported.send('s', 'Explicit still works', undefined, { model: 'gpt-6.1-sol' }); assert.equal(requests.at(-1).model, 'gpt-6.1-sol');
});

const fakeServer = () => new CodexAdapter({ command: process.execPath, cwd: fileURLToPath(new URL('./fixtures/', import.meta.url)), mcp: { command: 'unused', args: [], env: {} }, skillPath: '/skill' });

test('concurrent Codex callers share one initialization before sending requests', async () => {
  const a = fakeServer();
  try { const [, thread] = await Promise.all([a.connect(), a.create()]); assert.equal(thread, 'thread-1'); }
  finally { a.close(); }
});

test('Codex app-server exit fails active turns instead of leaving waiters hanging', async () => {
  const a = fakeServer(); const failures = []; a.on('failure', error => failures.push(error.message));
  const completed = new Promise(resolve => a.on('completed', resolve));
  const thread = await a.create(); await a.send(thread, 'crash now');
  const done = await completed;
  assert.deepEqual([done.threadId, done.turn.status], ['thread-1', 'failed']); assert.equal(a.active.size, 0); assert.match(failures.at(-1), /exited/);
  await assert.doesNotReject(a.cancel(thread)); // Nothing left to interrupt.
  assert.equal(await a.create(), 'thread-1'); // Reconnects with a fresh app-server.
  a.close();
});
