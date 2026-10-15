/** Collapse bursts of status events into one request plus a trailing refresh. */
export function createTeammateRefresh(callbacks: {
  call: (method: string) => Promise<any>;
  onState: (state: any) => void;
  onCandidates: (candidates: any[]) => void;
  onError: (error: unknown) => void;
}) {
  let disposed = false;
  let requested = false;
  let pending: Promise<void> | undefined;
  let iconsRevision: unknown = Symbol('not loaded');

  async function drain() {
    while (requested && !disposed) {
      requested = false;
      try {
        const state = await callbacks.call('status');
        if (disposed) return;
        callbacks.onState(state);
        // PNG previews are expensive to read and transfer. Token deltas only
        // change status; candidates are fetched when their revision changes.
        if (state.iconsRevision !== iconsRevision) {
          const candidates = await callbacks.call('candidates');
          if (disposed) return;
          callbacks.onCandidates(candidates);
          iconsRevision = state.iconsRevision;
        }
      } catch (error) {
        if (!disposed) callbacks.onError(error);
      }
    }
  }

  const request = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    requested = true;
    pending ??= drain().finally(() => {
      pending = undefined;
      // A notification can arrive in the microtask between drain's last
      // iteration and this finalizer. Keep that trailing request as well.
      if (requested && !disposed) return request();
    });
    return pending;
  };
  return {
    request,
    dispose() { disposed = true; requested = false; },
  };
}
