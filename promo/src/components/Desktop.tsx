import React from 'react';
import { Img, staticFile } from 'remotion';
import { FONT } from '../fonts';

/** Overscan so camera pushes and pans never reveal an edge. */
const BLEED = 600;

/** Dark macOS-style wallpaper: deep navy with soft hextech-blue light. `flat` drops the gradients (for the GIF). */
export const Wallpaper: React.FC<{ flat?: boolean }> = ({ flat }) => (
  <div
    style={{
      position: 'absolute',
      left: -BLEED,
      top: -BLEED,
      right: -BLEED,
      bottom: -BLEED,
      background: flat
        ? '#0c1a2c'
        : [
            'radial-gradient(ellipse 40% 40% at 30% 35%, rgba(31,169,224,.20), transparent 70%)',
            'radial-gradient(ellipse 35% 40% at 72% 68%, rgba(10,200,185,.13), transparent 70%)',
            'radial-gradient(ellipse 45% 35% at 58% 25%, rgba(90,70,160,.18), transparent 70%)',
            'linear-gradient(160deg, #0b1830 0%, #0a1428 45%, #071020 100%)',
          ].join(','),
    }}
  />
);

const Wifi: React.FC = () => (
  <svg width={18} height={14} viewBox="0 0 18 14">
    <path
      d="M1 5 A12 12 0 0 1 17 5 M3.8 8 A8 8 0 0 1 14.2 8 M6.6 11 A4 4 0 0 1 11.4 11"
      stroke="#e8e8e8"
      strokeWidth={1.8}
      fill="none"
      strokeLinecap="round"
    />
    <circle cx={9} cy={13} r={1.2} fill="#e8e8e8" />
  </svg>
);

const Battery: React.FC = () => (
  <svg width={26} height={13} viewBox="0 0 26 13">
    <rect x={0.75} y={0.75} width={21.5} height={11.5} rx={3} stroke="rgba(232,232,232,.6)" strokeWidth={1.3} fill="none" />
    <rect x={2.5} y={2.5} width={15} height={8} rx={1.6} fill="#e8e8e8" />
    <path d="M24 4.5 V8.5" stroke="rgba(232,232,232,.6)" strokeWidth={1.6} strokeLinecap="round" />
  </svg>
);

/** The menu bar's box in desktop coordinates (for camera framing checks). */
export const MENU_BAR_RECT = { x: 0, y: 0, w: 1920, h: 30 };

/** Thin macOS menu bar. The app's tray icon (the blue diamond) sits among the status items. */
export const MenuBar: React.FC<{ app: string; menus?: string[]; height?: number; flat?: boolean; opacity?: number }> = ({
  app,
  menus = ['File', 'Edit', 'View', 'Window', 'Help'],
  height = 30,
  flat,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      height,
      opacity,
      display: 'flex',
      alignItems: 'center',
      padding: '0 18px',
      background: flat ? '#0a1322' : 'rgba(8, 14, 26, .58)',
      borderBottom: '1px solid rgba(255,255,255,.05)',
      font: `500 ${height * 0.47}px ${FONT.body}`,
      color: '#e8e8e8',
      gap: height * 0.75,
      boxSizing: 'border-box',
    }}
  >
    <span style={{ fontWeight: 700 }}>{app}</span>
    {menus.map((m) => (
      <span key={m} style={{ opacity: 0.88 }}>
        {m}
      </span>
    ))}
    <div style={{ flex: 1 }} />
    <Img src={staticFile('icon.png')} style={{ width: height * 0.62, height: height * 0.62 }} />
    <Wifi />
    <Battery />
    <span>Wed 9:41</span>
  </div>
);

interface MacWindowProps {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  /** Title-bar and frame colours. */
  dark?: boolean;
  titleBar?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  flat?: boolean;
}

/** A rounded macOS window with traffic lights. */
export const MacWindow: React.FC<MacWindowProps> = ({ x, y, w, h, title, dark = true, titleBar = 40, children, style, contentStyle, flat }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: flat ? '0 10px 30px rgba(0,0,0,.45)' : '0 28px 70px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.09)',
      border: flat ? '1px solid rgba(255,255,255,.1)' : undefined,
      boxSizing: 'border-box',
      background: dark ? '#1e2126' : '#ececec',
      ...style,
    }}
  >
    <div
      style={{
        position: 'relative',
        height: titleBar,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: dark
          ? flat
            ? '#2a2e35'
            : 'linear-gradient(180deg, #33373e, #2a2e34)'
          : flat
            ? '#e6e6e6'
            : 'linear-gradient(180deg, #ececec, #dedede)',
        borderBottom: dark ? '1px solid #121417' : '1px solid #c8c8c8',
        font: `600 ${titleBar * 0.37}px ${FONT.body}`,
        color: dark ? '#d7d9dd' : '#3a3a3a',
      }}
    >
      <div style={{ position: 'absolute', left: titleBar * 0.42, display: 'flex', gap: titleBar * 0.2 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <div
            key={c}
            style={{
              width: titleBar * 0.31,
              height: titleBar * 0.31,
              borderRadius: '50%',
              background: c,
              boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,.25)',
            }}
          />
        ))}
      </div>
      {title}
    </div>
    <div style={{ position: 'relative', width: '100%', height: h - titleBar, overflow: 'hidden', ...contentStyle }}>{children}</div>
  </div>
);
