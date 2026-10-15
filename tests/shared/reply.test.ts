import { describe, expect, it } from 'vitest';
import { replyState } from '../../src/shared/reply';

describe('reply window payload', () => {
  it('only forwards assistant text and safe progress fields', () => {
    const state = replyState({
      busy: true, response: '你好\n\n回答', sessions: { secret: 'private-session' }, context: { imagePath: 'private-path' },
      approvals: [{ request: { params: 'private-approval' } }],
      history: [
        { event: { method: 'item/agentMessage/delta', params: { delta: '你好', secret: 'private-token' } } },
        { event: { method: 'item/mcpToolCall/completed', params: { text: 'private-tool' } } },
        { event: { method: 'claude/message', params: { type: 'user', message: { content: [{ type: 'text', text: 'private-prompt' }] } } } },
        { event: { method: 'claude/message', params: { type: 'assistant', message: { content: [{ type: 'text', text: '回答' }, { type: 'tool_use', text: 'private-tool' }] } } } },
      ],
      progress: { phase: 'responding', startedAt: 100, elapsedMs: 300, contextId: 'private-context', timings: { responding: 250 } },
    }, { enabled: true, alwaysOnTop: false });
    expect(state.messages).toBe('你好\n\n回答');
    expect(state.needsApproval).toBe(true);
    expect(state.progress).toEqual({ phase: 'responding', startedAt: 100, elapsedMs: 300, firstResponseMs: 250 });
    expect(JSON.stringify(state)).not.toContain('private');
  });
  it('bounds the text payload and ignores malformed progress', () => {
    const state = replyState({ response: 'a'.repeat(30000), progress: { phase: 'not-a-phase', startedAt: 1, elapsedMs: 2 } }, { enabled: true, alwaysOnTop: true });
    expect(state.messages).toHaveLength(24000);
    expect(state.progress).toBeNull();
  });
  it('does not display an earlier answer while a new turn has no response yet', () => {
    const state = replyState({ response: '', history: [{ event: { method: 'item/agentMessage/delta', params: { delta: 'previous answer' } } }] }, { enabled: true, alwaysOnTop: true });
    expect(state.messages).toBe('');
  });
});
