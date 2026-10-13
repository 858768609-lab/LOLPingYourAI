import { staticFile } from 'remotion';

/** The subset of ALL_PINGS (src/shared/pings.ts) the promo shows. Keep textures/sounds in scripts/sync-assets.mjs. */
export type PingId = 'danger' | 'push' | 'omw' | 'allin' | 'assist' | 'needvision' | 'missing' | 'enemyvision' | 'bait';

export interface PingDef {
  id: PingId;
  name: string;
  /** Texture on the wheel slice. */
  icon: string;
  /** Textures drawn at the ping location. Two entries = All In's clashing halves. */
  art: string[];
  sound: string;
  color: string;
}

export const PINGS: Record<PingId, PingDef> = {
  danger: { id: 'danger', name: 'Danger', icon: 'pingwheel_retreatrender', art: ['pingwheel_retreatrender'], sound: 'SRP_12', color: '#ff3b55' },
  push: { id: 'push', name: 'Push', icon: 'push', art: ['pingwheel_pushrender'], sound: 'SRP_9', color: '#35d27a' },
  omw: { id: 'omw', name: 'On My Way', icon: 'omw', art: ['omw'], sound: 'OnMyWay', color: '#2e8bff' },
  allin: {
    id: 'allin',
    name: 'All In',
    icon: 'all_in',
    art: ['pingwheel_allin_render_01', 'pingwheel_allin_render_02'],
    sound: 'SRP_4',
    color: '#f2b320',
  },
  assist: { id: 'assist', name: 'Assist Me', icon: 'assist_me', art: ['assist_me'], sound: 'ComeHere', color: '#56d43c' },
  needvision: { id: 'needvision', name: 'Need Vision', icon: 'need_vision', art: ['need_vision'], sound: 'SRP_7', color: '#56d43c' },
  missing: { id: 'missing', name: 'Enemy Missing', icon: 'enemy_missing', art: ['enemy_missing'], sound: 'MIA', color: '#f2c518' },
  enemyvision: {
    id: 'enemyvision',
    name: 'Enemy Vision',
    icon: 'enemy_vision',
    art: ['pingwheel_enemyvisionrender'],
    sound: 'AreaIsWarded',
    color: '#ff3b55',
  },
  bait: { id: 'bait', name: 'Bait', icon: 'pingwheel_baitrender', art: ['pingwheel_baitrender'], sound: 'SRP_11', color: '#efbc12' },
};

/** The wheel as League ships it, top (N) then clockwise (DEFAULT_WHEEL). */
export const DEFAULT_WHEEL: readonly PingId[] = ['danger', 'push', 'omw', 'allin', 'assist', 'needvision', 'missing', 'enemyvision'];
export const SLOT = { N: 0, NE: 1, E: 2, SE: 3, S: 4, SW: 5, W: 6, NW: 7 } as const;

export const HUB_TEXTURE = 'generic_ping';
export const TICK_SOUND = 'button';

export const texture = (name: string): string => staticFile(`textures/${name}.png`);
export const sound = (name: string): string => staticFile(`sounds/${name}.wav`);
