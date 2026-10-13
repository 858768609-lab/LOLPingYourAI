import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Camera, inFrame, overflowPx } from '../components/Camera';
import { CaptureSquare, Flash, FlyingSnapshot, SnapshotContent } from '../components/Capture';
import { Cursor } from '../components/Cursor';
import { SceneWindow, useSceneSwap } from '../components/SceneWindow';
import { MENU_BAR_RECT, MenuBar, Wallpaper } from '../components/Desktop';
import { KeyHud } from '../components/KeyHud';
import { Appear, Chip, PANEL, PANEL_HEADER, PANEL_PAD, Reply, Stream, TeammatePanel, TURN_H, TurnHeader } from '../components/Panel';
import { Ping } from '../components/Ping';
import { Sfx } from '../components/Sfx';
import { Wheel } from '../components/Wheel';
import { COPY, type Lang } from '../copy';
import { HUB_TEXTURE, sound, texture, TICK_SOUND } from '../data/pings';
import { lerp, progress, smooth } from '../lib/anim';
import { hotAt, released, tickFrames, track, type WheelGesture } from '../lib/gesture';
import { AGENT_TAG_COLOR } from '../theme';
import { equationPoint, PaperWindow, type Rect } from '../windows/PaperWindow';
import { BottomShade, HUD_POS, PING_SIZE, PING_WHEEL_ITEMS } from './shared';

export const PAPER_SCENE_FRAMES = 450;

const O = equationPoint();
const G: WheelGesture = { origin: O, openAt: 56, releaseAt: 122 };
const cursor = track({ x: 1180, y: 770 }, [
  { from: 10, to: 48, points: [{ x: 1180, y: 770 }, { x: O.x + 120, y: O.y + 140 }, O] },
  { from: 62, to: 106, points: [O, { x: O.x - 20, y: O.y + 125 }, { x: O.x - 105, y: O.y + 105 }, { x: O.x - 165, y: O.y + 15 }] },
  {
    from: 140,
    to: 176,
    points: [
      { x: O.x - 165, y: O.y + 15 },
      { x: O.x - 330, y: O.y + 260 },
    ],
  },
]);
const TICKS = tickFrames(G, cursor);
if (released(G, cursor) !== 6) throw new Error('gesture should release on W (Enemy Missing)');

const SQUARE: Rect = { x: O.x - 256, y: O.y - 256, w: 512, h: 512 };
const THUMB = 200;
const SLOT: Rect = { x: PANEL.x + PANEL_PAD + 1, y: PANEL.y + PANEL_HEADER + PANEL_PAD + TURN_H + 16 + 1, w: THUMB, h: THUMB };

export const T_PAPER = {
  squareAt: 168,
  flashAt: 192,
  panelAt: 196,
  flyAt: 204,
  flyDur: 26,
  chips: [238, 248, 258, 268],
  replyPingAt: 300,
  replyAt: 306,
  streamAt: 314,
} as const;

/** 0:05–0:20 — point at an equation, hold ⌥ and drag to "?"; the square, window and meaning go to the teammate. */
export const PaperScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = COPY[lang].panel;
  const T = T_PAPER;
  const pos = cursor(f);
  const pressed = f >= G.openAt && f < G.releaseAt ? 1 : 0;
  const zoomOut = progress(f, 150, 30, smooth);
  const cam = { cx: lerp(630, 960, zoomOut), cy: lerp(482, 540, zoomOut), z: lerp(1.2, 1, zoomOut) };
  // the menu bar only shows once the camera has pulled back far enough that no edge cuts it
  const menuO = inFrame(overflowPx(cam, MENU_BAR_RECT, { width, height }), 10);
  const cursorFade = 1 - progress(f, 178, 10);
  const status = f < T.replyAt + 80 ? 'working' : 'idle';
  const { outP } = useSceneSwap(PAPER_SCENE_FRAMES);
  return (
    <AbsoluteFill>
      {TICKS.map((t) => (
        <Sfx key={t} at={t} src={sound(TICK_SOUND)} volume={0.5} />
      ))}
      <Sfx at={T.flashAt} src={sound('Click')} volume={0.55} />
      <Camera {...cam}>
        <Wallpaper />
        <MenuBar app="Preview" menus={['File', 'Edit', 'View', 'Go', 'Tools', 'Window', 'Help']} opacity={menuO} />
        <SceneWindow frames={PAPER_SCENE_FRAMES} enter={false}>
          <PaperWindow />
        </SceneWindow>
        <CaptureSquare rect={SQUARE} at={T.squareAt} outAt={T.flyAt + T.flyDur + 18} />
        <Flash rect={SQUARE} at={T.flashAt} />
        <TeammatePanel
          lang={lang}
          title={p.title}
          status={status}
          statusLabel={status === 'working' ? p.working : p.idle}
          enterAt={T.panelAt}
          bodyOpacity={1 - outP}
        >
          <Appear at={T.panelAt + 14}>
            <TurnHeader icon={texture('enemy_missing')} title={p.question} meta={p.fromYou} lang={lang} />
          </Appear>
          <div style={{ display: 'flex', gap: 16, height: THUMB }}>
            <div style={{ width: THUMB, height: THUMB, flexShrink: 0, position: 'relative' }}>
              {f >= T.flyAt + T.flyDur && (
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 10, border: '2px solid #c8aa6e' }}>
                  <SnapshotContent from={SQUARE} k={THUMB / 512}>
                    <PaperWindow />
                  </SnapshotContent>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
              <Appear at={T.chips[0]} dy={8}>
                <Chip k="signal" v="question" />
              </Appear>
              <Appear at={T.chips[1]} dy={8}>
                <Chip k="mode" v="observe" />
              </Appear>
              <Appear at={T.chips[2]} dy={8}>
                <Chip k="window" v="Preview — attention.pdf" />
              </Appear>
              <Appear at={T.chips[3]} dy={8}>
                <Chip k="region" v="512×512 @2x" />
              </Appear>
            </div>
          </div>
          <Appear at={T.replyAt}>
            <Reply lang={lang} label={p.reply} icon={texture('omw')}>
              <Stream text={p.answer} at={T.streamAt} cps={lang === 'zh' ? 18 : 42} />
            </Reply>
          </Appear>
        </TeammatePanel>
        <FlyingSnapshot from={SQUARE} to={SLOT} at={T.flyAt} dur={T.flyDur}>
          <PaperWindow />
        </FlyingSnapshot>
        <Ping id="missing" at={G.releaseAt} x={O.x} y={O.y} size={PING_SIZE} volume={0.7} />
        <Ping id="omw" at={T.replyPingAt} x={O.x} y={O.y} size={PING_SIZE} volume={0.6} tag={{ text: 'AI', color: AGENT_TAG_COLOR }} />
        <Wheel
          id="paper"
          x={O.x}
          y={O.y}
          openAt={G.openAt}
          releaseAt={G.releaseAt}
          hot={(fr) => hotAt(G, cursor, fr)}
          items={PING_WHEEL_ITEMS}
          centerLabel="PING"
          centerIcon={texture(HUB_TEXTURE)}
        />
        <Cursor x={pos.x} y={pos.y} pressed={pressed} opacity={cursorFade} />
      </Camera>
      <BottomShade />
      <KeyHud kind="option" downAt={G.openAt - 6} upAt={G.releaseAt + 2} mouseDownAt={G.openAt} mouseUpAt={G.releaseAt} style={HUD_POS} />
    </AbsoluteFill>
  );
};
