import { AbsoluteFill } from 'remotion';
import { at, type Cues } from '../../framework/Stage';
import { appear, C, DISPLAY, pop, prog, SANS, STAGGER } from '../../framework/theme';
import { Headline, Kicker, Lines, useT } from '../../framework/ui';
import { POST_PANEL } from '../layout';

// Script: the post (carried in from the feed) is read into scenes, one idea each. A number in the post lights up and
// lands in the scene that uses it.
const Tag: React.FC<{ scale: number; style?: React.CSSProperties }> = ({ scale, style }) => (
  <div style={{ position: 'absolute', padding: '6px 14px', borderRadius: 9999, background: C.accent, color: C.ink, font: `700 22px/1 ${SANS}`, transform: `scale(${scale})`, ...style }}>42%</div>
);

export const Script: React.FC<{ cues: Cues }> = ({ cues }) => {
  const { t, gone } = useT();
  const lit = prog(t, cues.number - 0.1, 0.3);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 84, top: 120, ...appear(t, 0.1) }}><Kicker>Step 1 · Script</Kicker></div>
      <div style={{ position: 'absolute', left: 84, top: 160, ...appear(t, cues.reads - 0.3) }}><Headline size={56}>From post to script</Headline></div>

      <div style={{ ...at(POST_PANEL), background: C.surface, border: `2px solid ${C.border}`, opacity: t < 0 ? 0 : gone ? 0.35 : 1, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 28, top: 30, width: 220, height: 18, borderRadius: 9, background: C.text, opacity: 0.7 }} />
        <Lines n={4} style={{ position: 'absolute', left: 28, right: 28, top: 78 }} />
        <div style={{ position: 'absolute', left: 28, top: 238, width: 200, height: 14, borderRadius: 7, background: C.accent, opacity: 0.25 + 0.75 * lit }} />
        <Tag scale={pop(t, cues.number - 0.1)} style={{ left: 240, top: 228 }} />
        <Lines n={4} style={{ position: 'absolute', left: 28, right: 28, top: 290 }} />
      </div>

      <div style={{ position: 'absolute', left: 500, top: 512, font: `600 40px/1 ${SANS}`, color: C.muted, ...appear(t, cues.script - 0.2, 0.4, 0) }}>→</div>

      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ position: 'absolute', left: 560, top: 300 + i * 118, width: 436, height: 96, borderRadius: 20, background: C.surface, border: `2px solid ${i === 1 && lit ? C.accent : C.border}`, ...appear(t, cues.script + i * STAGGER * 1.5, 0.4, 14) }}>
          <div style={{ position: 'absolute', left: 22, top: 24, width: 48, height: 48, borderRadius: 14, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 26px/1 ${DISPLAY}`, color: C.text }}>{i + 1}</div>
          <div style={{ position: 'absolute', left: 92, top: 30, width: 150, height: 12, borderRadius: 6, background: C.text, opacity: 0.6 * prog(t, cues.idea + i * STAGGER) }} />
          <div style={{ position: 'absolute', left: 92, top: 54, width: 220, height: 10, borderRadius: 5, background: C.muted, opacity: 0.45 }} />
          {i === 1 && <Tag scale={pop(t, cues.number + 0.25)} style={{ right: 22, top: 30 }} />}
        </div>
      ))}
    </AbsoluteFill>
  );
};
