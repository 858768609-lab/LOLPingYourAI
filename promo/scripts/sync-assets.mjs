#!/usr/bin/env node
// Copies the repo assets the promo actually uses into promo/public/ (gitignored), so the Riot-owned textures,
// sounds and emotes are never duplicated in git. Safe to run repeatedly: unchanged files are skipped.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const promoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = resolve(promoDir, '..');
const publicDir = join(promoDir, 'public');

// Keep in sync with src/data/pings.ts and src/data/emotes.ts.
const TEXTURES = [
  // default wheel slice icons (N, then clockwise) + the hub
  'pingwheel_retreatrender',
  'push',
  'omw',
  'all_in',
  'assist_me',
  'need_vision',
  'enemy_missing',
  'enemy_vision',
  'generic_ping',
  // art drawn at the ping location
  'pingwheel_pushrender',
  'pingwheel_allin_render_01',
  'pingwheel_allin_render_02',
  'pingwheel_enemyvisionrender',
  'pingwheel_baitrender',
];
const SOUNDS = ['SRP_12', 'SRP_9', 'OnMyWay', 'SRP_4', 'ComeHere', 'SRP_7', 'MIA', 'AreaIsWarded', 'SRP_11', 'button', 'Click'];
const EMOTE_STILLS = ['nice', 'facepalm', 'gg_heart', 'unworthy', 'teamwork', 'think_about_it', 'okay', 'wahaha'];
const EMOTE_ANIMATED = ['facepalm'];

const jobs = [
  ...TEXTURES.map((n) => [`assets/textures/${n}.png`, `textures/${n}.png`]),
  ...SOUNDS.map((n) => [`assets/sounds/${n}.wav`, `sounds/${n}.wav`]),
  ...EMOTE_STILLS.map((n) => [`assets/emotes/${n}.png`, `emotes/${n}.png`]),
  ...EMOTE_ANIMATED.flatMap((n) => [
    [`assets/emotes/${n}.webp`, `emotes/${n}.webp`],
    [`assets/emotes/${n}.ogg`, `emotes/${n}.ogg`],
  ]),
  ['build/icon.png', 'icon.png'],
];

let copied = 0;
let missing = 0;
for (const [from, to] of jobs) {
  const src = join(repoDir, from);
  const dst = join(publicDir, to);
  if (!existsSync(src)) {
    console.error(`missing asset: ${from}`);
    missing++;
    continue;
  }
  const s = statSync(src);
  if (existsSync(dst)) {
    const d = statSync(dst);
    if (d.size === s.size && d.mtimeMs >= s.mtimeMs) continue;
  }
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  copied++;
}
console.log(`sync-assets: ${copied} copied, ${jobs.length - copied - missing} up to date${missing ? `, ${missing} missing` : ''}`);
if (missing) process.exit(1);
