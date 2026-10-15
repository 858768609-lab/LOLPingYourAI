import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Teammate } from '../service.mjs';
import { validateSvg } from '../icons.mjs';

class Adapter extends EventEmitter {
  active = new Map(); next = 0; sent = []; cancelled = [];
  async create() { return `session-${++this.next}`; }
  async resume(id) { return id; }
  async send(id, prompt, image, options) { const turn = `turn-${this.sent.length}`; this.active.set(id, turn); this.sent.push({ id, prompt, image, options }); return turn; }
  async steer(id, prompt) { this.sent.push({ id, prompt, steer: true }); }
  async cancel(id) { const turn = this.active.get(id); this.cancelled.push(id); this.active.delete(id); this.emit('completed', { threadId: id, turn: { id: turn, status: 'interrupted' } }); }
  close() {}
}
async function fixture() {
  let now = 100; const data = {}, adapter = new Adapter();
  const store = { read: async (k, d) => structuredClone(data[k] ?? d), write: async (k, v) => { data[k] = structuredClone(v); } };
  const desktop = { available: async () => true, capture: async () => ({ target: { id: 'window', pid: 2, bounds: { x: 10, y: 20, width: 100, height: 100 }, relative: { x: .5, y: .5 } }, region: {}, imagePath: '/test.png' }), reply: async () => {}, action: async () => ({ ok: true }) };
  const service = new Teammate({ store, adapters: { codex: adapter, claude: new Adapter() }, desktop, now: () => now }); await service.init();
  return { service, adapter, data, time: n => { now = n; } };
}
test('successive pings resume, expiry creates a new session with a concise handoff', async () => {
  const { service, adapter, time } = await fixture();
  const first = await service.dispatch({ signal: 'assist', point: { x: 60, y: 70 } });
  await service.handoff({ contextId: first.contextId, summary: 'Fix the button; inspected the layout.', goal: 'Fix button' });
  await service.dispatch({ signal: 'missing', point: { x: 60, y: 70 } }); assert.equal(adapter.next, 1);
  time(7201000); await service.dispatch({ signal: 'assist', point: { x: 60, y: 70 } });
  assert.equal(adapter.next, 2); assert.match(adapter.sent.at(-1).prompt, /Fix the button/);
});
test('remote/agent replies never dispatch; duplicate input runs once', async () => {
  const { service, adapter } = await fixture();
  await service.dispatch({ source: 'agent', signal: 'allin' }); await service.dispatch({ source: 'remote', signal: 'allin' });
  assert.equal(adapter.next, 0);
  await service.dispatch({ id: 'same', signal: 'missing' }); await service.dispatch({ id: 'same', signal: 'missing' }); assert.equal(adapter.sent.length, 1);
});
test('read-only context rejects actions, stale contexts remain invalid', async () => {
  const { service } = await fixture(); const first = await service.dispatch({ signal: 'assist' });
  await service.action({ contextId: first.contextId, action: 'click' });
  const next = await service.dispatch({ signal: 'missing' });
  await assert.rejects(service.action({ contextId: first.contextId, action: 'click' }), /Stale/);
  await assert.rejects(service.action({ contextId: next.contextId, action: 'click' }), /not authorized/);
});
test('retreat revokes actions and waits for adapter cancellation', async () => {
  const { service, adapter } = await fixture(); const turn = await service.dispatch({ signal: 'allin' });
  await service.dispatch({ signal: 'retreat' }); assert.deepEqual(adapter.cancelled, [turn.session]);
  await assert.rejects(service.action({ contextId: turn.contextId, action: 'click' }));
});
test('unowned session binding needs explicit handoff and never resumes another chat', async () => {
  const { service } = await fixture(); await assert.rejects(service.bind({ harness: 'codex', id: 'someone-else' }), /not verified/);
  const binding = await service.bind({ harness: 'codex', id: 'someone-else', summary: 'Fix button' }); assert.equal(binding.binding, 'handoff'); assert.notEqual(binding.id, 'someone-else');
});
test('SVG icon candidates reject external resources and executable content', () => {
  assert.match(validateSvg('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="3"/></svg>'), /circle/);
  for (const svg of ['<svg><script>bad()</script></svg>', '<svg><image href="file:///secret"/></svg>', '<svg><rect fill="url(https://example.com)"/></svg>', '<svg onload="bad()"></svg>']) assert.throws(() => validateSvg(svg));
});

test('a queued session creation cannot revive desktop actions after retreat', async () => {
  const { service, adapter } = await fixture();
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  adapter.create = () => { entered(); return new Promise(resolve => { release = resolve; }); };
  const pending = service.dispatch({ signal: 'assist' });
  await started;
  const retreat = service.dispatch({ signal: 'retreat' });
  release('late-session');
  await assert.rejects(pending, /superseded/); await retreat;
  assert.equal(service.gate.allowed, false); assert.equal(adapter.sent.length, 0);
});

test('event receipts survive service restart', async () => {
  const { service, adapter } = await fixture(); await service.dispatch({ id: 'persistent-event', signal: 'missing' });
  const restarted = new Teammate({ store: service.store, adapters: { codex: adapter }, desktop: service.desktop }); await restarted.init();
  assert.deepEqual(await restarted.dispatch({ id: 'persistent-event', signal: 'assist' }), { duplicate: true });
  assert.equal(adapter.sent.length, 1);
});

test('timer follow-up does not extend user activity or authorize edits', async () => {
  const { service, adapter, time } = await fixture(); await service.dispatch({ signal: 'assist' });
  const stamp = service.sessions.codex.lastHumanPing; time(4000);
  await service.dispatch({ source: 'timer', signal: 'missing', target: service.context.target });
  assert.equal(service.sessions.codex.lastHumanPing, stamp); assert.equal(service.gate.allowed, false); assert.equal(adapter.next, 1);
});

test('switching harness keeps separate sessions and cancels former desktop work', async () => {
  const { service, adapter } = await fixture(); const first = await service.dispatch({ signal: 'assist' });
  await service.configure({ harness: 'claude' }); await service.dispatch({ signal: 'missing' });
  assert.ok(service.sessions.codex); assert.ok(service.sessions.claude); assert.equal(adapter.active.size, 0); assert.deepEqual(adapter.cancelled, [first.session]);
});

test('teammate history keeps text but drops screenshot payloads', async () => {
  const { service, adapter } = await fixture(), image = 'iVBORw0KGgo' + 'A'.repeat(300000);
  adapter.emit('event', { method: 'claude/message', params: { type: 'user', message: { content: [{ type: 'tool_result', content: [{ type: 'image', source: { data: image } }, { type: 'text', text: 'Mapped region.' }] }] } } });
  adapter.emit('event', { method: 'item/agentMessage/delta', params: { itemId: 'a', delta: 'Done. ' } }); adapter.emit('event', { method: 'item/agentMessage/delta', params: { itemId: 'a', delta: 'Note restored.' } });
  const [tool, reply] = service.status().history.map(h => h.event.params);
  assert.match(tool.message.content[0].content[0].source.data, /^\[300011 characters of binary data omitted\]$/); assert.equal(tool.message.content[0].content[1].text, 'Mapped region.');
  assert.equal(reply.delta, 'Done. Note restored.'); assert.ok(JSON.stringify(service.status().history).length < 2000);
});

test('receipt is immediate, effort stays local, and timing summaries exclude input data', async () => {
  const { service, adapter, time } = await fixture(); const notices = [];
  service.on('notice', message => notices.push(message));
  const pending = service.dispatch({ signal: 'missing', message: 'private test prompt' });
  assert.equal(notices[0], '已收到信号，正在查看'); assert.equal(service.status().progress.phase, 'queued');
  assert.equal(service.busy(), true);
  const result = await pending;
  assert.equal(service.status().progress.phase, 'thinking');
  assert.equal(adapter.sent[0].options.effort, 'low');
  assert.match(adapter.sent[0].prompt, /does not need save_handoff/);
  assert.match(adapter.sent[0].prompt, /without any tool calls/);
  assert.match(adapter.sent[0].prompt, /Before a fresh screenshot, desktop operation or task-state operation, call get_context/);
  time(350); adapter.emit('event', { method: 'item/agentMessage/delta', params: { threadId: result.session, turnId: 'turn-0', itemId: 'text', delta: 'Visible answer' } });
  assert.equal(service.status().progress.phase, 'responding'); assert.equal(service.status().progress.timings.responding, 250);
  time(500); adapter.emit('completed', { threadId: result.session, turn: { id: 'turn-0', status: 'completed' } });
  assert.equal(service.status().progress.phase, 'completed'); assert.equal(service.status().progress.timings.completed, 400);
  assert.doesNotMatch(JSON.stringify(service.status().progress), /private|session-|turn-|Visible/);
});

test('late text and completion from an old turn cannot overwrite new progress or revoke its gate', async () => {
  const { service, adapter } = await fixture();
  const first = await service.dispatch({ signal: 'assist' });
  const next = await service.dispatch({ signal: 'assist' });
  assert.equal(service.gate.allowed, true);
  adapter.emit('event', { method: 'item/agentMessage/delta', params: { threadId: first.session, turnId: 'turn-0', itemId: 'old', delta: 'Old answer' } });
  adapter.emit('completed', { threadId: first.session, turn: { id: 'turn-0', status: 'completed' } });
  assert.equal(service.status().progress.phase, 'thinking'); assert.equal(service.gate.allowed, true);
  adapter.emit('event', { method: 'item/agentMessage/delta', params: { threadId: next.session, turnId: 'turn-1', itemId: 'new', delta: 'Current answer' } });
  assert.equal(service.status().progress.phase, 'responding');
});

test('capture and harmless connection overlap but superseding retreat prevents a turn', async () => {
  const { service, adapter } = await fixture(); let captured, connected;
  const originalCapture = service.desktop.capture;
  const capturedStarted = new Promise(resolve => { service.desktop.capture = () => new Promise(release => { captured = async () => release(await originalCapture()); resolve(); }); });
  const connectedStarted = new Promise(resolve => { adapter.connect = () => new Promise(release => { connected = release; resolve(); }); });
  const pending = service.dispatch({ signal: 'assist' });
  await Promise.all([capturedStarted, connectedStarted]);
  const retreat = service.dispatch({ signal: 'retreat' });
  await captured(); connected();
  await assert.rejects(pending, /superseded/); await retreat;
  assert.equal(adapter.sent.length, 0); assert.equal(service.gate.allowed, false); assert.equal(service.status().progress.phase, 'stopped');
});

test('a failed connection stays failed when overlapping capture finishes later', async () => {
  const { service, adapter } = await fixture(); let release;
  service.desktop.capture = () => new Promise(resolve => { release = resolve; });
  adapter.connect = async () => { throw new Error('connection unavailable'); };
  await assert.rejects(service.dispatch({ signal: 'missing' }), /connection unavailable/);
  assert.equal(service.status().progress.phase, 'failed');
  release({ target: {}, region: {}, imagePath: '/test.png' }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(service.status().progress.phase, 'failed'); assert.equal(adapter.sent.length, 0);
});

test('selected rectangle is forwarded and retained for scoped refresh screenshots', async () => {
  const { service } = await fixture(); const selection = { x: 10, y: 20, width: 80, height: 60 }, calls = [], originalCapture = service.desktop.capture;
  service.desktop.capture = async (...args) => { calls.push(args); const capture = await originalCapture(); capture.region.selection = selection; return capture; };
  const result = await service.dispatch({ signal: 'missing', selection }); await service.screenshot(result.contextId);
  assert.deepEqual(calls.map(args => args[3]), [selection, selection]);
});

test('current reply clears on a new request and excludes late text from the previous turn', async () => {
  const { service, adapter } = await fixture();
  const first = await service.dispatch({ signal: 'missing' });
  const delta = (turnId, text) => adapter.emit('event', { method: 'item/agentMessage/delta', params: { threadId: first.session, turnId, itemId: turnId, delta: text } });
  delta('turn-0', 'Previous answer'); assert.equal(service.status().response, 'Previous answer');
  const next = service.dispatch({ signal: 'missing' });
  assert.equal(service.status().response, '');
  delta('turn-0', ' late text'); assert.equal(service.status().response, '');
  await next; delta('turn-1', 'Current'); delta('turn-1', ' answer');
  assert.equal(service.status().response, 'Current answer');
  delta('turn-0', ' another late chunk'); assert.equal(service.status().response, 'Current answer');
});

test('Claude complete assistant messages update once instead of duplicating streamed revisions', async () => {
  const { service } = await fixture(); await service.configure({ harness: 'claude' });
  const result = await service.dispatch({ signal: 'missing' }), adapter = service.adapters.claude;
  const message = (id, text) => adapter.emit('event', { method: 'claude/message', params: { type: 'assistant', session_id: result.session, message: { id, content: [{ type: 'text', text }] } } });
  message('a', 'First'); message('a', 'First answer'); message('a', 'First answer'); message('b', 'Additional detail');
  assert.equal(service.status().response, 'First answer\n\nAdditional detail');
});

test('public stop waits for a pending turn/start and cancels its late accepted turn', async () => {
  const { service, adapter } = await fixture(); let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  adapter.send = async id => { entered(); await new Promise(resolve => { release = resolve; }); adapter.active.set(id, 'late-turn'); return 'late-turn'; };
  const pending = service.dispatch({ signal: 'assist' }); await started;
  let stopped = false; const stop = service.stop().then(() => { stopped = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(stopped, false); assert.equal(service.gate.allowed, false);
  release(); await assert.rejects(pending, /superseded/); await stop;
  assert.equal(adapter.active.size, 0); assert.deepEqual(adapter.cancelled, ['session-1']); assert.equal(service.status().progress.phase, 'stopped');
});

test('a reaction whose old turn ends during session persistence starts a tracked new turn', async () => {
  const { service, adapter } = await fixture(); const first = await service.dispatch({ signal: 'assist' });
  const write = service.store.write; let saves = 0;
  service.store.write = async (key, value) => {
    await write(key, value);
    if (key === 'ai-sessions' && ++saves === 2) { adapter.active.delete(first.session); adapter.emit('completed', { threadId: first.session, turn: { id: 'turn-0', status: 'completed' } }); }
  };
  await service.dispatch({ signal: 'like' });
  assert.equal(adapter.sent.length, 2); assert.equal(service.status().progress.phase, 'thinking');
  adapter.emit('event', { method: 'item/agentMessage/delta', params: { threadId: first.session, turnId: 'turn-1', itemId: 'reaction', delta: 'Thanks' } });
  assert.equal(service.status().response, 'Thanks');
});

test('steer fallback after completion remains tracked and receives the new turn response', async () => {
  const { service, adapter } = await fixture(); const first = await service.dispatch({ signal: 'assist' });
  adapter.steer = async id => {
    adapter.active.delete(id); adapter.emit('completed', { threadId: id, turn: { id: 'turn-0', status: 'completed' } });
    adapter.active.set(id, 'replacement'); adapter.emit('event', { method: 'turn/started', params: { threadId: id, turn: { id: 'replacement' } } });
    return 'replacement';
  };
  await service.dispatch({ signal: 'like' }); assert.equal(service.status().progress.phase, 'thinking');
  adapter.emit('event', { method: 'item/agentMessage/delta', params: { threadId: first.session, turnId: 'replacement', itemId: 'reaction', delta: 'Thank you' } });
  adapter.emit('completed', { threadId: first.session, turn: { id: 'replacement', status: 'completed' } });
  assert.equal(service.status().response, 'Thank you'); assert.equal(service.status().progress.phase, 'completed');
});

test('selected model is app-local, visible in status, and passed to the next turn', async () => {
  const { service, adapter, data } = await fixture();
  assert.equal(service.status().config.model, '');
  await service.configure({ model: 'gpt-6.1-sol' }); await service.dispatch({ signal: 'missing' });
  assert.equal(service.status().config.model, 'gpt-6.1-sol'); assert.equal(adapter.sent[0].options.model, 'gpt-6.1-sol');
  assert.equal(data['ai-config'].model, 'gpt-6.1-sol');
});
