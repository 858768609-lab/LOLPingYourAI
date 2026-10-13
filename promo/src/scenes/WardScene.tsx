import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Cursor } from '../components/Cursor';
import { SceneWindow, useSceneSwap } from '../components/SceneWindow';
import { MenuBar, Wallpaper } from '../components/Desktop';
import { KeyHud } from '../components/KeyHud';
import { Appear, Chip, Icons, Reply, StatusLine, Stream, TeammatePanel, TurnHeader, type Status } from '../components/Panel';
import { Ping } from '../components/Ping';
import { Sfx } from '../components/Sfx';
import { TimeLapse } from '../components/TimeLapse';
import { Wheel } from '../components/Wheel';
import { COPY, type Lang } from '../copy';
import { HUB_TEXTURE, sound, texture, TICK_SOUND } from '../data/pings';
import { bodyFont } from '../fonts';
import { easeInOut, keyframes, outBack, progress } from '../lib/anim';
import { hotAt, released, tickFrames, track, type WheelGesture } from '../lib/gesture';
import { AGENT_TAG_COLOR, C } from '../theme';
import { TEST_FILES, TERMINAL, TerminalWindow, terminalProgressPoint } from '../windows/TerminalWindow';
import { BottomShade, HUD_POS, PING_SIZE, PING_WHEEL_ITEMS } from './shared';

export const WARD_SCENE_FRAMES = 215;

const O = terminalProgressPoint(TERMINAL);
const G: WheelGesture = { origin: O, openAt: 42, releaseAt: 70 };
export const WARD_CURSOR_START = { x: 764, y: 278 }; // where the board scene's Danger drag ended
const cursor = track(WARD_CURSOR_START, [
  { from: 4, to: 34, points: [WARD_CURSOR_START, { x: 600, y: 420 }, O] },
  { from: 46, to: 62, points: [O, { x: O.x - 112, y: O.y + 104 }] },
  {
    from: 84,
    to: 104,
    points: [
      { x: O.x - 112, y: O.y + 104 },
      { x: 1080, y: 760 },
    ],
  },
]);
const TICKS = tickFrames(G, cursor);
if (released(G, cursor) !== 5) throw new Error('gesture should release on SW (Need Vision)');

const T = { placedAt: 92, lapseAt: 104, lapseDur: 36, backAt: 146, followAt: 150, streamAt: 156 };

/** 0:29–0:35 — ward a long test run; the teammate comes back once, 30 minutes later. */
export const WardScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const f = useCurrentFrame();
  const p = COPY[lang].panel;
  const pos = cursor(f);
  const pressed = f >= G.openAt && f < G.releaseAt ? 1 : 0;
  // 12 files done at the start, creeping on; the time-lapse fast-forwards the rest.
  const files = keyframes(
    f,
    [
      [0, 12],
      [T.lapseAt, 17],
      [T.lapseAt + T.lapseDur, TEST_FILES],
    ],
    easeInOut,
  );
  const done = f >= T.lapseAt + T.lapseDur;
  const lapseBlur = Math.sin(Math.PI * Math.max(0, Math.min(1, (f - T.lapseAt) / T.lapseDur))) * 3;
  const status: Status = f < G.releaseAt ? 'idle' : f < T.placedAt + 4 ? 'working' : f < T.backAt ? 'idle' : f < T.streamAt + 70 ? 'working' : 'idle';
  const chipIn = progress(f, T.placedAt, 14, outBack) * (1 - progress(f, T.lapseAt - 10, 10));
  const { outP } = useSceneSwap(WARD_SCENE_FRAMES);
  return (
    <AbsoluteFill>
      {TICKS.map((t) => (
        <Sfx key={t} at={t} src={sound(TICK_SOUND)} volume={0.5} />
      ))}
      <Wallpaper />
      <MenuBar app="Terminal" menus={['Shell', 'Edit', 'View', 'Window', 'Help']} />
      <SceneWindow frames={WARD_SCENE_FRAMES}>
        <div style={{ position: 'absolute', inset: 0, filter: lapseBlur > 0.05 ? `blur(${lapseBlur}px)` : undefined }}>
          <TerminalWindow filesDone={files} done={done} tick={f} />
        </div>
      </SceneWindow>
      <TeammatePanel lang={lang} title={p.title} status={status} statusLabel={status === 'working' ? p.working : p.idle} bodyOpacity={1 - outP}>
        <Appear at={G.releaseAt + 4}>
          <TurnHeader icon={texture('need_vision')} title={p.ward} meta={p.fromYou} lang={lang} />
        </Appear>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Appear at={G.releaseAt + 8} dy={8}>
            <Chip k="signal" v="ward" />
          </Appear>
          <Appear at={G.releaseAt + 13} dy={8}>
            <Chip k="mode" v="ward" />
          </Appear>
          <Appear at={G.releaseAt + 18} dy={8}>
            <Chip k="window" v="Terminal — pnpm test" />
          </Appear>
        </div>
        <Appear at={T.placedAt}>
          <StatusLine color={C.teal} icon={Icons.eye(C.teal)} text={p.wardPlaced} lang={lang} />
        </Appear>
        <Appear at={T.followAt}>
          <TurnHeader icon={texture('need_vision')} title={p.followUp} meta="Codex" lang={lang} accent="rgba(86,212,60,.5)" />
        </Appear>
        <Appear at={T.followAt + 4}>
          <Reply lang={lang} label={p.reply} icon={texture('need_vision')}>
            <Stream text={p.followUpText} at={T.streamAt} cps={lang === 'zh' ? 24 : 55} />
          </Reply>
        </Appear>
      </TeammatePanel>
      <Ping id="needvision" at={G.releaseAt} x={O.x} y={O.y} size={PING_SIZE} volume={0.6} />
      {chipIn > 0 && (
        <div
          style={{
            position: 'absolute',
            left: O.x + 90,
            top: O.y - 120,
            transform: `scale(${chipIn})`,
            transformOrigin: 'left center',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 16px',
            borderRadius: 10,
            background: 'rgba(8,16,26,.92)',
            border: `1px solid ${C.teal}88`,
            boxShadow: `0 10px 30px rgba(0,0,0,.5), 0 0 18px ${C.teal}44`,
            color: C.text,
            font: `600 20px ${bodyFont(lang)}`,
            whiteSpace: 'nowrap',
          }}
        >
          {Icons.eye(C.teal)}
          {p.wardPlaced}
        </div>
      )}
      <TimeLapse
        at={T.lapseAt}
        dur={T.lapseDur}
        x={TERMINAL.x + TERMINAL.w / 2}
        y={TERMINAL.y + TERMINAL.h / 2 - 20}
        label={COPY[lang].wardBack}
        labelFont={bodyFont(lang)}
      />
      <Ping id="needvision" at={T.backAt} x={O.x} y={O.y} size={PING_SIZE} volume={0.5} tag={{ text: 'AI', color: AGENT_TAG_COLOR }} />
      <Wheel
        id="ward"
        x={O.x}
        y={O.y}
        openAt={G.openAt}
        releaseAt={G.releaseAt}
        hot={(fr) => hotAt(G, cursor, fr)}
        items={PING_WHEEL_ITEMS}
        centerLabel="PING"
        centerIcon={texture(HUB_TEXTURE)}
      />
      <Cursor x={pos.x} y={pos.y} pressed={pressed} opacity={1 - progress(f, T.lapseAt - 6, 6) + progress(f, T.lapseAt + T.lapseDur + 6, 8)} />
      <BottomShade />
      <KeyHud kind="option" downAt={G.openAt - 6} upAt={G.releaseAt + 2} mouseDownAt={G.openAt} mouseUpAt={G.releaseAt} style={HUD_POS} />
    </AbsoluteFill>
  );
};
