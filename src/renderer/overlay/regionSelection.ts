import type { ScreenshotSelection } from '../../shared/ipc';

type Bounds = { width: number; height: number };
type Edge = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
const limit = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

export function constrainSelection(rect: ScreenshotSelection, bounds: Bounds): ScreenshotSelection {
  const width = limit(Math.round(rect.width), Math.min(32, bounds.width), bounds.width);
  const height = limit(Math.round(rect.height), Math.min(32, bounds.height), bounds.height);
  return { x: limit(Math.round(rect.x), 0, bounds.width - width), y: limit(Math.round(rect.y), 0, bounds.height - height), width, height };
}

/** Keep the opposite edge anchored while resizing, including at the display border. */
export function resizeSelection(rect: ScreenshotSelection, edge: Edge, dx: number, dy: number, bounds: Bounds): ScreenshotSelection {
  let left = rect.x, top = rect.y, right = rect.x + rect.width, bottom = rect.y + rect.height;
  const minW = Math.min(32, bounds.width), minH = Math.min(32, bounds.height);
  if (edge.includes('w')) left = limit(left + dx, 0, right - minW);
  if (edge.includes('e')) right = limit(right + dx, left + minW, bounds.width);
  if (edge.includes('n')) top = limit(top + dy, 0, bottom - minH);
  if (edge.includes('s')) bottom = limit(bottom + dy, top + minH, bounds.height);
  return { x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) };
}

const div = (name: string): HTMLDivElement => {
  const node = document.createElement('div'); node.className = name; return node;
};

/** Interactive only between show() and hide(); the main process controls OS click-through. */
export class RegionSelection {
  readonly root = div('region-selection');
  private readonly box = div('selection-box');
  private readonly label = div('selection-size');
  private readonly toolbar = div('selection-toolbar');
  private readonly confirm = document.createElement('button');
  private active: number | null = null;
  private rect: ScreenshotSelection = { x: 0, y: 0, width: 512, height: 512 };
  private drag: { mode: Edge | 'move' | 'draw'; x: number; y: number; rect: ScreenshotSelection; pointer: number } | null = null;

  constructor(private readonly finish: (requestId: number, selection: ScreenshotSelection | null) => void) {
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-label', '选择发送给 AI 的截图区域');
    const help = div('selection-help');
    help.textContent = '选择截图区域 · 拖动框内移动，拖动边角调整；也可在框外重新框选';
    this.root.append(help, this.box, this.toolbar);
    this.box.append(this.label);
    for (const edge of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as Edge[]) {
      const handle = div(`selection-handle handle-${edge}`); handle.dataset.edge = edge; this.box.append(handle);
    }
    const cancel = document.createElement('button'); cancel.textContent = '取消（Esc）';
    this.confirm.textContent = '发送截图'; this.confirm.className = 'selection-send';
    cancel.onclick = () => this.done(null);
    this.confirm.onclick = () => this.done({ ...this.rect });
    this.toolbar.append(cancel, this.confirm);
    this.root.addEventListener('pointerdown', event => this.startDrag(event));
    this.root.addEventListener('pointermove', event => this.move(event));
    const stop = (event: PointerEvent): void => {
      if (this.drag?.pointer !== event.pointerId) return;
      this.drag = null;
      if (this.root.hasPointerCapture(event.pointerId)) this.root.releasePointerCapture(event.pointerId);
    };
    this.root.addEventListener('pointerup', stop); this.root.addEventListener('pointercancel', stop);
    window.addEventListener('keydown', event => {
      if (this.active === null) return;
      if (event.key === 'Escape') { event.preventDefault(); this.done(null); }
      else if (event.key === 'Enter' && !event.repeat) { event.preventDefault(); this.done({ ...this.rect }); }
    });
    document.body.append(this.root);
  }

  show(requestId: number, x: number, y: number, size: number): void {
    this.hide(); this.active = requestId;
    this.rect = constrainSelection({ x: x - size / 2, y: y - size / 2, width: size, height: size }, this.bounds());
    this.root.classList.add('active'); this.render(); this.confirm.focus();
  }

  hide(): void {
    if (this.drag && this.root.hasPointerCapture(this.drag.pointer)) this.root.releasePointerCapture(this.drag.pointer);
    this.drag = null; this.active = null; this.root.classList.remove('active');
  }

  private bounds(): Bounds { return { width: window.innerWidth, height: window.innerHeight }; }

  private done(selection: ScreenshotSelection | null): void {
    if (this.active === null) return;
    const requestId = this.active; this.hide(); this.finish(requestId, selection);
  }

  private startDrag(event: PointerEvent): void {
    if (this.active === null || event.button !== 0 || this.toolbar.contains(event.target as Node)) return;
    const target = event.target as HTMLElement;
    const mode = target.dataset.edge as Edge | undefined ?? (this.box.contains(target) ? 'move' : 'draw');
    const x = limit(event.clientX, 0, window.innerWidth), y = limit(event.clientY, 0, window.innerHeight);
    this.drag = { mode, x, y, rect: { ...this.rect }, pointer: event.pointerId };
    this.root.setPointerCapture(event.pointerId); event.preventDefault();
    if (mode === 'draw') { this.rect = constrainSelection({ x, y, width: 32, height: 32 }, this.bounds()); this.render(); }
  }

  private move(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointer !== event.pointerId) return;
    const x = limit(event.clientX, 0, window.innerWidth), y = limit(event.clientY, 0, window.innerHeight);
    if (drag.mode === 'move') this.rect = constrainSelection({ ...drag.rect, x: drag.rect.x + x - drag.x, y: drag.rect.y + y - drag.y }, this.bounds());
    else if (drag.mode === 'draw') this.rect = constrainSelection({ x: Math.min(x, drag.x), y: Math.min(y, drag.y), width: Math.abs(x - drag.x), height: Math.abs(y - drag.y) }, this.bounds());
    else this.rect = resizeSelection(drag.rect, drag.mode, x - drag.x, y - drag.y, this.bounds());
    this.render();
  }

  private render(): void {
    const { x, y, width, height } = this.rect;
    Object.assign(this.box.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
    this.label.textContent = `${width} × ${height}`;
    const toolbarWidth = Math.min(300, window.innerWidth - 16);
    this.toolbar.style.width = `${toolbarWidth}px`;
    this.toolbar.style.left = `${limit(x + width - toolbarWidth, 8, window.innerWidth - toolbarWidth - 8)}px`;
    const below = y + height + 14;
    this.toolbar.style.top = `${below + 44 <= window.innerHeight ? below : Math.max(8, y - 58)}px`;
  }
}
