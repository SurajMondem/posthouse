import { Easing, interpolate, staticFile } from 'remotion';
import { loadFont } from '@remotion/fonts';
import { FONTS } from '../video/theme';

// Colours and fonts belong to each video (src/video/theme.ts); the framework only re-exports them.
export { C, DISPLAY, MONO, SANS } from '../video/theme';

for (const f of FONTS) loadFont({ family: f.family, url: staticFile(f.file), weight: f.weight });

// Motion defaults: one ease everywhere, short entrances, small staggers.
export const E = Easing.inOut(Easing.cubic);
export const OUT = Easing.out(Easing.cubic);
export const ELEMENT = 0.4;
export const STAGGER = 0.1;

// 0 → 1 over d seconds starting at `at`, eased and clamped.
export const prog = (t: number, at: number, d = ELEMENT, ease: (x: number) => number = E) =>
  interpolate(t, [at, at + d], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

// Fade up into place.
export const appear = (t: number, at: number, d = ELEMENT, dy = 18): React.CSSProperties => {
  const p = prog(t, at, d, OUT);
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` };
};

// Focus: dim what isn't being explained right now.
export const dim = (t: number, at: number, to = 0.3, d = ELEMENT) => 1 - prog(t, at, d) * (1 - to);

// A quick overshoot for pops (0 → 1.12 → 1).
export const pop = (t: number, at: number, d = 0.35) => {
  const p = prog(t, at, d);
  return p < 0.6 ? (p / 0.6) * 1.12 : 1.12 - ((p - 0.6) / 0.4) * 0.12;
};

// Count a number from `from` to `to` over d seconds (prices, scores, totals).
export const count = (t: number, at: number, from: number, to: number, d = 0.9) => Math.round(from + (to - from) * prog(t, at, d, OUT));
export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
