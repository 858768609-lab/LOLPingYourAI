import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CaptureSquare, Flash, FlyingSnapshot, SnapshotContent } from './components/Capture';
import { Cursor } from './components/Cursor';
import { MenuBar, Wallpaper } from './components/Desktop';
import { KeyHud, ModGlyph } from './components/KeyHud';
import { Appear, Chip, Icons, PANEL_HEADER, PANEL_PAD, Reply, StatusLine, Stream, TeammatePanel, TURN_H, TurnHeader } from './components/Panel';
import { Ping } from './components/Ping';
import { Wheel } from './components/Wheel';
import { HUB_TEXTURE, texture } from './data/pings';
import { FONT } from './fonts';
import { easeIn, outExpo, progress } from './lib/anim';
import { hotAt, released, track, type WheelGesture } from './lib/gesture';
import { PING_WHEEL_ITEMS } from './scenes/shared';
import { AGENT_TAG_COLOR, C } from './theme';
import { boardRect, BoardWindow, type NoteState } from './windows/BoardWindow';
import { equationPoint, PaperWindow, type Rect } from './windows/PaperWindow';

/** The README loop: 1440×810 desktop stage drawn into a 1280×720 frame, flat colours, no sound. */
export const HERO_FRAMES = 360;
const STAGE = { w: 1440, h: 810 };
const PAPER: Rect = { x: 24, y: 44, w: 860, h: 700 };
const BOARD: Rect = boardRect(66, 92, 1.14);
const PANEL: Rect = { x: 908, y: 44, w: 508, h: 700 };
const PING = 150;
const DUR = 2.4; // shorter pings so none is still on screen when the loop wraps

const O1 = equationPoint(PAPER);
const O2 = { x: 420, y: 352 };
const REST = { x: 700, y: 640 };
const G1: WheelGesture = { origin: O1, openAt: 40, releaseAt: 72 };
const G2: WheelGesture = { origin: O2, openAt: 240, releaseAt: 262 };
const cursor = track(REST, [
  { from: 8, to: 34, points: [REST, { x: O1.x + 90, y: O1.y + 150 }, O1] },
  { from: 44, to: 62, points: [O1, { x: O1.x - 80, y: O1.y + 70 }, { x: O1.x - 160, y: O1.y + 12 }] },
  {
    from: 84,
    to: 108,
    points: [
      { x: O1.x - 160, y: O1.y + 12 },
      { x: 560, y: 690 },
    ],
  },
  { from: 208, to: 234, points: [{ x: 560, y: 690 }, { x: 520, y: 520 }, O2] },
  { from: 244, to: 256, points: [O2, { x: O2.x + 4, y: O2.y + 150 }] },
  {
    from: 270,
    to: 292,
    points: [
      { x: O2.x + 4, y: O2.y + 150 },
      { x: 760, y: 660 },
    ],
  },
  { from: 334, to: 354, points: [{ x: 760, y: 660 }, REST] },
]);
if (released(G1, cursor) !== 6 || released(G2, cursor) !== 4) throw new Error('hero gestures should release on W then S');

const SQUARE: Rect = { x: O1.x - 256, y: O1.y - 256, w: 512, h: 512 };
const THUMB = 150;
const SLOT: Rect = { x: PANEL.x + PANEL_PAD + 1, y: PANEL.y + PANEL_HEADER + PANEL_PAD + TURN_H + 16 + 1, w: THUMB, h: THUMB };
const T = {
  squareAt: 80,
  flashAt: 96,
  flyAt: 100,
  flyDur: 22,
  replyPingAt: 132,
  streamAt: 140,
  swapAt: 192,
  allInAt: 272,
  typeAt: 286,
  verifiedAt: 322,
  backAt: 330,
};
const ANSWER = 'Scaled dot-product attention: dividing by √dₖ keeps softmax from saturating.';
const RECEIVED = 'Ping received.';

function noteAt(f: number): NoteState {
  if (f < T.allInAt + 8) return { text: 'Ready for a ping.' };
  if (f < T.typeAt) return { text: 'Ready for a ping.', focused: true, selected: true };
  const n = Math.min(RECEIVED.length, Math.floor((f - T.typeAt) / 2.2) + 1);
  return { text: RECEIVED.slice(0, n), focused: true, caret: n < RECEIVED.length || Math.floor(f / 15) % 2 === 0 };
}

const BottomCaption: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 66,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 28px',
      background: '#08111d',
      borderTop: `1px solid ${C.goldLine}`,
      font: `600 25px ${FONT.body}`,
      color: C.text,
    }}
  >
    <div style={{ width: 10, height: 10, transform: 'rotate(45deg)', background: C.gold }} />
    <span>Hold</span>
    <span style={{ display: 'inline-flex', padding: '3px 6px', borderRadius: 6, border: '1.5px solid rgba(200,170,110,.8)', background: '#132233' }}>
      <ModGlyph kind="option" size={22} stroke={2.6} />
    </span>
    <span style={{ color: C.gold }}>·</span> <span>drag</span> <span style={{ color: C.gold }}>·</span> <span>release</span>
    <span style={{ color: C.textMuted }}>—</span>
    <span>your AI teammate gets the context</span>
  </div>
);

export const Hero: React.FC = () => {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const pos = cursor(f);
  const pressed = (f >= G1.openAt && f < G1.releaseAt) || (f >= G2.openAt && f < G2.releaseAt) ? 1 : 0;
  // paper → board at swapAt, board → paper at backAt (the loop wraps onto the opening frame)
  const paperO = 1 - progress(f, T.swapAt, 10, easeIn) + progress(f, T.backAt, 14, outExpo);
  const boardO = progress(f, T.swapAt + 8, 12, outExpo) * (1 - progress(f, T.backAt - 4, 10, easeIn));
  const body1 = 1 - progress(f, T.swapAt, 10);
  const body2 = progress(f, T.swapAt + 10, 1) * (1 - progress(f, T.backAt - 4, 12));
  const status = (f >= G1.releaseAt && f < T.streamAt + 50) || (f >= G2.releaseAt && f < T.verifiedAt) ? 'working' : 'idle';
  return (
    <AbsoluteFill style={{ background: '#0c1a2c' }}>
      <AbsoluteFill style={{ width: STAGE.w, height: STAGE.h, transform: `scale(${width / STAGE.w})`, transformOrigin: '0 0' }}>
        <Wallpaper flat />
        <MenuBar app={f < T.swapAt + 8 || f >= T.backAt ? 'Preview' : 'LOLPingYourAI Test Board'} height={26} flat />
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(1, paperO) }}>
          <PaperWindow rect={PAPER} flat />
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: boardO }}>{boardO > 0 && <BoardWindow rect={BOARD} note={noteAt(f)} flat />}</div>
        <CaptureSquare rect={SQUARE} at={T.squareAt} outAt={T.flyAt + T.flyDur + 6} dim={false} />
        <Flash rect={SQUARE} at={T.flashAt} />
        <TeammatePanel lang="en" title="AI Teammate" status={status} statusLabel={status === 'working' ? 'Working' : 'Idle'} rect={PANEL} flat>
          {body1 > 0 && f >= G1.releaseAt && (
            <div style={{ opacity: body1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Appear at={G1.releaseAt + 4}>
                <TurnHeader icon={texture('enemy_missing')} title="Question" meta="from you" lang="en" />
              </Appear>
              <div style={{ display: 'flex', gap: 14, height: THUMB }}>
                <div style={{ width: THUMB, height: THUMB, flexShrink: 0, position: 'relative' }}>
                  {f >= T.flyAt + T.flyDur && (
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 10, border: `2px solid ${C.gold}` }}>
                      <SnapshotContent from={SQUARE} k={THUMB / 512}>
                        <PaperWindow rect={PAPER} flat />
                      </SnapshotContent>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                  <Appear at={T.flyAt + 14} dy={8}>
                    <Chip k="signal" v="question" />
                  </Appear>
                  <Appear at={T.flyAt + 20} dy={8}>
                    <Chip k="mode" v="observe" />
                  </Appear>
                  <Appear at={T.flyAt + 26} dy={8}>
                    <Chip k="region" v="512×512" />
                  </Appear>
                </div>
              </div>
              <Appear at={T.replyPingAt + 4}>
                <Reply lang="en" label="reply" icon={texture('omw')}>
                  <Stream text={ANSWER} at={T.streamAt} cps={62} />
                </Reply>
              </Appear>
            </div>
          )}
          {body2 > 0 && (
            <div style={{ opacity: body2, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Appear at={G2.releaseAt + 4}>
                <TurnHeader icon={texture('assist_me')} title="Assist me" meta="from you" lang="en" />
              </Appear>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Appear at={G2.releaseAt + 8} dy={8}>
                  <Chip k="signal" v="assist" />
                </Appear>
                <Appear at={G2.releaseAt + 13} dy={8}>
                  <Chip k="mode" v="execute" />
                </Appear>
              </div>
              <Appear at={T.allInAt + 4}>
                <Reply lang="en" label="reply" icon={texture('all_in')}>
                  On it — editing the note.
                </Reply>
              </Appear>
              <Appear at={T.verifiedAt}>
                <StatusLine color={C.green} icon={Icons.check(C.green)} text="verified with a fresh screenshot" lang="en" />
              </Appear>
            </div>
          )}
        </TeammatePanel>
        <FlyingSnapshot from={SQUARE} to={SLOT} at={T.flyAt} dur={T.flyDur} arc={60}>
          <PaperWindow rect={PAPER} flat />
        </FlyingSnapshot>
        <Ping id="missing" at={G1.releaseAt} x={O1.x} y={O1.y} size={PING} durS={DUR} muted />
        <Ping id="omw" at={T.replyPingAt} x={O1.x} y={O1.y} size={PING} durS={DUR} muted tag={{ text: 'AI', color: AGENT_TAG_COLOR }} />
        <Ping id="assist" at={G2.releaseAt} x={O2.x} y={O2.y} size={PING} durS={DUR} muted />
        <Ping id="allin" at={T.allInAt} x={O2.x + 300} y={O2.y - 10} size={PING} durS={DUR} muted tag={{ text: 'AI', color: AGENT_TAG_COLOR }} />
        <Wheel
          id="hero1"
          x={O1.x}
          y={O1.y}
          openAt={G1.openAt}
          releaseAt={G1.releaseAt}
          hot={(fr) => hotAt(G1, cursor, fr)}
          items={PING_WHEEL_ITEMS}
          centerLabel="PING"
          centerIcon={texture(HUB_TEXTURE)}
        />
        <Wheel
          id="hero2"
          x={O2.x}
          y={O2.y}
          openAt={G2.openAt}
          releaseAt={G2.releaseAt}
          hot={(fr) => hotAt(G2, cursor, fr)}
          items={PING_WHEEL_ITEMS}
          centerLabel="PING"
          centerIcon={texture(HUB_TEXTURE)}
        />
        <Cursor x={pos.x} y={pos.y} pressed={pressed} />
        <BottomCaption />
        <KeyHud
          kind="option"
          downAt={G1.openAt - 6}
          upAt={G1.releaseAt + 2}
          mouseDownAt={G1.openAt}
          mouseUpAt={G1.releaseAt}
          scale={0.6}
          style={{ right: 28, bottom: 8 }}
        />
        <KeyHud
          kind="option"
          downAt={G2.openAt - 6}
          upAt={G2.releaseAt + 2}
          mouseDownAt={G2.openAt}
          mouseUpAt={G2.releaseAt}
          scale={0.6}
          style={{ right: 28, bottom: 8 }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
