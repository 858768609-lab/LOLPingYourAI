export function squareRegion(point, size, display) {
  const x = Math.round(point.x - size / 2), y = Math.round(point.y - size / 2);
  const left = Math.max(x, display.x), top = Math.max(y, display.y);
  const right = Math.min(x + size, display.x + display.width), bottom = Math.min(y + size, display.y + display.height);
  return { x, y, width: size, height: size, valid: { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }, padding: { left: left - x, top: top - y }, scaleFactor: display.scaleFactor ?? 1 };
}

export function anchoredPoint(target, bounds) {
  return { x: bounds.x + target.relative.x * bounds.width, y: bounds.y + target.relative.y * bounds.height };
}

export function windowAnchor(window, point) {
  return { ...window, relative: { x: (point.x - window.bounds.x) / window.bounds.width, y: (point.y - window.bounds.y) / window.bounds.height } };
}
