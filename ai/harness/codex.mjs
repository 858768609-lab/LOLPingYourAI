import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';

export class CodexAdapter extends EventEmitter {
  constructor({ command = 'codex', cwd, mcp, skillPath }) { super(); Object.assign(this, { command, cwd, mcp, skillPath }); this.pending = new Map(); this.active = new Map(); this.nextId = 1; this.loaded = new Set(); this.inheritedModel = null; this.inheritanceError = null; this.inheritedModelReady = null; }
  // Every caller waits for the same initialization; requests sent before `initialized` would be rejected.
  connect() { return this.ready ??= this.start().catch(error => { this.ready = null; throw error; }); }
  async start() {
    const args = ['app-server', '--listen', 'stdio://', '-c', 'mcp_servers.lolpingyourai.default_tools_approval_mode="approve"'];
    const entries = { command: this.mcp.command, args: this.mcp.args, env_vars: Object.keys(this.mcp.env) };
    for (const [key, value] of Object.entries(entries)) {
      if (key === 'env') { for (const [k, v] of Object.entries(value)) args.push('-c', `mcp_servers.lolpingyourai.env.${k}=${JSON.stringify(v)}`); }
      else args.push('-c', `mcp_servers.lolpingyourai.${key}=${JSON.stringify(value)}`);
    }
    const child = this.child = spawn(this.command, args, { cwd: this.cwd, env: { ...process.env, ...this.mcp.env }, stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true });
    child.stderr.on('data', data => this.emit('diagnostic', data.toString().slice(0, 3000)));
    child.stdin.on('error', () => {}); // Reported through the child's error/exit events.
    const detach = () => { if (this.child !== child) return false; this.child = null; this.ready = null; this.loaded.clear(); this.inheritedModel = null; this.inheritanceError = null; this.inheritedModelReady = null; return true; };
    child.on('error', error => { if (child.pid === undefined) detach(); this.fail(error); }); // No pid: it never started.
    child.on('exit', () => {
      if (!detach()) return;
      const turns = [...this.active]; this.active.clear();
      this.fail(new Error('Codex app-server exited'));
      // Interrupts and ward follow-ups wait for completion; a dead server can no longer send it.
      for (const [threadId, id] of turns) this.emit('completed', { threadId, turn: { id, status: 'failed' } });
    });
    createInterface({ input: child.stdout }).on('line', line => {
      let message; try { message = JSON.parse(line); } catch { return; }
      if (message.id !== undefined && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id); this.pending.delete(message.id); clearTimeout(pending.timer);
        message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result); return;
      }
      if (message.method === 'turn/started') this.active.set(message.params.threadId, message.params.turn.id);
      if (message.method === 'turn/completed') { this.active.delete(message.params.threadId); this.emit('completed', message.params); }
      if (message.id !== undefined && message.method) {
        this.emit('approval', message);
        // Never silently accept a harness approval. Surface it to the desktop UI.
        return;
      }
      this.emit('event', message);
    });
    await this.rpc('initialize', { clientInfo: { name: 'lolpingyourai', title: 'LOLPingYourAI', version: '0.1.0' }, capabilities: { experimentalApi: true } });
    child.stdin.write(JSON.stringify({ method: 'initialized', params: {} }) + '\n');
    await this.readInheritedModel();
  }
  readInheritedModel() {
    return this.inheritedModelReady ??= (async () => {
      let step = 'config/read';
      try {
        // A turn override becomes the thread default. Read the independent effective config once per connection,
        // then pass its model explicitly when the user selects inheritance, including for resumed overridden threads.
        const result = await this.rpc('config/read', { includeLayers: false, ...(this.cwd ? { cwd: this.cwd } : {}) });
        let model = result.config?.model;
        if (model == null || model === '') {
          step = 'model/list';
          const models = await this.rpc('model/list', { limit: 100 });
          model = models.data?.find(entry => entry.isDefault)?.model;
        }
        if (typeof model !== 'string' || !/^[a-zA-Z0-9._:-]{1,120}$/.test(model)) throw new Error('No effective default model');
        this.inheritedModel = model; this.inheritanceError = null;
      } catch {
        // Neither full configuration nor raw configuration errors are logged: they may contain private settings.
        this.inheritanceError = `无法从 Codex 的 ${step} 读取默认模型，请在 AI 队友设置中选择具体模型后重试。`;
        this.emit('diagnostic', `[lolpingyourai] default model unavailable (${step}); explicit model selection is required.\n`);
      }
    })();
  }
  fail(error) { for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(error); } this.pending.clear(); this.emit('failure', error); }
  rpc(method, params) {
    return new Promise((resolve, reject) => {
      if (!this.child?.stdin.writable) return reject(new Error('Codex is not connected'));
      const id = this.nextId++;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Codex ${method} timed out`)); }, 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(JSON.stringify({ id, method, params }) + '\n');
    });
  }
  respond(id, result) { this.child?.stdin.write(JSON.stringify({ id, result }) + '\n'); }
  async capabilities() {
    await this.connect();
    const status = await this.rpc('mcpServerStatus/list', { limit: 100, detail: 'toolsAndAuthOnly' });
    const native = (status.data ?? []).filter(s => /cua|computer.use/i.test(s.name)).map(s => s.name);
    return { images: true, steer: true, interrupt: true, desktop: 'project-mcp', nativeDesktop: native.length ? 'detected-not-validated-for-scoped-cancellation' : 'unavailable', nativeServers: native, inheritedModel: this.inheritedModel, inheritanceError: this.inheritanceError };
  }
  async create() {
    await this.connect();
    const result = await this.rpc('thread/start', { cwd: this.cwd, approvalPolicy: 'on-request', sandbox: 'workspace-write' });
    this.loaded.add(result.thread.id); return result.thread.id;
  }
  async resume(id) { await this.connect(); if (!this.loaded.has(id)) { await this.rpc('thread/resume', { threadId: id }); this.loaded.add(id); } return id; }
  async list() { await this.connect(); return (await this.rpc('thread/list', { limit: 30, cwd: this.cwd })).data ?? []; }
  async send(id, prompt, image, { effort = 'low', model = '' } = {}) {
    if (!['low', 'medium', 'high', 'xhigh'].includes(effort)) throw new Error('Unknown response effort');
    if (typeof model !== 'string' || (model !== '' && !/^[a-zA-Z0-9._:-]{1,120}$/.test(model))) throw new Error('Invalid model name');
    if (!model) { await this.readInheritedModel(); if (!this.inheritedModel) throw new Error(this.inheritanceError); model = this.inheritedModel; }
    const input = [{ type: 'text', text: `$lolping-your-ai\n${prompt}` }, { type: 'skill', name: 'lolping-your-ai', path: this.skillPath }];
    if (image) input.push({ type: 'localImage', path: image });
    const result = await this.rpc('turn/start', { threadId: id, input, effort, model });
    this.active.set(id, result.turn.id); return result.turn.id;
  }
  async steer(id, prompt, image, options) {
    const turn = this.active.get(id); if (!turn) return this.send(id, prompt, image, options);
    const input = [{ type: 'text', text: prompt }]; if (image) input.push({ type: 'localImage', path: image });
    try { return await this.rpc('turn/steer', { threadId: id, expectedTurnId: turn, input }); }
    catch (error) { if (!this.active.has(id)) return this.send(id, prompt, image, options); throw error; }
  }
  async cancel(id) {
    const turn = this.active.get(id); if (!turn) return;
    let listener, timer;
    const finished = new Promise((resolve, reject) => {
      listener = p => { if (p.threadId === id && p.turn.id === turn) resolve(); };
      this.on('completed', listener); timer = setTimeout(() => reject(new Error('Codex has not confirmed cancellation')), 15000);
    });
    try { await this.rpc('turn/interrupt', { threadId: id, turnId: turn }); await finished; }
    finally { this.off('completed', listener); clearTimeout(timer); }
  }
  close() { this.child?.kill(); }
}
