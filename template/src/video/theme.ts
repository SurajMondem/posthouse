// THIS VIDEO's look: colours and fonts. The framework reads them from here, so restyling a video never touches
// src/framework/. Mirror taste/look.md when you change the default look for every video.
export const C = {
  ink: '#0f1014', surface: '#191b21', surface2: '#22252d', border: '#30343e',
  text: '#f3f1ea', muted: '#a3a7b1', fog: '#8e95a3',
  accent: '#ffc53d', accentInk: '#ffd86b',
  good: '#46b17b', warn: '#e0913a',
  captionBg: 'rgba(15, 16, 20, 0.78)',
};

// Font files live in public/fonts/ (keep each font's licence next to it). weight: a range for variable fonts.
export const FONTS = [
  { family: 'Bricolage Grotesque', file: 'fonts/BricolageGrotesque-400-800-ascii.woff2', weight: '400 800' },
  { family: 'DM Sans', file: 'fonts/DMSans-400-700-latin.woff2', weight: '400 700' },
];
export const DISPLAY = '"Bricolage Grotesque", sans-serif';
export const SANS = '"DM Sans", sans-serif';
export const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
