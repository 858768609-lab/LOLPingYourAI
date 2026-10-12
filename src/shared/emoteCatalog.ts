export interface CatalogEmote { slug: string; leagueId: number; name: string; nameZh: string; hasSound: boolean }
// Original geometric characters; compatibility slugs do not identify Riot artwork.
export const EMOTE_CATALOG: readonly CatalogEmote[] = [
  { slug: 'facepalm', leagueId: 0, name: 'Facepalm', nameZh: '捂脸', hasSound: false },
  { slug: 'unworthy_cn', leagueId: 0, name: 'Weak!', nameZh: '弱爆', hasSound: false },
  { slug: 'retreat', leagueId: 0, name: 'Retreat', nameZh: '撤退', hasSound: false },
  { slug: 'like', leagueId: 0, name: 'Nice', nameZh: '点赞', hasSound: false },
  { slug: 'celebrate', leagueId: 0, name: 'Celebrate', nameZh: '喝彩', hasSound: false },
  { slug: 'thinking', leagueId: 0, name: 'Thinking', nameZh: '思考', hasSound: false },
  { slug: 'coffee', leagueId: 0, name: 'Coffee', nameZh: '喝杯咖啡', hasSound: false },
  { slug: 'gg_heart', leagueId: 0, name: 'GG', nameZh: '干得漂亮', hasSound: false },
  { slug: 'wave', leagueId: 0, name: 'Hello', nameZh: '打个招呼', hasSound: false },
];
export const DEFAULT_EMOTE_WHEEL: readonly string[] = ['unworthy_cn', 'like', 'celebrate', 'thinking', 'coffee', 'gg_heart', 'wave', 'retreat'];
export const DEFAULT_CLICK_EMOTE = 'facepalm';
