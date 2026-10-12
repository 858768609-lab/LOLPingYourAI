import sharp from 'sharp';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

// Only explicitly named images and WAV files enter the local override folder.
// No remote downloads, code, archives, or symlinks are published with the repo.
export async function importAssetPack(source, destination, textures, sounds) {
  let count = 0;
  for (const [folder, names, ext] of [['textures', textures, 'png'], ['sounds', sounds, 'wav']]) {
    await mkdir(join(destination, folder), { recursive: true, mode: 0o700 });
    for (const name of names) {
      if (!/^[\w-]+$/.test(name)) throw new Error('Invalid asset name');
      let bytes; try { bytes = await readFile(join(source, folder, `${name}.${ext}`)); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
      if (bytes.length > 8 * 1024 * 1024) throw new Error('Asset exceeds 8 MB');
      if (ext === 'png') bytes = await sharp(bytes, { limitInputPixels: 4096 * 4096 }).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
      else if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Expected WAV audio');
      await writeFile(join(destination, folder, `${name}.${ext}`), bytes, { mode: 0o600 }); count++;
    }
  }
  if (!count) throw new Error('No recognized textures/*.png or sounds/*.wav found. See asset-pack documentation.');
  return { imported: count, restartRequired: true };
}
export async function clearAssetPack(destination) { await rm(destination, { recursive: true, force: true }); return { restartRequired: true }; }
