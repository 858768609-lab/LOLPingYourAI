import { staticFile } from 'remotion';

/** Emote wheel shown in the promo, top (N) then clockwise. */
export const PROMO_EMOTE_WHEEL = ['nice', 'facepalm', 'gg_heart', 'unworthy', 'teamwork', 'think_about_it', 'okay', 'wahaha'] as const;
/** The emote the app puts in the emote wheel's hub (DEFAULT_CLICK_EMOTE). */
export const EMOTE_HUB = 'facepalm';

export const emoteStill = (slug: string): string => staticFile(`emotes/${slug}.png`);
export const emoteAnim = (slug: string): string => staticFile(`emotes/${slug}.webp`);
export const emoteSound = (slug: string): string => staticFile(`emotes/${slug}.ogg`);
/** Bundled emotes stay on screen this long (EMOTE_DURATION_S). */
export const EMOTE_DURATION_S = 3;
