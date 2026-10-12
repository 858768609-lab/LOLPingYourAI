import { afterEach, expect, it, vi } from 'vitest';
import { SoundBank } from '../../src/renderer/overlay/soundBank';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it('completion waits for actual audio end and output latency, not an assumed ping duration', async () => {
  vi.useFakeTimers();
  const source = { buffer: null, connect: vi.fn().mockReturnThis(), disconnect: vi.fn(), start: vi.fn(), onended: null as null | (() => void) };
  vi.stubGlobal('AudioContext', class {
    state = 'running'; outputLatency = .1; destination = {};
    decodeAudioData = async () => ({ length: 1 });
    createBufferSource = () => source;
    createGain = () => ({ gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() });
  });
  vi.stubGlobal('fetch', async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }));
  const bank = new SoundBank(); await bank.load([{ key: 'long', url: 'long.wav' }]);
  let ended = false; const playing = bank.play('long', 1).then(() => { ended = true; });
  await vi.advanceTimersByTimeAsync(10000); expect(ended).toBe(false);
  source.onended!(); await vi.advanceTimersByTimeAsync(99); expect(ended).toBe(false);
  await vi.advanceTimersByTimeAsync(1); await playing; expect(ended).toBe(true);
  await bank.play('missing', 1); await bank.play('long', 0);
  expect(source.start).toHaveBeenCalledTimes(1);
});
