import { AbsoluteFill } from 'remotion';
import { at, type Cues } from '../../framework/Stage';
import { appear, C, pop, prog } from '../../framework/theme';
import { Headline, Kicker, Lines, Small, useT } from '../../framework/ui';
import { BASE } from '../layout';

// Stage: the timeline (carried in) becomes the floor of a small world. Five stations rise on it and a camera frame
// glides across them, carrying a dot from one to the next: the whole idea of posthouse in one picture.
const SIZE = 168;
const STEP = 186;
const HOP = 0.55;

export const StageScene: React.FC<{ cues: Cues }> = ({ cues }) => {
  const { t, gone } = useT();
  const pos = [0, 1, 2, 3].reduce((n, i) => n + prog(t, cues.camera + i * HOP, HOP * 0.8), 0);
  const frameX = BASE.x - 8 + STEP * pos;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 84, top: 120, ...appear(t, 0.1) }}><Kicker>Step 4 · Stage</Kicker></div>
      <div style={{ position: 'absolute', left: 84, top: 160, ...appear(t, cues.slides - 0.3) }}><Headline size={56}>One stage. No slides.</Headline></div>
      <div style={{ position: 'absolute', left: 84, top: 240, ...appear(t, cues.slides + 0.2) }}><Small>no cuts · no fades · one continuous camera</Small></div>

      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ position: 'absolute', left: BASE.x + i * STEP, top: BASE.y - SIZE - 32, width: SIZE, height: SIZE, borderRadius: 16, background: C.surface, border: `2px solid ${C.border}`, overflow: 'hidden', ...appear(t, cues.stage - 0.3 + i * 0.08, 0.35, 16) }}>
          <div style={{ position: 'absolute', left: 18, top: 18, width: 34, height: 34, borderRadius: 10, background: C.surface2 }} />
          <Lines n={3} h={9} gap={12} style={{ position: 'absolute', left: 18, right: 18, top: 70 }} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: frameX, top: BASE.y - SIZE - 40, width: SIZE + 16, height: SIZE + 16, borderRadius: 22, border: `4px solid ${C.accent}`, opacity: prog(t, cues.camera - 0.3, 0.3) * (gone ? 0.35 : 1) }} />
      <div style={{ position: 'absolute', left: frameX + 8 + SIZE / 2 - 12, top: BASE.y - 12, width: 24, height: 24, borderRadius: 12, background: C.accent, transform: `scale(${pop(t, cues.carrying - 0.05)})` }} />

      <div style={{ ...at(BASE), background: C.muted, opacity: t < 0 ? 0 : gone ? 0.35 : 1 }} />
    </AbsoluteFill>
  );
};
