import { useEffect, useRef, useState } from 'react';
import { IconEditor } from './IconEditor';
import { api } from '../api';
import { createTeammateRefresh } from '../teammateRefresh';
import '../teammate.css';

declare global { interface Window { teammateApi: { call(method: string, args?: unknown): Promise<any>; onChange(cb: () => void): () => void } } }
const call = (method: string, args?: unknown) => window.teammateApi.call(method, args);
const modeLabels: Record<string, string> = { observe: '只读观察', execute: '执行任务', interrupt: '中断并纠正', stop: '停止', ward: '定时回访', unward: '取消回访', emotion: '表情互动' };
const wardLabels: Record<string, string> = { pending: '等待回访', visiting: '正在回访', completed: '已完成', cancelled: '已取消', failed: '回访失败', uncertain: '回访中断，需检查' };
const methodLabels: Record<string, string> = { 'vector-generated': '矢量绘制', 'image-generated': '图像生成', 'local-crop': '本地裁切' };
const phaseLabels: Record<string, string> = { queued: '已收到信号', capturing: '正在查看信号位置', connecting: '正在连接队友', thinking: '队友正在分析', responding: '队友正在回复', completed: '回复已完成', failed: '本次处理失败', stopped: '已停止' };
const seconds = (milliseconds: number) => `${(milliseconds / 1000).toFixed(1)} 秒`;

export function TeammatePanel() {
  const [state, setState] = useState<any>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [signal, setSignal] = useState('missing'), [prompt, setPrompt] = useState(''), [mode, setMode] = useState('observe');
  const [handoff, setHandoff] = useState(''), [description, setDescription] = useState(''), [candidates, setCandidates] = useState<any[]>([]), [permissions, setPermissions] = useState<any>(null);
  const [customId, setCustomId] = useState('');
  const [reference, setReference] = useState<string>();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const refresher = useRef<ReturnType<typeof createTeammateRefresh> | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const refresh = createTeammateRefresh({ call, onState: setState, onCandidates: setCandidates, onError: e => setError(String(e)) });
    refresher.current = refresh;
    void refresh.request();
    let active = true;
    void call('doctor').then(result => { if (active) setPermissions(result); }).catch(() => {});
    const unsubscribe = window.teammateApi.onChange(() => { void refresh.request(); });
    const timer = setInterval(() => { void refresh.request(); }, 3000);
    return () => { active = false; mounted.current = false; refresher.current = null; refresh.dispose(); unsubscribe(); clearInterval(timer); };
  }, []);
  useEffect(() => { if (!state) return; const mapping = state.config.mappings?.[signal] ?? state.signals[signal]; if (mapping) { setPrompt(mapping.prompt); setMode(mapping.mode); } }, [signal, Boolean(state), JSON.stringify(state?.config.mappings)]);
  const run = async (fn: () => Promise<unknown>, message = '已保存') => { setError(''); try { await fn(); if (!mounted.current) return; setNotice(message); await refresher.current?.request(); } catch (e) { if (mounted.current) setError(String(e)); } };
  if (!state) return <section id="teammate">{error ? <p role="alert" className="ai-error">{error}</p> : '正在加载 AI 队友…'}</section>;
  const cfg = state.config;
  const progress = state.progress;
  const elapsed = progress && ['queued', 'capturing', 'connecting', 'thinking', 'responding'].includes(progress.phase) ? Math.max(progress.elapsedMs, Date.now() - progress.startedAt) : progress?.elapsedMs;
  const messages = state.history.filter((h: any) => h.event.method === 'item/agentMessage/delta' || (h.event.method === 'claude/message' && h.event.params?.type === 'assistant')).map((h: any) => h.event.params?.delta ?? h.event.params?.message?.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('') ?? '').filter(Boolean).join('\n\n').slice(-12000);
  return <section id="teammate" className="ai-panel">
    <div className="section">AI 队友</div>
    <div className="ai-card">
      <div className="ai-heading"><strong>{state.busy ? '队友正在工作' : '等待你的信号'}</strong><button onClick={() => void run(() => call('stop'), '已停止')}>撤退 · 停止</button></div>
      {progress && <p role="status">{phaseLabels[progress.phase] ?? '正在处理信号'} · {seconds(elapsed)}{typeof progress.timings?.responding === 'number' && <> · 首字用时 {seconds(progress.timings.responding)}</>}</p>}
      <p>连续发出的信号会沿用同一段对话，队友可以接着处理当前任务。</p>
      <p>按住 {api.platform === 'mac' ? 'Option' : 'Alt'} 并用鼠标左键拖动发信号；Ctrl + 拖动打开表情轮盘。紧急停止：Ctrl + Alt + Esc。</p>
      <p>发送问号后，等待图标播放完，再移动或调整截图框；确认选区后才会发给队友。按 Esc 可取消。</p>
      {error && <p role="alert" className="ai-error">{error}</p>}{notice && <p role="status">{notice}</p>}
      <label>选择 AI 队友<select value={cfg.harness} onChange={e => void run(() => call('config', { harness: e.target.value }))}><option value="codex">Codex</option><option value="claude">Claude</option></select></label>
      {cfg.harness === 'codex' && <>
        <label>使用模型<select value={cfg.model ?? ''} onChange={e => void run(() => call('config', { model: e.target.value }))}><option value="">使用 Codex 默认模型</option><option value="gpt-6.1-sol">GPT-6.1 Sol</option><option value="gpt-6-astra">GPT-6 Astra</option>{cfg.model && !['gpt-6.1-sol', 'gpt-6-astra'].includes(cfg.model) && <option value={cfg.model}>{cfg.model}</option>}</select></label>
        <label>响应速度<select value={cfg.responseEffort ?? 'low'} onChange={e => void run(() => call('config', { responseEffort: e.target.value }))}><option value="low">快速响应（较少思考）</option><option value="medium">均衡</option><option value="high">深入思考</option><option value="xhigh">充分思考（等待较久）</option></select></label>
        <p>模型和响应速度对下一次信号生效，仅用于本应用，不修改 Codex 的全局设置。简单观察建议使用快速响应，复杂任务可选择深入思考。</p>
      </>}
      <label className="ai-check"><input type="checkbox" checked={state.replyWindow?.enabled ?? true} onChange={e => void run(() => call('configureReply', { enabled: e.target.checked }))} />发出信号后显示桌面回复窗口</label>
      <label className="ai-check"><input type="checkbox" checked={state.replyWindow?.alwaysOnTop ?? true} onChange={e => void run(() => call('configureReply', { alwaysOnTop: e.target.checked }))} />回复窗口保持置顶</label>
      <button onClick={() => void run(() => call('showReply'), '已显示桌面回复窗口')}>显示回复窗口</button><p>回复窗口可单独拖动和调整大小，会记住上次的位置；隐藏后，下次信号会重新显示。</p>
      <div className="ai-grid">{[['regionSize', '截图区域边长（像素）', 128, 2048, 32], ['sessionHours', '闲置后重建会话（小时）', 0.01, 168, 0.5], ['wardHours', '回访等待时间（小时）', 0.001, 168, 0.1]].map(([key, label, min, max, step]) => <label key={key}>{label}<input type="number" defaultValue={cfg[String(key)]} min={Number(min)} max={Number(max)} step={Number(step)} onBlur={e => void run(() => call('config', { [key]: Number(e.target.value) }))} /></label>)}</div>
      <label className="ai-check"><input type="checkbox" checked={cfg.banter} onChange={e => void run(() => call('config', { banter: e.target.checked }))} />允许队友用轻松俏皮的语气回复</label>
      <button onClick={() => void run(async () => setPermissions(await call('doctor')), '已检查')}>检查桌面权限</button>
      {permissions && <p>桌面操作：{permissions.accessibility ? '可用' : '不可用'} · 屏幕截图：{permissions.screenRecording ? '可用' : '不可用'}{api.platform === 'mac' ? <><br /><button onClick={() => void call('openAccess')}>打开辅助功能设置</button> <button onClick={() => void call('openScreen')}>打开录屏设置</button></> : <><br />请保持桌面解锁；以管理员身份运行的窗口可能无法操作。截图是否成功以实际发信号的结果为准。</>}</p>}
    </div>
    <div className="ai-card"><h3>信号含义</h3>
      <label>选择信号<select value={signal} onChange={e => setSignal(e.target.value)}>{!state.signals[signal] && !cfg.mappings?.[signal] && <option value={signal}>{signal}</option>}{Object.entries({ ...state.signals, ...cfg.mappings }).map(([id, value]: [string, any]) => <option key={id} value={id}>{value.label ?? id}</option>)}</select></label>
      <label>执行方式<select value={mode} onChange={e => setMode(e.target.value)}>{Object.entries(modeLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>发送给队友的指令<textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} /></label>
      <button onClick={() => void run(() => call('config', { mappings: { ...cfg.mappings, [signal]: { label: state.signals[signal]?.label ?? signal, mode, prompt } } }))}>保存信号设置</button>
      <p>可以为导入的表情绑定指令。未绑定指令的表情只用于互动，不会改变当前任务。</p>
      <select value={customId} onChange={e => setCustomId(e.target.value)}><option value="">选择已导入的表情</option>{state.customEmotes?.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      <input placeholder="自定义表情编号（c:…）" value={customId} onChange={e => setCustomId(e.target.value)} /><button disabled={!customId} onClick={() => { setSignal(customId); setPrompt('回应这个表情，不要改变当前任务。请用简体中文回复。'); setMode('emotion'); }}>绑定表情</button>
    </div>
    <div className="ai-card"><h3>任务交接</h3><p>填写目标、当前进度和下一步，后续信号会继续推进这个任务。其他会话的内容通过交接说明传入，不会接管正在运行的其他聊天。</p>
      <textarea rows={3} value={handoff} onChange={e => setHandoff(e.target.value)} placeholder="目标、目前进度、下一步…" /><button disabled={!handoff.trim()} onClick={() => void run(() => call('bind', { harness: cfg.harness, summary: handoff }), '任务已交接')}>使用此任务</button>
      <details><summary>会话详情</summary>{state.sessions[cfg.harness] ? <><p>当前队友：{cfg.harness === 'codex' ? 'Codex' : 'Claude'}</p><p>{state.sessions[cfg.harness].summary || '尚无任务交接说明。'}</p></> : <p>尚未开始会话，发送一个信号即可开始。</p>}</details>
    </div>
    <div className="ai-card"><h3>创作表情</h3><p>描述你想要的原创表情，队友会调用可用的图像工具或绘制矢量图。先预览，再添加到表情列表；也可以导入参考图片。</p>
      <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="例如：一只得意的小机器人，透明背景，青绿色…" /><button disabled={state.busy || !description.trim()} onClick={() => void run(() => call('generateIcon', { prompt: description, reference }), '正在生成')}>生成表情</button>
      <IconEditor onChange={setReference} />
      {reference && <button onClick={() => void run(() => call('importCrop', { pngBase64: reference, name: description.slice(0, 80) || '我的表情' }), '裁切完成，可以预览')}>预览裁切结果</button>}
      <div className="ai-candidates">{candidates.map(c => <div key={c.id}><img src={c.preview} alt={c.name} /><strong>{c.name}</strong><small>{methodLabels[c.method] ?? '生成图片'}</small><button onClick={() => void run(() => call('acceptIcon', { id: c.id }), '已加入表情列表')}>添加</button></div>)}</div>
    </div>
    <div className="ai-card"><h3>本地素材包</h3><p>选择包含 textures（图片）和 sounds（音效）的素材文件夹，更换后需要重启应用。</p><button onClick={() => void run(() => call('importPack'), '素材包已导入，请重启应用')}>导入素材包</button> <button onClick={() => void run(() => call('clearPack'), '已恢复英雄联盟原生素材，请重启应用')}>恢复英雄联盟素材</button></div>
    <div className="ai-card"><h3>定时回访</h3>{state.wards.length === 0 ? <p>暂无回访任务。发送“插眼”信号可设置一次回访。</p> : state.wards.slice(-12).map((w: any) => <p key={w.id}>{w.target.app} · {new Date(w.dueAt).toLocaleString('zh-CN')} · {wardLabels[w.status] ?? '未知状态'}{w.error ? ` — ${w.error}` : ''}</p>)}</div>
    {state.approvals.map((p: any) => <div className="ai-card" key={p.request.id}><h3>队友需要你的确认</h3><pre>{JSON.stringify(p.request.params, null, 2)}</pre>{p.request.method === 'item/tool/requestUserInput' && p.request.params.questions?.map((q: any) => <label key={q.id}>{q.question}<input value={answers[q.id] ?? ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} /></label>)}<button onClick={() => void run(() => call('approve', { harness: p.harness, id: p.request.id, allow: true, answers }))}>本次允许</button> <button onClick={() => void run(() => call('approve', { harness: p.harness, id: p.request.id, allow: false }))}>拒绝</button></div>)}
    <div className="ai-card"><h3>队友回复</h3><pre className="ai-replies">{messages || '队友的回复将显示在这里。'}</pre></div>
  </section>;
}
