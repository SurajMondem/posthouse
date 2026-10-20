import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { Cues } from '../../framework/Stage';
import { appear, C, prog, SANS } from '../../framework/theme';
import { Headline, Kicker, Label, useT } from '../../framework/ui';

// Closing card over the pulled-back world: the five stations sit in a strip at y 443–637 (camera scale 0.18).
export const CtaOverlay: React.FC<{ cues: Cues }> = ({ cues }) => {
  const { t } = useT();
  return (
    <AbsoluteFill>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ position: 'absolute', left: 54 + i * 194.4, top: 443, width: 194.4, height: 194.4, borderRadius: 10, border: `2px solid ${C.border}`, opacity: prog(t, 0.1 + i * 0.06, 0.4) }} />
      ))}
      <div style={{ position: 'absolute', left: 84, top: 120, ...appear(t, 0.2) }}><Kicker>Open source</Kicker></div>
      <div style={{ position: 'absolute', left: 84, top: 160, display: 'flex', alignItems: 'center', gap: 26, ...appear(t, cues.title - 0.25, 0.5) }}>
        <Img src={staticFile('img/posthouse-mark.svg')} style={{ width: 100, height: 100 }} />
        <Headline size={112}>posthouse</Headline>
      </div>
      <div style={{ position: 'absolute', left: 84, top: 318, ...appear(t, cues.point - 0.2) }}>
        <Label style={{ fontSize: 34, color: C.muted }}>Point it at a post. Get a video back.</Label>
      </div>
      <div style={{ position: 'absolute', left: 84, top: 690, padding: '14px 26px', borderRadius: 9999, background: C.accent, color: C.ink, font: `700 28px/1 ${SANS}`, ...appear(t, cues.free - 0.2, 0.4, 12) }}>free · open source · MIT</div>
      <div style={{ position: 'absolute', left: 84, top: 770, font: `500 34px/1.2 ${SANS}`, color: C.text, opacity: prog(t, cues.github - 0.15) }}>github.com/SurajMondem/posthouse</div>
    </AbsoluteFill>
  );
};
