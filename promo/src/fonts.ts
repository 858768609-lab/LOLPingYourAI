import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { getInfo as notoInfo, loadFont as loadNoto } from '@remotion/google-fonts/NotoSansSC';
import { loadFont as loadStix } from '@remotion/google-fonts/STIXTwoText';
import { allZhText, type Lang } from './copy';

const cinzel = loadCinzel('normal', { weights: ['600', '700', '800'], subsets: ['latin'] });
const inter = loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] });
const mono = loadMono('normal', { weights: ['400', '500', '700'], subsets: ['latin'] });
const stix = loadStix('normal', { weights: ['400', '600', '700'], subsets: ['latin'] });
loadStix('italic', { weights: ['400'], subsets: ['latin'] });

export const FONT = {
  display: `${cinzel.fontFamily}, serif`,
  body: `${inter.fontFamily}, -apple-system, sans-serif`,
  mono: `${mono.fontFamily}, Menlo, monospace`,
  serif: `${stix.fontFamily}, Georgia, serif`,
  zh: `"Noto Sans SC", ${inter.fontFamily}, sans-serif`,
} as const;

/** Display font for a title in this language (Chinese titles use Noto Sans SC too). */
export const displayFont = (lang: Lang): string => (lang === 'zh' ? FONT.zh : FONT.display);
/** Body font for running text in this language. */
export const bodyFont = (lang: Lang): string => (lang === 'zh' ? FONT.zh : FONT.body);

type Range = readonly [number, number];
const parseRanges = (spec: string): Range[] =>
  spec.split(',').map((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, '').split('-');
    return [parseInt(a, 16), parseInt(b ?? a, 16)] as const;
  });

type NotoSubset = NonNullable<NonNullable<Parameters<typeof loadNoto>[1]>['subsets']>[number];

let zhLoaded = false;
/**
 * Noto Sans SC ships as ~100 unicode-range slices per weight. Load only the slices that cover the Chinese copy,
 * so a Chinese render makes a few dozen font requests instead of hundreds. English renders never call this.
 */
export function ensureZhFonts(): void {
  if (zhLoaded) return;
  zhLoaded = true;
  const chars = [...new Set([...allZhText()].map((c) => c.codePointAt(0) ?? 0))];
  const subsets = Object.entries(notoInfo().unicodeRanges)
    .filter(([key]) => /^\[\d+\]$/.test(key))
    .filter(([, spec]) => {
      const ranges = parseRanges(spec);
      return chars.some((cp) => ranges.some(([a, b]) => cp >= a && cp <= b));
    })
    .map(([key]) => key);
  // The numbered slices are valid subset keys at runtime; the typings only list the named subsets.
  loadNoto('normal', { weights: ['500', '700'], subsets: subsets as NotoSubset[], ignoreTooManyRequestsWarning: true });
}
