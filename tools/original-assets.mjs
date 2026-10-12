import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const colors = ['#ff6f7d', '#74d9ae', '#67adff', '#f0c46b', '#78d6ca', '#a4d986', '#f4cf69', '#c0a0ed'];
const source = await readFile('src/shared/pings.ts', 'utf8');
const defs = [...source.matchAll(/\{ id: '([^']+)', name: '[^']+', icon: '([^']+)', art: \[([^\]]+)\], sound: '([^']+)', color: '([^']+)' \}/g)];
const shapes = {
  missing: '<path d="M46 42C48 20 89 20 88 47C87 63 64 61 64 78"/><circle cx="64" cy="99" r="5" fill="currentColor" stroke="none"/>',
  danger: '<path d="M64 18L113 105H15Z"/><path d="M64 47V70"/><circle cx="64" cy="88" r="4" fill="currentColor" stroke="none"/>',
  assist: '<path d="M38 108V22M41 24H96L82 45L96 65H41"/>',
  omw: '<path d="M22 102L103 22M60 22H103V65"/>',
  allin: '<path d="M25 25L101 101M103 25L25 103M18 80L47 109M79 18L110 48"/>',
  needvision: '<path d="M16 65Q64 9 112 65Q64 119 16 65Z"/><circle cx="64" cy="65" r="17"/>',
  enemyvision: '<path d="M16 65Q64 9 112 65Q64 119 16 65Z"/><path d="M29 102L102 25"/>',
  visioncleared: '<path d="M20 66L50 94L108 30"/>',
  push: '<path d="M20 64H108M79 33L110 64L79 95M32 37V91"/>',
  retreat: '<rect x="32" y="23" width="20" height="82" rx="5"/><rect x="76" y="23" width="20" height="82" rx="5"/>',
  like: '<path d="M23 60H43V105H23ZM45 62L69 22Q84 17 80 37L75 52H102Q111 53 107 70L98 100H45"/>',
  celebrate: '<path d="M63 16L76 48L111 51L84 74L91 109L63 91L33 109L40 74L13 51L49 48Z"/>',
  bait: '<path d="M27 35L48 42M80 42L102 35M34 79Q65 106 96 72"/><circle cx="46" cy="56" r="4"/><circle cx="82" cy="56" r="4"/>',
  generic: '<path d="M64 15L108 64L64 113L20 64Z"/><circle cx="64" cy="64" r="10"/>',
};
function svg(shape, color) { return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 128 128"><g color="${color}" stroke="${color}" fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`; }
for (const dir of ['assets/textures', 'assets/sounds', 'assets/emotes', 'assets/source', 'build']) await mkdir(dir, { recursive: true });
for (const d of defs) {
  const [, id, icon, arts, , color] = d, image = svg(shapes[id] ?? shapes.generic, color);
  await writeFile(`assets/source/${id}.svg`, image);
  for (const name of new Set([icon, ...[...arts.matchAll(/'([^']+)'/g)].map(m => m[1])])) await sharp(Buffer.from(image)).png().toFile(`assets/textures/${name}.png`);
}
const emotes = ['facepalm', 'unworthy_cn', 'retreat', 'like', 'celebrate', 'thinking', 'coffee', 'gg_heart', 'wave'];
for (let i = 0; i < emotes.length; i++) {
  const name = emotes[i], shape = shapes[name] ?? (name === 'unworthy_cn' ? shapes.bait : name === 'thinking' ? shapes.missing : shapes.generic);
  const s = svg(`<rect x="5" y="5" width="118" height="118" rx="30" fill="#202b3e" stroke-width="2"/>${shape}`, colors[i % colors.length]);
  await writeFile(`assets/source/emote-${name}.svg`, s);
  await sharp(Buffer.from(s)).png().toFile(`assets/emotes/${name}.png`);
  await sharp(Buffer.from(s)).webp().toFile(`assets/emotes/${name}.webp`);
}
const sounds = new Set(defs.map(d => d[4])); sounds.add('button');
let i = 0;
for (const name of sounds) {
  const rate = 22050, count = Math.round(rate * (name === 'button' ? .04 : .18)), buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(36 + count * 2, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(count * 2, 40);
  const frequency = 390 + i++ * 55;
  for (let n = 0; n < count; n++) buffer.writeInt16LE(Math.round(5500 * Math.sin(2 * Math.PI * frequency * n / rate) * Math.sin(Math.PI * n / count) * Math.exp(-3 * n / count)), 44 + n * 2);
  await writeFile(`assets/sounds/${name}.wav`, buffer);
}
const mark = svg(shapes.generic, '#5ccebd');
await sharp(Buffer.from(mark)).resize(512, 512).png().toFile('build/icon.png');
for (const [file, size] of [['trayTemplate.png', 18], ['trayTemplate@2x.png', 36], ['trayOffTemplate.png', 18], ['trayOffTemplate@2x.png', 36]]) await sharp(Buffer.from(svg(shapes.generic, '#000000'))).resize(size, size).png().toFile(`build/${file}`);
const png = await sharp(Buffer.from(mark)).resize(256, 256).png().toBuffer();
const header = Buffer.alloc(22); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4); header[6] = 0; header[7] = 0; header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18); await writeFile('build/icon.ico', Buffer.concat([header, png]));
console.log('Original SVG, PNG, WebP and synthesized sound assets generated.');
