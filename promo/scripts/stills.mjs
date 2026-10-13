#!/usr/bin/env node
// Review helper: renders many stills of one composition with a single bundle and browser.
//   node scripts/stills.mjs <CompositionId> <outDir> <frame,frame,...> [propsJson]
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const promoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [id, outDir, frameList, propsJson] = process.argv.slice(2);
if (!id || !outDir || !frameList) {
  console.error('usage: node scripts/stills.mjs <CompositionId> <outDir> <frame,frame,...> [propsJson]');
  process.exit(2);
}
const inputProps = propsJson ? JSON.parse(propsJson) : {};
const frames = frameList.split(',').map((s) => Number(s.trim()));
mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: join(promoDir, 'src/index.ts'), publicDir: join(promoDir, 'public') });
const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' } });
const composition = await selectComposition({ serveUrl, id, inputProps, puppeteerInstance: browser });
const tag = inputProps.lang ? `-${inputProps.lang}` : '';
for (const frame of frames) {
  const output = join(outDir, `${id.toLowerCase()}${tag}-${String(frame).padStart(4, '0')}.png`);
  await renderStill({ composition, serveUrl, frame, output, inputProps, puppeteerInstance: browser, imageFormat: 'png' });
  console.log(output);
}
await browser.close({ silent: true });
