import { useEffect, useState } from 'react';
import { IconEditor } from './IconEditor';
import '../teammate.css';

declare global { interface Window { teammateApi: { call(method: string, args?: unknown): Promise<any>; onChange(cb: () => void): () => void } } }
const call = (method: string, args?: unknown) => window.teammateApi.call(method, args);
const modeLabels: Record<string, string> = { observe: 'Observe / 观察', execute: 'Work / 执行', interrupt: 'Correct / 纠错', stop: 'Stop / 停止', ward: 'Ward / 回访', unward: 'Clear ward / 排眼', emotion: 'Emote / 情绪' };

export function TeammatePanel() {
  const [state, setState] = useState<any>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [signal, setSignal] = useState('missing'), [prompt, setPrompt] = useState(''), [mode, setMode] = useState('observe');
  const [handoff, setHandoff] = useState(''), [description, setDescription] = useState(''), [candidates, setCandidates] = useState<any[]>([]), [permissions, setPermissions] = useState<any>(null);
  const [customId, setCustomId] = useState('');
  const [reference, setReference] = useState<string>();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const refresh = async () => { try { setState(await call('status')); setCandidates(await call('candidates')); } catch (e) { setError(String(e)); } };
  useEffect(() => { void refresh(); const unsubscribe = window.teammateApi.onChange(() => { void refresh(); }); const timer = setInterval(() => { void refresh(); }, 3000); return () => { unsubscribe(); clearInterval(timer); }; }, []);
  useEffect(() => { if (!state) return; const mapping = state.config.mappings?.[signal] ?? state.signals[signal]; if (mapping) { setPrompt(mapping.prompt); setMode(mapping.mode); } }, [signal, Boolean(state), JSON.stringify(state?.config.mappings)]);
  const run = async (fn: () => Promise<unknown>, message = 'Saved / 已保存') => { setError(''); try { await fn(); setNotice(message); await refresh(); } catch (e) { setError(String(e)); } };
  if (!state) return <section id="teammate">Loading teammate…</section>;
  const cfg = state.config;
  const messages = state.history.filter((h: any) => ['item/agentMessage/delta', 'claude/message'].includes(h.event.method)).map((h: any) => h.event.params?.delta ?? h.event.params?.message?.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('') ?? '').join('\n\n').slice(-12000);
  return <section id="teammate" className="ai-panel">
    <div className="section">AI Teammate / 你的队友</div>
    <div className="ai-card">
      <div className="ai-heading"><strong>{state.busy ? 'Working / 队友正在工作' : 'Ready for your ping / 等你发信号'}</strong><button onClick={() => void run(() => call('stop'), 'Stopped / 已停止')}>Retreat · 停止</button></div>
      <p>Hold Option / Alt and drag to ping. Ctrl-drag opens emotes. Your teammate keeps the same conversation between pings.</p>
      <p>按住 Option / Alt 拖动发信号；Ctrl 拖动发表情。紧急停止：Ctrl + Alt + Esc。</p>
      {error && <p role="alert" className="ai-error">{error}</p>}{notice && <p role="status">{notice}</p>}
      <label>Teammate / 队友<select value={cfg.harness} onChange={e => void run(() => call('config', { harness: e.target.value }))}><option value="codex">Codex</option><option value="claude">Claude</option></select></label>
      <div className="ai-grid">{[['regionSize', 'Focus square / 区域边长', 128, 2048, 32], ['sessionHours', 'Idle reset / 闲置重置（小时）', 0.01, 168, 0.5], ['wardHours', 'Ward delay / 回访等待（小时）', 0.001, 168, 0.1]].map(([key, label, min, max, step]) => <label key={key}>{label}<input type="number" defaultValue={cfg[String(key)]} min={Number(min)} max={Number(max)} step={Number(step)} onBlur={e => void run(() => call('config', { [key]: Number(e.target.value) }))} /></label>)}</div>
      <label className="ai-check"><input type="checkbox" checked={cfg.banter} onChange={e => void run(() => call('config', { banter: e.target.checked }))} />Playful replies / 允许队友俏皮回敬</label>
      <button onClick={() => void run(async () => setPermissions(await call('doctor')), 'Checked / 已检查')}>Check desktop permissions / 检查权限</button>
      {permissions && <p>Accessibility / 辅助功能：{permissions.accessibility ? '✓' : '缺少'} · Screen recording / 录屏：{permissions.screenRecording ? '✓' : '缺少'}<br /><button onClick={() => void call('openAccess')}>Accessibility settings</button> <button onClick={() => void call('openScreen')}>Screen recording settings</button></p>}
    </div>
    <div className="ai-card"><h3>Signal meanings / 信号含义</h3>
      <label>Signal<select value={signal} onChange={e => setSignal(e.target.value)}>{!state.signals[signal] && !cfg.mappings?.[signal] && <option value={signal}>{signal}</option>}{Object.entries({ ...state.signals, ...cfg.mappings }).map(([id, value]: [string, any]) => <option key={id} value={id}>{value.label ?? id}</option>)}</select></label>
      <label>Behavior<select value={mode} onChange={e => setMode(e.target.value)}>{Object.entries(modeLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Message to your teammate / 发送给队友的内容<textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} /></label>
      <button onClick={() => void run(() => call('config', { mappings: { ...cfg.mappings, [signal]: { label: state.signals[signal]?.label ?? signal, mode, prompt } } }))}>Save signal / 保存信号</button>
      <p>Imported emotes can use their custom ID below. Unmapped emotes express a reaction only.</p>
      <select value={customId} onChange={e => setCustomId(e.target.value)}><option value="">Choose imported emote / 选择已导入表情</option>{state.customEmotes?.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      <input placeholder="Custom emote ID (c:…)" value={customId} onChange={e => setCustomId(e.target.value)} /><button disabled={!customId} onClick={() => { setSignal(customId); setPrompt('React to this emote without changing the task.'); setMode('emotion'); }}>Map custom emote / 绑定表情</button>
    </div>
    <div className="ai-card"><h3>Task handoff / 绑定任务</h3><p>Paste the goal, progress and next step once. Future pings continue with this teammate. External sessions are handed off; this does not take control of an unrelated running chat.</p>
      <textarea rows={3} value={handoff} onChange={e => setHandoff(e.target.value)} placeholder="目标、目前进度、下一步…" /><button disabled={!handoff.trim()} onClick={() => void run(() => call('bind', { harness: cfg.harness, summary: handoff }), 'Task handed off / 任务已交接')}>Use this task / 使用此任务</button>
      <details><summary>Session / 会话</summary><pre>{JSON.stringify(state.sessions[cfg.harness], null, 2)}</pre></details>
    </div>
    <div className="ai-card"><h3>Create an emote / 创作表情</h3><p>Describe an original icon. Your teammate uses available image tools or draws a vector icon. You approve the preview before adding it. Reference images can also be imported in the Emotes section.</p>
      <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="例如：一只得意的小机器人，透明背景，青绿色…" /><button disabled={state.busy || !description.trim()} onClick={() => void run(() => call('generateIcon', { prompt: description, reference }), 'Generating / 正在生成')}>Generate / 生成</button>
      <IconEditor onChange={setReference} />
      {reference && <button onClick={() => void run(() => call('importCrop', { pngBase64: reference, name: description.slice(0, 80) || 'My emote' }), 'Crop ready for preview / 裁切已就绪')}>Preview crop / 预览裁切</button>}
      <div className="ai-candidates">{candidates.map(c => <div key={c.id}><img src={c.preview} alt={c.name} /><strong>{c.name}</strong><small>{c.method}</small><button onClick={() => void run(() => call('acceptIcon', { id: c.id }), 'Added to Emotes / 已加入表情列表')}>Add / 添加</button></div>)}</div>
    </div>
    <div className="ai-card"><h3>Local asset pack / 本地素材包</h3><p>Choose a folder containing textures and sounds. Restart after changing a pack. / 选择包含 textures 和 sounds 的文件夹；更换后重启。</p><button onClick={() => void run(() => call('importPack'), 'Pack imported; restart / 已导入，请重启')}>Import pack / 导入素材包</button> <button onClick={() => void run(() => call('clearPack'), 'Bundled LoL assets restored; restart / 已恢复 LoL 素材，请重启')}>Restore LoL pack / 恢复 LoL 素材</button></div>
    <div className="ai-card"><h3>Wards / 回访</h3>{state.wards.length === 0 ? <p>No wards placed / 尚未插眼</p> : state.wards.slice(-12).map((w: any) => <p key={w.id}>{w.target.app} · {new Date(w.dueAt).toLocaleString()} · {w.status}{w.error ? ` — ${w.error}` : ''}</p>)}</div>
    {state.approvals.map((p: any) => <div className="ai-card" key={p.request.id}><h3>Teammate needs approval / 队友需要批准</h3><pre>{JSON.stringify(p.request.params, null, 2)}</pre>{p.request.method === 'item/tool/requestUserInput' && p.request.params.questions?.map((q: any) => <label key={q.id}>{q.question}<input value={answers[q.id] ?? ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} /></label>)}<button onClick={() => void run(() => call('approve', { harness: p.harness, id: p.request.id, allow: true, answers }))}>Allow once / 本次允许</button> <button onClick={() => void run(() => call('approve', { harness: p.harness, id: p.request.id, allow: false }))}>Decline / 拒绝</button></div>)}
    <div className="ai-card"><h3>Teammate replies / 队友回复</h3><pre className="ai-replies">{messages || 'Your teammate’s replies will appear here. / 队友的回复将显示在这里。'}</pre></div>
  </section>;
}
