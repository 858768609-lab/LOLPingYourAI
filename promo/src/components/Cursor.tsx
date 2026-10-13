import React from 'react';

/** The macOS arrow pointer, tip at (x, y). `pressed` squeezes it slightly while the button is held. */
export const Cursor: React.FC<{ x: number; y: number; scale?: number; pressed?: number; opacity?: number }> = ({
  x,
  y,
  scale = 1.35,
  pressed = 0,
  opacity = 1,
}) => (
  <svg
    width={26}
    height={36}
    viewBox="-2 -2 26 36"
    style={{
      position: 'absolute',
      left: x - 2,
      top: y - 2,
      overflow: 'visible',
      opacity,
      pointerEvents: 'none',
      transform: `scale(${scale * (1 - 0.08 * pressed)})`,
      transformOrigin: '2px 2px',
      filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.45))',
    }}
  >
    {/* white outline */}
    <path
      d="M0 0 L0 24.2 L5.6 18.9 L9.6 28.2 L14.2 26.3 L10.3 17.2 L17.6 17.2 Z"
      fill="#fff"
      stroke="#fff"
      strokeWidth={1.2}
      strokeLinejoin="round"
    />
    {/* black arrow */}
    <path d="M1.9 4.4 L1.9 19.9 L6.1 15.8 L10.5 25.6 L12 25 L7.6 15.2 L13.5 15.2 Z" fill="#111" />
  </svg>
);
