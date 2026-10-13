/**
 * Promo scene lengths (frames at 30 fps). The cold open and the outro cross-fade into the desktop (`fadeIn`); desktop
 * scenes cut to each other while their windows switch (see SceneWindow). Captions use the computed starts.
 */
export const TRANSITION = 14;

export const SCENES = [
  { key: 'cold', frames: 150, fadeIn: false },
  { key: 'paper', frames: 450, fadeIn: true },
  { key: 'board', frames: 285, fadeIn: false },
  { key: 'ward', frames: 215, fadeIn: false },
  { key: 'emote', frames: 170, fadeIn: false },
  { key: 'outro', frames: 165, fadeIn: true },
] as const;

export type SceneKey = (typeof SCENES)[number]['key'];

/** First frame of each scene in the whole Promo (scenes overlap by TRANSITION). */
export const START: Record<SceneKey, number> = (() => {
  const out = {} as Record<SceneKey, number>;
  let t = 0;
  for (const s of SCENES) {
    if (s.fadeIn) t -= TRANSITION;
    out[s.key] = t;
    t += s.frames;
  }
  return out;
})();

export const PROMO_FRAMES = SCENES.reduce((n, s) => n + s.frames - (s.fadeIn ? TRANSITION : 0), 0);
