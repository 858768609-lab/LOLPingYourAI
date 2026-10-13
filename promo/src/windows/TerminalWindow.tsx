import React from 'react';
import { MacWindow } from '../components/Desktop';
import { FONT } from '../fonts';
import type { Rect } from './PaperWindow';

export const TERMINAL: Rect = { x: 120, y: 92, w: 1050, h: 700 };
const TITLE_BAR = 40;
const LINE = 30;
const PAD = 22;
const ROWS = 5; // finished-file lines kept on screen

// The repo's 44 Vitest files (tests/**), in a plausible run order.
const FILES = [
  'shared/geometry',
  'shared/pings',
  'shared/keys',
  'shared/protocol',
  'shared/wheelLayout',
  'shared/roomCode',
  'shared/settings',
  'shared/update',
  'shared/emotes',
  'shared/i18n',
  'shared/imageSniff',
  'shared/roomProtocol',
  'renderer/keyCaptureLogic',
  'renderer/emoteImport',
  'renderer/updateView',
  'renderer/soundBank',
  'renderer/emoteFx',
  'main/settingsIpc',
  'main/restartPolicy',
  'main/replayGuard',
  'main/updateMac',
  'main/roomCrypto',
  'main/floodGuard',
  'main/tray',
  'main/settingsWindow',
  'main/coords',
  'main/lanRoom',
  'main/relayTransport',
  'main/trayUpdate',
  'main/roomManager',
  'main/updater',
  'main/relayConnection',
  'main/emoteLibrary',
  'main/rateLimiter',
  'main/overlayManager',
  'main/inputBridge',
  'main/relayRoom',
  'main/relayPool',
  'main/updateWin',
  'main/safePath',
  'main/displayNumbers',
  'main/nostrEvent',
  'main/settingsStore',
  'helper/protocol',
];
export const TEST_FILES = FILES.length;

const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface TerminalProps {
  /** Test files finished so far (0..44). */
  filesDone: number;
  done: boolean;
  /** Frame counter for the spinner. */
  tick: number;
  rect?: Rect;
  flat?: boolean;
}

/** The progress-line row's centre in desktop coordinates (the ward target). */
export function terminalProgressPoint(rect: Rect = TERMINAL): { x: number; y: number } {
  return { x: rect.x + 330, y: rect.y + TITLE_BAR + PAD + LINE * (8.5 + ROWS) };
}

const C = { dim: '#7d8796', text: '#d6dde6', green: '#5fd38d', teal: '#4fd1c5', gold: '#e3c27f', yellow: '#f2c94c', bar: '#2b3442' };

/** Terminal running `pnpm test` (Vitest). Shows the last files, a progress line, then the real summary. */
export const TerminalWindow: React.FC<TerminalProps> = ({ filesDone, done, tick, rect = TERMINAL, flat }) => {
  const n = Math.max(0, Math.min(FILES.length, Math.floor(filesDone)));
  const shown = FILES.slice(Math.max(0, n - ROWS), n);
  const pct = n / FILES.length;
  return (
    <MacWindow {...rect} title="LOLPingYourAI — pnpm test — 120×36" titleBar={TITLE_BAR} flat={flat} contentStyle={{ background: '#0e131b' }}>
      <div style={{ position: 'absolute', inset: PAD, font: `400 19px/${LINE}px ${FONT.mono}`, color: C.text, whiteSpace: 'pre' }}>
        <div>
          <span style={{ color: C.teal }}>~/LOLPingYourAI</span>
          <span style={{ color: C.dim }}> on </span>
          <span style={{ color: C.gold }}>main</span>
          <span style={{ color: C.green }}> ❯ </span>pnpm test
        </div>
        <div style={{ color: C.dim }}>{'\n'}&gt; lolpingyourai@0.1.0 test</div>
        <div style={{ color: C.dim }}>&gt; vitest run</div>
        <div>
          {'\n'}
          <span style={{ background: '#1f6feb', color: '#fff', fontWeight: 700 }}> RUN </span> <span style={{ color: C.teal }}>v5.0.3</span>{' '}
          <span style={{ color: C.dim }}>~/LOLPingYourAI</span>
        </div>
        <div style={{ height: LINE }} />
        <div style={{ height: LINE * ROWS }}>
          {shown.map((file, i) => (
            <div key={file} style={{ opacity: 0.55 + (0.45 * (i + 1)) / shown.length }}>
              {' '}
              <span style={{ color: C.green }}>✓</span> tests/{file}.test.ts <span style={{ color: C.dim }}>({8 + ((i * 7 + n) % 23)} tests)</span>
            </div>
          ))}
        </div>
        <div style={{ height: LINE }} />
        {!done ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ color: C.yellow }}> {SPIN[Math.floor(tick / 2) % SPIN.length]}</span>
            <span>Running</span>
            <span style={{ color: C.dim }}>
              {String(n).padStart(2, ' ')}/{FILES.length} files
            </span>
            <span style={{ display: 'inline-block', width: 300, height: 14, background: C.bar, borderRadius: 7, overflow: 'hidden' }}>
              <span
                style={{ display: 'block', width: `${pct * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.teal}, ${C.green})` }}
              />
            </span>
          </div>
        ) : (
          <>
            <div>
              <span style={{ color: C.dim }}> Test Files </span>
              <span style={{ color: C.green, fontWeight: 700 }}>44 passed</span>
              <span style={{ color: C.dim }}> (44)</span>
            </div>
            <div>
              <span style={{ color: C.dim }}> Tests </span>
              <span style={{ color: C.green, fontWeight: 700 }}>709 passed</span>
              <span style={{ color: C.dim }}> | </span>
              <span style={{ color: C.yellow }}>1 skipped</span>
              <span style={{ color: C.dim }}> (710)</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{ color: C.teal }}>~/LOLPingYourAI</span>
              <span style={{ color: C.dim }}> on </span>
              <span style={{ color: C.gold }}>main</span>
              <span style={{ color: C.green }}> ❯ </span>
            </div>
          </>
        )}
      </div>
    </MacWindow>
  );
};
