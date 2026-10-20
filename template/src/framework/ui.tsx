import { createContext, useContext } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { C, DISPLAY, SANS } from './theme';

// Scene clock on the one stage: t = 0 when the camera arrives at the station; `depart` = when it leaves.
// A station mounts `offset` seconds early (while the camera travels in), so t is negative during the move.
export const SceneClock = createContext({ offset: 0, depart: Infinity });

export const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { offset, depart } = useContext(SceneClock);
  const t = frame / fps - offset;
  return { t, frame, fps, end: depart, gone: t >= depart };
};

type P = { children?: React.ReactNode; style?: React.CSSProperties };

export const Kicker: React.FC<P> = ({ children, style }) => (
  <div style={{ font: `700 22px/1.2 ${SANS}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, ...style }}>{children}</div>
);

export const Headline: React.FC<P & { size?: number }> = ({ children, size = 60, style }) => (
  <div style={{ fontFamily: DISPLAY, fontWeight: 750, fontSize: size, lineHeight: 1.04, letterSpacing: '-0.03em', color: C.text, ...style }}>{children}</div>
);

export const Card: React.FC<P> = ({ style, children }) => (
  <div style={{ position: 'absolute', background: C.surface, border: `2px solid ${C.border}`, borderRadius: 24, ...style }}>{children}</div>
);

export const Label: React.FC<P> = ({ children, style }) => (
  <div style={{ font: `600 26px/1.2 ${SANS}`, color: C.text, ...style }}>{children}</div>
);

export const Small: React.FC<P> = ({ children, style }) => (
  <div style={{ font: `500 21px/1.2 ${SANS}`, color: C.muted, letterSpacing: '0.02em', ...style }}>{children}</div>
);

// Placeholder text lines (a paragraph seen from a distance).
export const Lines: React.FC<{ n: number; widths?: number[]; gap?: number; h?: number; color?: string; style?: React.CSSProperties }> = ({ n, widths = [92, 78, 86, 64], gap = 18, h = 12, color = C.muted, style }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} style={{ width: `${widths[i % widths.length]}%`, height: h, borderRadius: h / 2, background: color, opacity: 0.45 }} />
    ))}
  </div>
);
