import React from 'react';
import { MacWindow } from '../components/Desktop';
import { FONT } from '../fonts';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const Bars: React.FC<{ widths: number[]; gap?: number; h?: number; color?: string }> = ({ widths, gap = 25, h = 11, color = '#dcdcd8' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: gap - h }}>
    {widths.map((w, i) => (
      <div key={i} style={{ width: `${w}%`, height: h, borderRadius: 3, background: color }} />
    ))}
  </div>
);

/** softmax(QKᵀ / √dₖ)·V, typeset with STIX Two. */
export const Equation: React.FC<{ size?: number; color?: string }> = ({ size = 50, color = '#151515' }) => {
  const it: React.CSSProperties = { fontStyle: 'italic' };
  return (
    <span style={{ font: `400 ${size}px ${FONT.serif}`, color, whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
      softmax
      <span style={{ margin: '0 0.04em' }}>(</span>
      <span style={it}>Q</span>
      <span style={{ ...it, marginLeft: '0.04em' }}>K</span>
      <sup style={{ fontStyle: 'normal', fontSize: '0.6em', verticalAlign: '0.8em', marginLeft: '0.03em' }}>T</sup>
      <span style={{ margin: '0 0.18em' }}>/</span>
      <span>√</span>
      <span style={{ borderTop: `${Math.max(2, size * 0.045)}px solid ${color}`, paddingTop: '0.04em', marginLeft: '-0.02em' }}>
        <span style={it}>d</span>
        <sub style={{ ...it, fontSize: '0.6em', verticalAlign: '-0.3em' }}>k</sub>
      </span>
      <span style={{ margin: '0 0.04em' }}>)</span>
      <span style={{ margin: '0 0.18em' }}>·</span>
      <span style={it}>V</span>
    </span>
  );
};

const Thumb: React.FC<{ active?: boolean; eq?: boolean }> = ({ active, eq }) => (
  <div
    style={{
      width: 112,
      height: 146,
      padding: 4,
      borderRadius: 6,
      boxSizing: 'content-box',
      border: active ? '3px solid #6b8bd6' : '3px solid transparent',
      background: active ? 'rgba(107,139,214,.18)' : undefined,
    }}
  >
    <div style={{ width: '100%', height: '100%', background: '#f7f6f2', padding: '14px 12px', boxSizing: 'border-box' }}>
      <Bars widths={[70, 100, 96, 88]} gap={9} h={4} color="#d0d0cc" />
      {eq && <div style={{ width: '60%', height: 7, margin: '12px auto', background: '#9a9a96', borderRadius: 2 }} />}
      <div style={{ height: eq ? 0 : 12 }} />
      <Bars widths={[100, 94, 98, 60]} gap={9} h={4} color="#d0d0cc" />
    </div>
  </div>
);

/** Window frame in desktop coordinates, and where the equation sits (the ping target). */
export const PAPER: Rect = { x: 70, y: 64, w: 1120, h: 770 };
const TITLE_BAR = 44;
const PAGE_TOP = 28; // from the content top
const EQ_TOP = 262; // equation box top, from the page top

/** Narrow windows drop the page-thumbnail sidebar; the page is centred in what is left. */
function layout(rect: Rect): { sidebar: number; pageLeft: number; pageW: number } {
  const sidebar = rect.w >= 1000 ? 170 : 0;
  const pageW = Math.min(820, rect.w - sidebar - 50);
  return { sidebar, pageW, pageLeft: sidebar + Math.round((rect.w - sidebar - pageW) / 2) };
}

/** Centre of the equation in desktop coordinates: where the user pings. */
export function equationPoint(rect: Rect = PAPER): { x: number; y: number } {
  const { pageLeft, pageW } = layout(rect);
  return { x: rect.x + pageLeft + pageW / 2, y: rect.y + TITLE_BAR + PAGE_TOP + EQ_TOP + 34 };
}

/** "attention.pdf — Preview": a paper page with placeholder text bars and one big readable equation. */
export const PaperWindow: React.FC<{ rect?: Rect; flat?: boolean }> = ({ rect = PAPER, flat }) => {
  const { sidebar, pageLeft, pageW } = layout(rect);
  return (
    <MacWindow {...rect} title="attention.pdf — Preview" titleBar={TITLE_BAR} flat={flat} contentStyle={{ background: '#2b2d31' }}>
      {sidebar > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: sidebar,
            background: '#232529',
            borderRight: '1px solid #18191c',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            paddingTop: 22,
          }}
        >
          <Thumb />
          <Thumb active eq />
          <Thumb />
          <Thumb />
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: pageLeft,
          top: PAGE_TOP,
          width: pageW,
          height: 1100,
          background: '#fbfaf7',
          boxShadow: '0 6px 24px rgba(0,0,0,.4)',
          padding: '54px 72px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ font: `600 30px ${FONT.serif}`, color: '#1b1b1b', marginBottom: 26 }}>3.2.1&nbsp;&nbsp;Scaled Dot-Product Attention</div>
        <Bars widths={[100, 97, 99, 64]} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: EQ_TOP,
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Equation />
          <span style={{ position: 'absolute', right: 72, font: `400 28px ${FONT.serif}`, color: '#333' }}>(1)</span>
        </div>
        <div style={{ position: 'absolute', left: 72, right: 72, top: 384 }}>
          <Bars widths={[100, 98, 99, 95, 100, 71]} />
          <div style={{ height: 34 }} />
          <Bars widths={[100, 96, 99, 97, 58]} />
          <div style={{ height: 34 }} />
          <Bars widths={[100, 99, 93, 98, 100, 80]} />
        </div>
      </div>
    </MacWindow>
  );
};
