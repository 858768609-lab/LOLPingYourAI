import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Teammate } from '../service.mjs';
import { validateSvg } from '../icons.mjs';

class Adapter extends EventEmitter {
  active = new Map(); next = 0; sent = []; cancelled = [];
  async create() { return `session-${++this.next}`; }
  async resume(id) { return id; }
  async send(id, prompt) { this.active.set(id, `turn-${this.sent.length}`); this.sent.push({ id, prompt }); }
  async steer(id, prompt) { this.sent.push({ id, prompt, steer: true }); }
  async cancel(id) { this.cancelled.push(id); this.active.delete(id); this.emit('completed', { threadId: id, turn: { status: 'interrupted' } }); }
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
