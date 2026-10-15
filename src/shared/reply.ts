export const REPLY_CH = { call: 'ai-reply:call', changed: 'ai-reply:changed' } as const;
export type ReplyPhase = 'queued' | 'capturing' | 'connecting' | 'thinking' | 'responding' | 'completed' | 'failed' | 'stopped';
export interface ReplyProgress {
  phase: ReplyPhase;
  startedAt: number;
  elapsedMs: number;
  firstResponseMs?: number;
}
export interface ReplyState {
  busy: boolean;
  messages: string;
  progress: ReplyProgress | null;
  needsApproval: boolean;
  enabled: boolean;
  alwaysOnTop: boolean;
}
export interface ReplySettings { enabled: boolean; alwaysOnTop: boolean }
export interface ReplyApi {
  status(): Promise<ReplyState>;
  stop(): Promise<void>;
  hide(): Promise<void>;
  openSettings(): Promise<void>;
  setAlwaysOnTop(on: boolean): Promise<void>;
  onChange(callback: (state: ReplyState) => void): () => void;
}

const phases = new Set<ReplyPhase>(['queued', 'capturing', 'connecting', 'thinking', 'responding', 'completed', 'failed', 'stopped']);
/** Only assistant text and public progress cross the reply-window boundary. */
export function replyState(status: any, settings: ReplySettings): ReplyState {
  // The service associates response text with the active turn. Reading history
  // here would show old answers while a new selection is being processed.
  const messages = typeof status.response === 'string' ? status.response.slice(-24000) : '';
  const value = status.progress;
  const progress: ReplyProgress | null = value && phases.has(value.phase) && Number.isFinite(value.startedAt) && Number.isFinite(value.elapsedMs)
    ? { phase: value.phase, startedAt: value.startedAt, elapsedMs: Math.max(0, value.elapsedMs), ...(Number.isFinite(value.timings?.responding) ? { firstResponseMs: Math.max(0, value.timings.responding) } : {}) }
    : null;
  return { busy: Boolean(status.busy), messages, progress, needsApproval: Array.isArray(status.approvals) && status.approvals.length > 0, enabled: settings.enabled, alwaysOnTop: settings.alwaysOnTop };
}
