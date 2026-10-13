import React from 'react';
import { MacWindow } from '../components/Desktop';
import { FONT } from '../fonts';
import type { Rect } from './PaperWindow';

/** tools/test-board.cjs draws a 680×520 window; the promo shows it at this zoom so it reads on video. */
export const BOARD_ZOOM = 1.3;
const TITLE_BAR = 28;
/** The board window at `zoom` with its top-left at (x, y). */
export const boardRect = (x: number, y: number, zoom = BOARD_ZOOM): Rect => ({ x, y, w: 680 * zoom, h: 520 * zoom });
export const BOARD: Rect = boardRect(190, 96);

// Unzoomed layout of the board page (body padding 32, h1, p, then the textarea).
const TA = { left: 32, top: 137, w: 0.95 * 616 + 24, h: 120 + 20 + 4 };

/** The textarea's outer box in desktop coordinates. */
export function boardTextarea(rect: Rect = BOARD): Rect {
  const z = rect.w / 680;
  return { x: rect.x + TA.left * z, y: rect.y + (TITLE_BAR + TA.top) * z, w: TA.w * z, h: TA.h * z };
}

export interface NoteState {
  text: string;
  /** The whole text shows the selection highlight (after cmd+a). */
  selected?: boolean;
  focused?: boolean;
  /** Caret visible this frame (focused and in the blink's on phase). */
  caret?: boolean;
}

/** "Teammate practice board": the disposable test window from tools/test-board.cjs, same colours and copy. */
export const BoardWindow: React.FC<{ note: NoteState; rect?: Rect; flat?: boolean }> = ({ note, rect = BOARD, flat }) => (
  <MacWindow
    {...rect}
    title="LOLPingYourAI Test Board"
    dark={false}
    titleBar={TITLE_BAR * (rect.w / 680)}
    flat={flat}
    contentStyle={{ background: '#f6f3eb' }}
  >
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 680,
        height: 492,
        transform: `scale(${rect.w / 680})`,
        transformOrigin: '0 0',
        padding: 32,
        boxSizing: 'border-box',
        font: `400 18px ${FONT.body}`,
        color: '#243a39',
        background: '#f6f3eb',
      }}
    >
      <div style={{ font: `700 26px/30px ${FONT.body}`, margin: '17px 0' }}>Teammate practice board</div>
      <div style={{ lineHeight: '22px', margin: '18px 0' }}>Only this disposable test window may be edited.</div>
      <div
        style={{
          width: '95%',
          height: 120,
          padding: 10,
          border: '2px solid #398e82',
          borderRadius: 12,
          background: '#fff',
          font: `400 20px/24px ${FONT.body}`,
          color: '#1d2b2a',
          boxSizing: 'content-box',
          boxShadow: note.focused ? '0 0 0 3px rgba(57,142,130,.28)' : undefined,
        }}
      >
        <span style={{ background: note.selected ? 'rgba(80,140,255,.38)' : undefined, borderRadius: 2 }}>{note.text}</span>
        {note.caret && <span style={{ display: 'inline-block', width: 2, height: 23, verticalAlign: -4, marginLeft: 1, background: '#1d2b2a' }} />}
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.5, margin: '24px 0' }}>
        Test: replace the note with “Ping received”, then restore it when corrected.
      </div>
      <div
        style={{
          display: 'inline-block',
          padding: '3px 12px',
          font: `400 14px ${FONT.body}`,
          color: '#222',
          background: '#fdfdfd',
          border: '1px solid #b9b9b9',
          borderRadius: 5,
          boxShadow: '0 1px 1px rgba(0,0,0,.08)',
        }}
      >
        Reset note
      </div>
    </div>
  </MacWindow>
);
