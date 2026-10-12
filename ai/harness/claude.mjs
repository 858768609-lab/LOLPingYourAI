import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export class ClaudeAdapter extends EventEmitter {
  constructor({ cwd, mcp, skillPath }) { super(); Object.assign(this, { cwd, mcp, skillPath }); this.active = new Map(); this.known = new Set(); }
  async capabilities() { await import('@anthropic-ai/claude-agent-sdk'); return { images: true, steer: false, interrupt: true, desktop: 'project-mcp', nativeDesktop: false }; }
  async create() { const id = randomUUID(); return id; }
  async resume(id) { this.known.add(id); return id; }
  async send(id, prompt, image) {
    if (this.active.has(id)) throw new Error('Claude turn is still active');
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const content = [{ type: 'text', text: prompt }];
    if (image) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: (await readFile(image)).toString('base64') } });
    const skill = await readFile(this.skillPath, 'utf8');
    const options = { cwd: this.cwd, systemPrompt: { type: 'preset', preset: 'claude_code', append: skill }, mcpServers: { lolpingyourai: this.mcp }, permissionMode: 'default',
      canUseTool: async (name, input) => {
        if (name.startsWith('mcp__lolpingyourai__')) return { behavior: 'allow', updatedInput: input };
        return { behavior: 'deny', message: 'Use the scoped LOLPingYourAI desktop tools. Other tools require an interactive Claude session.' };
      }, ...(this.known.has(id) ? { resume: id } : { sessionId: id }) };
    async function* messages() { yield { type: 'user', session_id: id, parent_tool_use_id: null, message: { role: 'user', content } }; }
    const stream = query({ prompt: messages(), options });
    const record = { stream, finished: null }; this.active.set(id, record);
    record.finished = (async () => {
      let status = 'completed';
      try {
        for await (const message of stream) {
          this.emit('event', { method: 'claude/message', params: message });
          if (message.type === 'result' && message.is_error) status = 'failed';
          if (message.session_id) this.known.add(message.session_id);
        }
      } catch (error) { status = record.cancelled ? 'interrupted' : 'failed'; this.emit('failure', error); }
      finally { this.active.delete(id); this.emit('completed', { threadId: id, turn: { id, status: record.cancelled ? 'interrupted' : status } }); }
    })();
    return id;
  }
  async steer(id, prompt, image) { await this.cancel(id); return this.send(id, prompt, image); }
  async cancel(id) {
    const record = this.active.get(id); if (!record) return;
    record.cancelled = true; await record.stream.interrupt();
    await Promise.race([record.finished, new Promise((_, reject) => { const t = setTimeout(() => reject(new Error('Claude has not confirmed cancellation')), 15000); t.unref(); })]);
  }
  close() { for (const record of this.active.values()) record.stream.close(); }
}
