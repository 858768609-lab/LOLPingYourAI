import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Camera, inFrame, overflowPx } from '../components/Camera';
import { Cursor } from '../components/Cursor';
import { SceneWindow } from '../components/SceneWindow';
import { MENU_BAR_RECT, MenuBar, Wallpaper } from '../components/Desktop';
import { Emote } from '../components/Emote';
import { KeyHud } from '../components/KeyHud';
import { Appear, Chip, PANEL, Reply, TeammatePanel, TurnHeader, type Status } from '../components/Panel';
import { Ping } from '../components/Ping';
import { Sfx } from '../components/Sfx';
import { Wheel } from '../components/Wheel';
import { COPY, type Lang } from '../copy';
import { EMOTE_HUB, emoteStill } from '../data/emotes';
import { sound, texture, TICK_SOUND } from '../data/pings';
import { bodyFont } from '../fonts';
import { easeInOut, lerp, progress, smooth } from '../lib/anim';
import { hotAt, released, tickFrames, track, type WheelGesture } from '../lib/gesture';
import { AGENT_TAG_COLOR } from '../theme';
import { BoardWindow } from '../windows/BoardWindow';
import { BottomShade, EMOTE_WHEEL_ITEMS, HUD_POS, PING_SIZE } from './shared';

export const EMOTE_SCENE_FRAMES = 170;

const O = { x: 600, y: 410 };
const G: WheelGesture = { origin: O, openAt: 38, releaseAt: 64 };
const START = { x: 1080, y: 760 }; // where the ward scene's cursor rested
const cursor = track(START, [
  { from: 4, to: 32, points: [START, { x: 800, y: 600 }, O] },
  { from: 42, to: 56, points: [O, { x: O.x + 118, y: O.y - 112 }] },
  {
    from: 76,
    to: 100,
    points: [
      { x: O.x + 118, y: O.y - 112 },
      { x: 1040, y: 700 },
    ],
  },
]);
const TICKS = tickFrames(G, cursor);
if (released(G, cursor) !== 1) throw new Error('gesture should release on NE (facepalm)');

// The panel steps aside while the camera pushes in (so no edge ever cuts it) and returns for the reply.
const T = { panelOutAt: 0, zoomInAt: 12, zoomOutAt: 82, panelInAt: 104, baitAt: 108 };
const BAIT = { x: O.x + 270, y: O.y - 12 };

/** 0:35–0:40 — ⌃ + drag opens the emote wheel; a facepalm gets a cheeky Bait ping back. */
export const EmoteScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = COPY[lang].panel;
  const pos = cursor(f);
  const pressed = f >= G.openAt && f < G.releaseAt ? 1 : 0;
  const status: Status = f < G.releaseAt ? 'idle' : f < T.baitAt + 10 ? 'working' : 'idle';
  // push in on the emote wheel, then pull back for the reply
  const zoom = progress(f, T.zoomInAt, 26, smooth) - progress(f, T.zoomOutAt, 26, smooth);
  const cam = { cx: lerp(960, 740, zoom), cy: lerp(540, 480, zoom), z: lerp(1, 1.25, zoom) };
  const frame = { width, height };
  const panelO = Math.min(
    1 - progress(f, T.panelOutAt, 10, easeInOut) + progress(f, T.panelInAt, 10, easeInOut),
    inFrame(overflowPx(cam, PANEL, frame), 4),
  );
  const menuO = inFrame(overflowPx(cam, MENU_BAR_RECT, frame), 10);
  return (
    <AbsoluteFill>
      {TICKS.map((t) => (
        <Sfx key={t} at={t} src={sound(TICK_SOUND)} volume={0.5} />
      ))}
      <Camera {...cam}>
        <Wallpaper />
        <MenuBar app="LOLPingYourAI Test Board" menus={['Edit', 'View', 'Window', 'Help']} opacity={menuO} />
        <SceneWindow frames={EMOTE_SCENE_FRAMES} exit={false}>
          <BoardWindow note={{ text: 'Ready for a ping.' }} />
        </SceneWindow>
        <div style={{ position: 'absolute', inset: 0, opacity: panelO }}>
          <TeammatePanel lang={lang} title={p.title} status={status} statusLabel={status === 'working' ? p.working : p.idle}>
            <Appear at={G.releaseAt + 6}>
              <TurnHeader icon={emoteStill('facepalm')} round title={p.emote} meta={p.fromYou} lang={lang} />
            </Appear>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Appear at={G.releaseAt + 10} dy={8}>
                <Chip k="signal" v="reaction" />
              </Appear>
              <Appear at={G.releaseAt + 15} dy={8}>
                <Chip k="mode" v="emotion" />
              </Appear>
              <Appear at={G.releaseAt + 20} dy={8}>
                <Chip k="emote" v="facepalm" />
              </Appear>
            </div>
            <Appear at={T.baitAt + 4}>
              <Reply lang={lang} label={p.reply} icon={texture('pingwheel_baitrender')}>
                <span style={{ fontSize: 30, fontWeight: 700 }}>{p.talkBack}</span>
              </Reply>
            </Appear>
          </TeammatePanel>
        </div>
        <Emote slug="facepalm" at={G.releaseAt} x={O.x} y={O.y} size={190} />
        <Ping
          id="bait"
          at={T.baitAt}
          x={BAIT.x}
          y={BAIT.y}
          size={PING_SIZE}
          volume={0.55}
          tag={{ text: p.talkBack, color: AGENT_TAG_COLOR }}
          tagFont={bodyFont(lang)}
        />
        <Wheel
          id="emote"
          emote
          x={O.x}
          y={O.y}
          openAt={G.openAt}
          releaseAt={G.releaseAt}
          hot={(fr) => hotAt(G, cursor, fr)}
          items={EMOTE_WHEEL_ITEMS}
          centerLabel="EMOTE"
          centerIcon={emoteStill(EMOTE_HUB)}
        />
        <Cursor x={pos.x} y={pos.y} pressed={pressed} />
      </Camera>
      <BottomShade />
      <KeyHud kind="control" downAt={G.openAt - 6} upAt={G.releaseAt + 2} mouseDownAt={G.openAt} mouseUpAt={G.releaseAt} style={HUD_POS} />
    </AbsoluteFill>
  );
};
