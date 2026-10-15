import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReplyApi, ReplyPhase, ReplyState } from '../../shared/reply';
import './reply.css';

declare global { interface Window { replyApi: ReplyApi } }
const phases: Record<ReplyPhase, string> = { queued: '已收到信号', capturing: '正在查看信号位置', connecting: '正在连接队友', thinking: '队友正在分析', responding: '队友正在回复', completed: '回复已完成', failed: '本次处理失败', stopped: '已停止' };
const activePhases = new Set<ReplyPhase>(['queued', 'capturing', 'connecting', 'thinking', 'responding']);
const seconds = (milliseconds: number) => `${(Math.max(0, milliseconds) / 1000).toFixed(1)} 秒`;

function Reply() {
  const [state, setState] = useState<ReplyState | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const content = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    let receivedChange = false;
    const unsubscribe = window.replyApi.onChange(value => { receivedChange = true; if (active) setState(value); });
    void window.replyApi.status().then(value => { if (active && !receivedChange) setState(value); }).catch(reason => { if (active) setError(String(reason)); });
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => { active = false; mounted.current = false; unsubscribe(); clearInterval(timer); };
  }, []);
  useEffect(() => { if (follow.current && content.current) content.current.scrollTop = content.current.scrollHeight; }, [state?.messages]);
  const run = async (action: () => Promise<void>) => { setError(''); try { await action(); } catch (reason) { if (mounted.current) setError(String(reason)); } };
  const progress = state?.progress;
  const elapsed = progress ? activePhases.has(progress.phase) ? Math.max(progress.elapsedMs, now - progress.startedAt) : progress.elapsedMs : 0;
  return <div className="reply-window">
    <header className="reply-header"><strong>AI 队友回复</strong><div className="reply-actions"><button className={state?.alwaysOnTop ? 'selected' : ''} aria-pressed={state?.alwaysOnTop ?? true} title="让回复窗口保持在其他窗口上方" onClick={() => void run(() => window.replyApi.setAlwaysOnTop(!state?.alwaysOnTop))}>置顶</button><button title="打开 AI 队友设置" onClick={() => void run(window.replyApi.openSettings)}>设置</button><button title="隐藏窗口，下次信号时再显示" onClick={() => void run(window.replyApi.hide)}>隐藏</button></div></header>
    <div className="reply-progress" role="status"><span className={state?.busy ? 'status-dot busy' : 'status-dot'} /><span>{progress ? phases[progress.phase] : '等待你的信号'}</span>{progress && <time>{seconds(elapsed)}</time>}</div>
    {state?.needsApproval && <div className="reply-alert">队友需要你的确认。<button onClick={() => void run(window.replyApi.openSettings)}>打开设置确认</button></div>}
    {error && <div className="reply-alert" role="alert">{error}</div>}
    <div ref={content} className="reply-content" onScroll={event => { const node = event.currentTarget; follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40; }}>
      {state?.messages ? <div className="reply-text">{state.messages}</div> : <div className="reply-empty">{progress && activePhases.has(progress.phase) ? '已收到，正在等待队友回复…' : '在屏幕上发出信号，队友的回复会显示在这里。'}<span>拖动标题栏可移动窗口，拖动边缘可调整大小。</span></div>}
    </div>
    <footer><span>{typeof progress?.firstResponseMs === 'number' ? `首字用时 ${seconds(progress.firstResponseMs)}` : '回复仅显示在本机'}</span><button className="stop" disabled={!state?.busy && !progress || Boolean(progress && !activePhases.has(progress.phase) && !state?.busy)} onClick={() => void run(window.replyApi.stop)}>停止</button></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<Reply />);
