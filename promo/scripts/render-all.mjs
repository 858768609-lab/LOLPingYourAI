#!/usr/bin/env node
// Renders every deliverable into ../docs/media/ (masters go to out/, which is gitignored).
//   node scripts/render-all.mjs            all outputs
//   node scripts/render-all.mjs promo-en   one of: promo-en promo-zh hero stills
import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const promoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const media = resolve(promoDir, '../docs/media');
const out = join(promoDir, 'out');
mkdirSync(media, { recursive: true });
mkdirSync(out, { recursive: true });

function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: promoDir, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const remotion = (...args) => run('npx', ['remotion', ...args]);
const size = (p) => `${(statSync(p).size / 1024 / 1024).toFixed(2)} MB`;

const promo = (lang) =>
  remotion(
    'render',
    'src/index.ts',
    'Promo',
    join(media, `promo-${lang}.mp4`),
    `--props={"lang":"${lang}"}`,
    '--codec=h264',
    '--crf=22',
    '--pixel-format=yuv420p',
    '--audio-codec=aac',
    '--audio-bitrate=160k',
    '--x264-preset=slow',
    '--color-space=bt709',
  );

const jobs = {
  'promo-en': () => promo('en'),
  'promo-zh': () => promo('zh'),
  hero: () => {
    const master = join(out, 'hero-master.mp4');
    remotion('render', 'src/index.ts', 'Hero', master, '--codec=h264', '--crf=14', '--pixel-format=yuv420p', '--color-space=bt709', '--muted');
    run('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-i',
      master,
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '21',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-an',
      join(media, 'hero.mp4'),
    ]);
    run('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-i',
      master,
      '-filter_complex',
      'fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle',
      '-loop',
      '0',
      join(media, 'hero.gif'),
    ]);
  },
  stills: () => {
    remotion('still', 'src/index.ts', 'Social', join(media, 'social-preview.png'));
    remotion('still', 'src/index.ts', 'Poster', join(media, 'poster.png'));
  },
};

run('node', ['scripts/sync-assets.mjs']);
const pick = process.argv.slice(2);
for (const name of pick.length ? pick : Object.keys(jobs)) {
  if (!jobs[name]) {
    console.error(`unknown job ${name}; expected one of ${Object.keys(jobs).join(', ')}`);
    process.exit(2);
  }
  jobs[name]();
}
for (const f of ['promo-en.mp4', 'promo-zh.mp4', 'hero.mp4', 'hero.gif', 'social-preview.png', 'poster.png']) {
  try {
    console.log(`${f.padEnd(20)} ${size(join(media, f))}`);
  } catch {
    /* not rendered in this run */
  }
}
