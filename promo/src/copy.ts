/** Every on-screen string of the Promo, in English and Chinese. Payload chips and window titles stay as the app shows them. */
export type Lang = 'en' | 'zh';

export interface Copy {
  coldOpen: [string, string];
  kicker: { ping: string; context: string; act: string; ward: string; emote: string };
  caption: {
    gesture: string;
    context: string;
    pingBack: string;
    act: string;
    ward: string;
    emote: string;
  };
  panel: {
    title: string;
    working: string;
    idle: string;
    interrupted: string;
    fromYou: string;
    reply: string;
    question: string;
    assist: string;
    danger: string;
    ward: string;
    followUp: string;
    emote: string;
    answer: string;
    allIn: string;
    verified: string;
    interruptedLine: string;
    restored: string;
    wardPlaced: string;
    followUpText: string;
    talkBack: string;
  };
  wardBack: string;
  outro: {
    tagline: string;
    chips: [string, string, string, string];
    footer: string;
  };
}

export const COPY: Record<Lang, Copy> = {
  en: {
    coldOpen: ['In League, one ping says it all.', 'Your AI teammate should get it too.'],
    kicker: { ping: 'Ping', context: 'Context', act: 'Act', ward: 'Ward', emote: 'Emotes' },
    caption: {
      gesture: 'Hold ⌥, drag, release on a signal.',
      context: 'It gets the square, the window, and what the ping means.',
      pingBack: '…and pings you back.',
      act: 'Assist to delegate. Danger to interrupt.',
      ward: 'Ward it. Your teammate checks back in 30 minutes.',
      emote: 'Emotes too. It even talks back.',
    },
    panel: {
      title: 'AI Teammate',
      working: 'Working',
      idle: 'Idle',
      interrupted: 'Interrupted',
      fromYou: 'from you',
      reply: 'reply',
      question: 'Question',
      assist: 'Assist me',
      danger: 'Danger',
      ward: 'Ward',
      followUp: 'Follow-up',
      emote: 'Emote · Facepalm',
      answer: 'Scaled dot-product attention. Dividing by √dₖ keeps the softmax from saturating as dimensions grow.',
      allIn: 'On it — editing the note.',
      verified: 'verified with a fresh screenshot',
      interruptedLine: 'Interrupted · reassessing',
      restored: 'restored · checked a fresh screenshot',
      wardPlaced: 'Ward placed · back in 30 min',
      followUpText: 'Follow-up: tests finished — 709 passed, 1 skipped. Nothing edited.',
      talkBack: 'Your move 😏',
    },
    wardBack: 'back in',
    outro: {
      tagline: 'Ping anywhere. Your AI teammate gets the context.',
      chips: ['macOS · Codex', 'Claude (experimental)', 'Windows (preview)', 'Open source · MIT code'],
      footer: 'Fan project. League of Legends assets © Riot Games. Not endorsed by Riot Games, OpenAI or Anthropic.',
    },
  },
  zh: {
    coldOpen: ['在峡谷里，一个信号就够了。', '你的 AI 队友，也该一点就懂。'],
    kicker: { ping: '信号', context: '上下文', act: '行动', ward: '插眼', emote: '表情' },
    caption: {
      gesture: '按住 ⌥，拖动，松开即发信号。',
      context: '队友拿到截图区域、窗口，以及这个信号的含义。',
      pingBack: '……然后反 ping 你。',
      act: '求助就交给它，危险就喊停。',
      ward: '插个眼，30 分钟后队友自己回来看。',
      emote: '还能发表情，它还会回嘴。',
    },
    panel: {
      title: 'AI 队友',
      working: '工作中',
      idle: '空闲',
      interrupted: '已中断',
      fromYou: '来自你',
      reply: '回复',
      question: '提问',
      assist: '求助',
      danger: '危险',
      ward: '插眼',
      followUp: '回访',
      emote: '表情 · 捂脸',
      answer: '缩放点积注意力：除以 √dₖ，避免维度变大时 softmax 饱和。',
      allIn: '收到，正在修改便签。',
      verified: '已用新截图核验',
      interruptedLine: '已中断 · 重新评估',
      restored: '已还原 · 新截图已核对',
      wardPlaced: '已插眼 · 30 分钟后回来',
      followUpText: '回访：测试已完成 — 709 通过，1 跳过。未做任何修改。',
      talkBack: '该你了 😏',
    },
    wardBack: '回访倒计时',
    outro: {
      tagline: '随处一 ping，AI 队友秒懂上下文。',
      chips: ['macOS · Codex', 'Claude（实验性）', 'Windows（预览）', '开源 · 代码 MIT 许可'],
      footer: '粉丝项目。英雄联盟素材 © Riot Games。未获 Riot Games、OpenAI 或 Anthropic 认可。',
    },
  },
};

/** Every Chinese string, so fonts.ts can load only the Noto Sans SC slices these characters need. */
export function allZhText(): string {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(COPY.zh);
  return out.join('');
}
