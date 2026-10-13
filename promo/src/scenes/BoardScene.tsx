import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Cursor } from '../components/Cursor';
import { SceneWindow, useSceneSwap } from '../components/SceneWindow';
import { MenuBar, Wallpaper } from '../components/Desktop';
import { KeyHud } from '../components/KeyHud';
import { Appear, Chip, Icons, Reply, StatusLine, TeammatePanel, ToolLine, TurnHeader, type Status } from '../components/Panel';
import { Ping } from '../components/Ping';
import { Sfx } from '../components/Sfx';
import { Wheel } from '../components/Wheel';
import { COPY, type Lang } from '../copy';
import { HUB_TEXTURE, sound, texture, TICK_SOUND } from '../data/pings';
import { keyframes, progress, smooth } from '../lib/anim';
import { hotAt, released, tickFrames, track, type WheelGesture } from '../lib/gesture';
import { AGENT_TAG_COLOR, C } from '../theme';
import { BoardWindow, type NoteState } from '../windows/BoardWindow';
import { BottomShade, HUD_POS, PING_SIZE, PING_WHEEL_ITEMS } from './shared';

export const BOARD_SCENE_FRAMES = 285;

const READY = 'Ready for a ping.';
const RECEIVED = 'Ping received.';

const O1 = { x: 610, y: 446 }; // on the note
const O2 = { x: 760, y: 430 }; // right part of the note
const G1: WheelGesture = { origin: O1, openAt: 44, releaseAt: 70 };
const G2: WheelGesture = { origin: O2, openAt: 190, releaseAt: 214 };
const cursor = track({ x: 1000, y: 720 }, [
  { from: 4, to: 36, points: [{ x: 1000, y: 720 }, { x: 640, y: 560 }, O1] },
  { from: 48, to: 62, points: [O1, { x: O1.x + 6, y: O1.y + 150 }] },
  {
    from: 84,
    to: 112,
    points: [
      { x: O1.x + 6, y: O1.y + 150 },
      { x: 1010, y: 690 },
    ],
  },
  { from: 160, to: 184, points: [{ x: 1010, y: 690 }, { x: 860, y: 560 }, O2] },
  { from: 194, to: 206, points: [O2, { x: O2.x + 4, y: O2.y - 152 }] },
]);
const TICKS = [...tickFrames(G1, cursor), ...tickFrames(G2, cursor)];
if (released(G1, cursor) !== 4) throw new Error('first gesture should release on S (Assist Me)');
if (released(G2, cursor) !== 0) throw new Error('second gesture should release on N (Danger)');

// Rests the log on the gap above the reply box, so no half chip row lingers under the header.
const SCROLL = 172;

const T = {
  allInAt: 82,
  clickAt: 94,
  selectAt: 100,
  typeAt: 106,
  typeFpc: 2.4,
  verifiedAt: 150,
  interruptAt: 220,
  reselectAt: 234,
  retypeAt: 240,
  retypeFpc: 1.5,
  restoredAt: 272,
};

function typed(text: string, f: number, at: number, fpc: number): string {
  const chars = Array.from(text);
  return chars.slice(0, Math.max(0, Math.min(chars.length, Math.floor((f - at) / fpc) + 1))).join('');
}

function noteAt(f: number): NoteState {
  const blink = Math.floor(f / 15) % 2 === 0;
  if (f < T.clickAt) return { text: READY };
  if (f < T.selectAt) return { text: READY, focused: true, caret: blink };
  if (f < T.typeAt) return { text: READY, focused: true, selected: true };
  if (f < T.reselectAt)
    return { text: typed(RECEIVED, f, T.typeAt, T.typeFpc), focused: true, caret: f < T.typeAt + RECEIVED.length * T.typeFpc || blink };
  if (f < T.retypeAt) return { text: RECEIVED, focused: true, selected: true };
  return { text: typed(READY, f, T.retypeAt, T.retypeFpc), focused: true, caret: f < T.retypeAt + READY.length * T.retypeFpc || blink };
}

/** 0:20–0:29 — Assist hands the note to the teammate; Danger interrupts it and it restores the note. */
export const BoardScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const f = useCurrentFrame();
  const p = COPY[lang].panel;
  const pos = cursor(f);
  const pressed = (f >= G1.openAt && f < G1.releaseAt) || (f >= G2.openAt && f < G2.releaseAt) ? 1 : 0;
  const status: Status =
    f < G1.releaseAt ? 'idle' : f < G2.releaseAt ? 'working' : f < T.retypeAt - 4 ? 'interrupted' : f < T.restoredAt ? 'working' : 'idle';
  const statusLabel = status === 'working' ? p.working : status === 'interrupted' ? p.interrupted : p.idle;
  const pulse =
    f >= G2.releaseAt
      ? keyframes(f - G2.releaseAt, [
          [0, 0],
          [4, 1],
          [12, 0.25],
          [17, 0.8],
          [30, 0],
        ])
      : 0;
  const scroll = SCROLL * progress(f, G2.releaseAt - 8, 14, smooth); // makes room as the Danger drag lands
  const { outP } = useSceneSwap(BOARD_SCENE_FRAMES);
  return (
    <AbsoluteFill>
      {TICKS.map((t) => (
        <Sfx key={t} at={t} src={sound(TICK_SOUND)} volume={0.5} />
      ))}
      <Wallpaper />
      <MenuBar app="LOLPingYourAI Test Board" menus={['Edit', 'View', 'Window', 'Help']} />
      <SceneWindow frames={BOARD_SCENE_FRAMES}>
        <BoardWindow note={noteAt(f)} />
      </SceneWindow>
      <TeammatePanel lang={lang} title={p.title} status={status} statusLabel={statusLabel} scroll={scroll} bodyOpacity={1 - outP}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Appear at={G1.releaseAt + 6}>
            <TurnHeader icon={texture('assist_me')} title={p.assist} meta={p.fromYou} lang={lang} />
          </Appear>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Appear at={G1.releaseAt + 10} dy={8}>
              <Chip k="signal" v="assist" />
            </Appear>
            <Appear at={G1.releaseAt + 15} dy={8}>
              <Chip k="mode" v="execute" />
            </Appear>
            <Appear at={G1.releaseAt + 20} dy={8}>
              <Chip k="window" v="LOLPingYourAI Test Board" />
            </Appear>
          </div>
          <Appear at={T.allInAt + 2}>
            <Reply lang={lang} label={p.reply} icon={texture('all_in')}>
              {p.allIn}
            </Reply>
          </Appear>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 4 }}>
            <Appear at={T.clickAt} dy={6}>
              <ToolLine name="click" arg="textarea “Practice note”" />
            </Appear>
            <Appear at={T.selectAt} dy={6}>
              <ToolLine name="key" arg="cmd+a" />
            </Appear>
            <Appear at={T.typeAt} dy={6}>
              <ToolLine name="type" arg={`“${RECEIVED}”`} />
            </Appear>
          </div>
          <Appear at={T.verifiedAt}>
            <StatusLine color={C.green} icon={Icons.check(C.green)} text={p.verified} lang={lang} />
          </Appear>
          <Appear at={G2.releaseAt + 4}>
            <TurnHeader icon={texture('pingwheel_retreatrender')} title={p.danger} meta={p.fromYou} lang={lang} accent="rgba(255,59,85,.5)" />
          </Appear>
          <Appear at={T.interruptAt}>
            <StatusLine color={C.red} icon={Icons.stop(C.red)} text={p.interruptedLine} lang={lang} />
          </Appear>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 4 }}>
            <Appear at={T.reselectAt} dy={6}>
              <ToolLine name="key" arg="cmd+a" />
            </Appear>
            <Appear at={T.retypeAt} dy={6}>
              <ToolLine name="type" arg={`“${READY}”`} />
            </Appear>
          </div>
          <Appear at={T.restoredAt}>
            <StatusLine color={C.green} icon={Icons.check(C.green)} text={p.restored} lang={lang} />
          </Appear>
        </div>
      </TeammatePanel>
      <Ping id="assist" at={G1.releaseAt} x={O1.x} y={O1.y} size={PING_SIZE} volume={0.6} />
      <Ping id="allin" at={T.allInAt} x={880} y={420} size={PING_SIZE} volume={0.6} tag={{ text: 'AI', color: AGENT_TAG_COLOR }} />
      <Ping id="danger" at={G2.releaseAt} x={O2.x} y={O2.y} size={PING_SIZE} volume={0.6} />
      <Wheel
        id="board1"
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
        id="board2"
        x={O2.x}
        y={O2.y}
        openAt={G2.openAt}
        releaseAt={G2.releaseAt}
        hot={(fr) => hotAt(G2, cursor, fr)}
        items={PING_WHEEL_ITEMS}
        centerLabel="PING"
        centerIcon={texture(HUB_TEXTURE)}
      />
      <Cursor x={pos.x} y={pos.y} pressed={pressed} opacity={progress(f, 2, 8)} />
      <AbsoluteFill
        style={{ pointerEvents: 'none', boxShadow: `inset 0 0 240px rgba(255,59,85,${0.6 * pulse})`, background: `rgba(255,59,85,${0.06 * pulse})` }}
      />
      <BottomShade />
      <KeyHud kind="option" downAt={G1.openAt - 6} upAt={G1.releaseAt + 2} mouseDownAt={G1.openAt} mouseUpAt={G1.releaseAt} style={HUD_POS} />
      <KeyHud kind="option" downAt={G2.openAt - 6} upAt={G2.releaseAt + 2} mouseDownAt={G2.openAt} mouseUpAt={G2.releaseAt} style={HUD_POS} />
    </AbsoluteFill>
  );
};
