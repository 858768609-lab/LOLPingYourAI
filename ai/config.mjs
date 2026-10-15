export const defaults = Object.freeze({ regionSize: 512, sessionHours: 2, wardHours: 0.5, harness: 'codex', banter: true, responseEffort: 'low', model: '' });

export const signals = Object.freeze({
  missing: { label: '问号 · 解释这里', mode: 'observe', prompt: '解释或诊断截图区域的内容。只读观察，不要修改任何内容。请用简体中文回复。' },
  assist: { label: '请求协助', mode: 'execute', prompt: '检查截图区域的任务进度，协助完成当前任务。若目标仍不清楚，发问号信号并提出一个简短问题。请用简体中文回复。' },
  danger: { label: '危险 · 纠正方向', mode: 'interrupt', prompt: '当前处理方向有误。立即停止，检查这张新截图并说明需要纠正的地方，只有明确纠正要求后才能继续。请用简体中文回复。' },
  onmyway: { label: '正在赶来 · 展开窗口', mode: 'execute', prompt: '将目标窗口扩展到工作区域，使用可恢复的显示设置改善可读性。保留文档内容，并保存原始窗口位置以便恢复。请用简体中文回复。' },
  vision: { label: '插眼 · 稍后回访', mode: 'ward', prompt: '按设置的等待时间登记一次回访，登记成功后回复插眼信号。请用简体中文回复。' },
  bait: { label: '弱爆 · 轻松吐槽', mode: 'emotion', prompt: '用户在轻松地表达不满，可以用俏皮的表情回应。不要仅因这个表情撤销工作或改变任务。请用简体中文回复。' },
  allin: { label: '全力进攻', mode: 'execute', prompt: '将工作重点转向这个区域，检查进度并继续推进已有目标。若目标未知，请先询问。请用简体中文回复。' },
  retreat: { label: '撤退 · 停止工作', mode: 'stop', prompt: '停止工作，将控制权交还用户。请用简体中文回复。' },
  like: { label: '点赞', mode: 'emotion', prompt: '用户认可当前方向，请继续已有任务。请用简体中文回复。' },
  cleared: { label: '排眼 · 取消回访', mode: 'unward', prompt: '取消这个窗口尚未执行的回访。请用简体中文回复。' },
  reaction: { label: '表情互动', mode: 'emotion', prompt: '用户发送了一个表情，请简短回应其中的情绪，不要改变任务。请用简体中文回复。' },
  celebrate: { label: '喝彩', mode: 'emotion', prompt: '用一个简短、友好的表情庆祝已完成的任务。请用简体中文回复。' },
  push: { label: '继续推进', mode: 'execute', prompt: '继续推进这个区域的当前任务。若尚未确定任务，请先询问。请用简体中文回复。' },
  enemyvision: { label: '关注这里', mode: 'observe', prompt: '关注截图区域，说明你观察到的内容。只读观察。请用简体中文回复。' },
  generic: { label: '看看这里', mode: 'observe', prompt: '检查并描述截图区域的内容。只读观察。请用简体中文回复。' },
});

export function validateConfig(value = {}) {
  const result = { ...defaults, ...value };
  for (const [key, min, max] of [['regionSize', 128, 2048], ['sessionHours', 0.01, 168], ['wardHours', 0.001, 168]]) {
    if (!Number.isFinite(result[key]) || result[key] < min || result[key] > max) throw new Error(`${key} must be between ${min} and ${max}`);
  }
  if (!Number.isInteger(result.regionSize)) throw new Error('regionSize must be an integer');
  if (!['codex', 'claude'].includes(result.harness)) throw new Error('Unknown harness');
  if (!['low', 'medium', 'high', 'xhigh'].includes(result.responseEffort)) throw new Error('Unknown response effort');
  if (typeof result.model !== 'string' || (result.model !== '' && !/^[a-zA-Z0-9._:-]{1,120}$/.test(result.model))) throw new Error('Invalid model name');
  if (typeof result.banter !== 'boolean') throw new Error('banter must be boolean');
  const modes = new Set(['observe', 'execute', 'interrupt', 'stop', 'ward', 'unward', 'emotion']);
  for (const [id, entry] of Object.entries(result.mappings ?? {})) {
    if (!/^[a-zA-Z0-9_:-]{1,80}$/.test(id) || !modes.has(entry.mode) || typeof entry.prompt !== 'string' || entry.prompt.length > 12000) throw new Error('Invalid signal mapping');
  }
  return result;
}

export function signalFor(config, id) {
  const result = config.mappings?.[id] ?? signals[id];
  if (!result) throw new Error(`Unknown signal: ${id}`);
  return result;
}
