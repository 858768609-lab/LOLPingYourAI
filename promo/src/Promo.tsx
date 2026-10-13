import { fade } from '@remotion/transitions/fade';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import React, { useState } from 'react';
import { AbsoluteFill } from 'remotion';
import { Caption } from './components/Caption';
import { COPY, type Lang } from './copy';
import { ensureZhFonts } from './fonts';
import { BoardScene } from './scenes/BoardScene';
import { ColdOpen } from './scenes/ColdOpen';
import { EmoteScene } from './scenes/EmoteScene';
import { Outro } from './scenes/Outro';
import { PaperScene } from './scenes/PaperScene';
import { WardScene } from './scenes/WardScene';
import { SCENES, START, TRANSITION, type SceneKey } from './timeline';

export type PromoProps = { lang: Lang };

const SCENE: Record<SceneKey, React.FC<{ lang: Lang }>> = {
  cold: ColdOpen,
  paper: PaperScene,
  board: BoardScene,
  ward: WardScene,
  emote: EmoteScene,
  outro: Outro,
};

/** The full 1920×1080 promo: cold open, five desktop beats, outro. Captions sit above the scene cross-fades. */
export const Promo: React.FC<PromoProps> = ({ lang }) => {
  useState(() => (lang === 'zh' ? ensureZhFonts() : undefined));
  const c = COPY[lang];
  const k = c.kicker;
  return (
    <AbsoluteFill style={{ background: '#050b17' }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const Scene = SCENE[s.key];
          const seq = (
            <TransitionSeries.Sequence key={s.key} durationInFrames={s.frames} name={s.key}>
              <Scene lang={lang} />
            </TransitionSeries.Sequence>
          );
          return i > 0 && s.fadeIn
            ? [<TransitionSeries.Transition key={`t-${s.key}`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />, seq]
            : [seq];
        })}
      </TransitionSeries>
      <Caption lang={lang} kicker={`01 · ${k.ping}`} text={c.caption.gesture} from={START.paper + 16} to={START.paper + 152} />
      <Caption lang={lang} kicker={`02 · ${k.context}`} text={c.caption.context} from={START.paper + 162} to={START.paper + 296} />
      <Caption lang={lang} kicker={`02 · ${k.context}`} text={c.caption.pingBack} from={START.paper + 300} to={START.paper + 446} />
      <Caption lang={lang} kicker={`03 · ${k.act}`} text={c.caption.act} from={START.board + 14} to={START.board + 280} />
      <Caption lang={lang} kicker={`04 · ${k.ward}`} text={c.caption.ward} from={START.ward + 12} to={START.ward + 196} />
      <Caption lang={lang} kicker={`05 · ${k.emote}`} text={c.caption.emote} from={START.emote + 12} to={START.emote + 166} />
    </AbsoluteFill>
  );
};
