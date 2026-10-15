import { describe, expect, it, vi } from 'vitest';
import { createTeammateRefresh } from '../../src/renderer/settings/teammateRefresh';

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

describe('teammate refresh', () => {
  it('coalesces notifications while a status request runs and does not reread previews on token updates', async () => {
    const first = deferred<unknown>();
    let requests = 0;
    const call = vi.fn((method: string) => method === 'status' ? ++requests === 1 ? first.promise : Promise.resolve({ iconsRevision: 0 }) : Promise.resolve([{ id: 'one' }]));
    const callbacks = { call, onState: vi.fn(), onCandidates: vi.fn(), onError: vi.fn() };
    const refresh = createTeammateRefresh(callbacks);
    const pending = refresh.request();
    for (let i = 0; i < 100; i++) void refresh.request();
    expect(requests).toBe(1);
    first.resolve({ iconsRevision: 0 });
    await pending;
    expect(requests).toBe(2);
    expect(call.mock.calls.filter(([method]) => method === 'candidates')).toHaveLength(1);
    await refresh.request();
    expect(requests).toBe(3);
    expect(callbacks.onCandidates).toHaveBeenCalledTimes(1);
  });

  it('reloads candidates after a revision changes', async () => {
    let revision = 0;
    const callbacks = { call: vi.fn(async (method: string) => method === 'status' ? { iconsRevision: revision } : [{ id: String(revision) }]), onState: vi.fn(), onCandidates: vi.fn(), onError: vi.fn() };
    const refresh = createTeammateRefresh(callbacks);
    await refresh.request(); revision++;
    await refresh.request();
    expect(callbacks.onCandidates.mock.calls).toEqual([[[{ id: '0' }]], [[{ id: '1' }]]]);
  });

  it('ignores an in-flight response after unmount', async () => {
    const result = deferred<unknown>();
    const callbacks = { call: vi.fn(() => result.promise), onState: vi.fn(), onCandidates: vi.fn(), onError: vi.fn() };
    const refresh = createTeammateRefresh(callbacks);
    const pending = refresh.request(); refresh.dispose(); result.resolve({ iconsRevision: 0 });
    await pending; await refresh.request();
    expect(callbacks.call).toHaveBeenCalledTimes(1);
    expect(callbacks.onState).not.toHaveBeenCalled();
    expect(callbacks.onCandidates).not.toHaveBeenCalled();
  });

  it('retains a notification queued immediately after the last response', async () => {
    const onState = vi.fn();
    const callbacks = { call: vi.fn(async (method: string) => method === 'status' ? { iconsRevision: 0 } : []), onState, onCandidates: vi.fn(), onError: vi.fn() };
    const refresh = createTeammateRefresh(callbacks);
    await refresh.request();
    onState.mockImplementationOnce(() => queueMicrotask(() => { void refresh.request(); }));
    await refresh.request();
    expect(onState).toHaveBeenCalledTimes(3);
  });

  it('can retry after a failed status or preview request', async () => {
    let failed = false;
    const callbacks = { call: vi.fn(async (method: string) => { if (!failed) { failed = true; throw new Error('offline'); } return method === 'status' ? { iconsRevision: 0 } : []; }), onState: vi.fn(), onCandidates: vi.fn(), onError: vi.fn() };
    const refresh = createTeammateRefresh(callbacks);
    await refresh.request(); await refresh.request();
    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(callbacks.onState).toHaveBeenCalledTimes(1);
    expect(callbacks.onCandidates).toHaveBeenCalledTimes(1);
  });
});
