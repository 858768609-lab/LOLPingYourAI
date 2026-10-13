# LOLPingYourAI promo

Remotion source for the promo video, the README GIF and the social images in `../docs/media/`.
It is a standalone package; the app's own build never touches it.

| Composition | Size | Output |
| --- | --- | --- |
| `Promo` (`lang: 'en' \| 'zh'`) | 1920×1080, 30 fps, ~47 s, with sound | `promo-en.mp4`, `promo-zh.mp4` |
| `Hero` | 1280×720, 30 fps, 12 s loop, silent | `hero.mp4`, `hero.gif` (960 px, 15 fps) |
| `Social` (still) | 1280×640 | `social-preview.png` |
| `Poster` (still) | 1920×1080 | `poster.png` |

## Setup

Node 22+ and ffmpeg (for the GIF) on `PATH`.

```sh
cd promo
npx -y pnpm@10 install --frozen-lockfile
npm run sync-assets   # copies the used textures, sounds, emotes and the app icon into public/
```

`public/` and `out/` are gitignored: `sync-assets` copies the League of Legends assets from `../assets` instead of
duplicating them in git. `npm start` and `npm run render` run it automatically.
Fonts (Cinzel, Inter, JetBrains Mono, STIX Two Text, Noto Sans SC) load from Google Fonts at render time, so rendering
needs network access. Chinese renders load only the Noto Sans SC slices the Chinese copy needs.

## Preview and render

```sh
npm start                          # Remotion Studio
npm run render                     # everything into ../docs/media/
npm run render -- promo-en         # or: promo-zh, hero, stills
```

The individual commands `render` runs:

```sh
npx remotion render src/index.ts Promo ../docs/media/promo-en.mp4 --props='{"lang":"en"}' \
  --codec=h264 --crf=22 --pixel-format=yuv420p --color-space=bt709 --audio-codec=aac --audio-bitrate=160k --x264-preset=slow
npx remotion render src/index.ts Promo ../docs/media/promo-zh.mp4 --props='{"lang":"zh"}' (same flags)
npx remotion render src/index.ts Hero out/hero-master.mp4 --codec=h264 --crf=14 --pixel-format=yuv420p --color-space=bt709 --muted
ffmpeg -i out/hero-master.mp4 -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart -an ../docs/media/hero.mp4
ffmpeg -i out/hero-master.mp4 -filter_complex \
  "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" \
  -loop 0 ../docs/media/hero.gif
npx remotion still src/index.ts Social ../docs/media/social-preview.png
npx remotion still src/index.ts Poster ../docs/media/poster.png
```

For review, `node scripts/stills.mjs <Composition> <outDir> <frame,frame,...> ['{"lang":"zh"}']` renders many stills with
one bundle and one browser.

## Layout

- `src/copy.ts` — every on-screen string, English and Chinese.
- `src/theme.ts`, `src/fonts.ts`, `src/timeline.ts` — palette, fonts, scene lengths.
- `src/components/` — the ping wheel (`Wheel.tsx`, same geometry and gradients as `src/renderer/overlay/wheel.ts`), ping
  effects (`Ping.tsx`, a frame-driven port of `overlay.css`), emotes, cursor, keycap HUD, captions, desktop chrome, the
  teammate panel.
- `src/windows/` — the paper reader, the practice board (`tools/test-board.cjs`) and the terminal.
- `src/scenes/` — the Promo's scenes; `src/Hero.tsx` and `src/Stills.tsx` for the GIF and the images.

The story stays within what `docs/verification.md` records: question ping with a 512×512 capture, assist edit of the
test board, Danger interrupt and restore, a 30-minute ward follow-up, emote banter. The ward is time-lapsed.

## Attribution

Ping textures, sounds and emotes are League of Legends assets © Riot Games, bundled by upstream lolPing and excluded from
the MIT licence (see `../THIRD_PARTY_NOTICES.md`). Fan project, not endorsed by Riot Games, OpenAI or Anthropic; Codex
and Claude appear as plain text only. Only the repo's own WAV/OGG sounds are used; there is no music.
