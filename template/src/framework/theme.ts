import { Easing, interpolate, staticFile } from 'remotion';
import { loadFont } from '@remotion/fonts';

// Design tokens. They mirror taste/look.md: change both together to restyle every video.
export const C = {
  ink: '#0f1014', surface: '#191b21', surface2: '#22252d', border: '#30343e',
  text: '#f3f1ea', muted: '#a3a7b1', fog: '#8e95a3',
  accent: '#ffc53d', accentInk: '#ffd86b',
  good: '#46b17b', warn: '#e0913a',
  captionBg: 'rgba(15, 16, 20, 0.78)',
};
export const DISPLAY = '"Bricolage Grotesque", sans-serif';
export const SANS = '"DM Sans", sans-serif';

loadFont({ family: 'Bricolage Grotesque', url: staticFile('fonts/BricolageGrotesque-400-800-ascii.woff2'), weight: '400 800' });
loadFont({ family: 'DM Sans', url: staticFile('fonts/DMSans-400-700-latin.woff2'), weight: '400 700' });

// Motion defaults: one ease everywhere, short entrances, small staggers.
export const E = Easing.inOut(Easing.cubic);
export const ELEMENT = 0.4;
export const STAGGER = 0.1;

// 0 → 1 over d seconds starting at `at`, eased and clamped.
export const prog = (t: number, at: number, d = ELEMENT) =>
  interpolate(t, [at, at + d], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: E });

// Fade up into place.
export const appear = (t: number, at: number, d = ELEMENT, dy = 18): React.CSSProperties => {
  const p = prog(t, at, d);
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` };
};

// Focus: dim what isn't being explained right now.
export const dim = (t: number, at: number, to = 0.3, d = ELEMENT) => 1 - prog(t, at, d) * (1 - to);

// A quick overshoot for pops (0 → 1.12 → 1).
export const pop = (t: number, at: number, d = 0.35) => {
  const p = prog(t, at, d);
  return p < 0.6 ? (p / 0.6) * 1.12 : 1.12 - ((p - 0.6) / 0.4) * 0.12;
};
