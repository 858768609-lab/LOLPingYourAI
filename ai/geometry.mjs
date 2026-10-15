export function squareRegion(point, size, display) {
  const x = Math.round(point.x - size / 2), y = Math.round(point.y - size / 2);
  const left = Math.max(x, display.x), top = Math.max(y, display.y);
  const right = Math.min(x + size, display.x + display.width), bottom = Math.min(y + size, display.y + display.height);
  return { x, y, width: size, height: size, valid: { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }, padding: { left: left - x, top: top - y }, scaleFactor: display.scaleFactor ?? 1 };
}

/** Explicit user selections stay on one display and never silently expand beyond it. */
export function selectedRegion(selection, display) {
  if (!selection || !['x', 'y', 'width', 'height'].every(k => Number.isFinite(selection[k]))) throw new Error('截图选区无效');
  const rect = Object.fromEntries(['x', 'y', 'width', 'height'].map(k => [k, Math.round(selection[k])]));
  if (rect.width < 16 || rect.height < 16 || rect.width > 16384 || rect.height > 16384) throw new Error('截图选区尺寸无效');
  if (rect.x < display.x || rect.y < display.y || rect.x + rect.width > display.x + display.width || rect.y + rect.height > display.y + display.height) throw new Error('截图选区必须位于同一块屏幕内');
  return { ...rect, valid: { ...rect }, padding: { left: 0, top: 0 }, scaleFactor: display.scaleFactor ?? 1, selection: { ...rect } };
}

export function anchoredPoint(target, bounds) {
  return { x: bounds.x + target.relative.x * bounds.width, y: bounds.y + target.relative.y * bounds.height };
}

export function windowAnchor(window, point) {
  return { ...window, relative: { x: (point.x - window.bounds.x) / window.bounds.width, y: (point.y - window.bounds.y) / window.bounds.height } };
}
