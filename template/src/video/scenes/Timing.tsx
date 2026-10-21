import { AbsoluteFill, interpolate } from 'remotion';
import { at, type Cues } from '../../framework/Stage';
import { appear, C, pop, prog, SANS } from '../../framework/theme';
import { Headline, Kicker, Label, useT } from '../../framework/ui';
import { AXIS } from '../layout';

// Timing: the waveform (carried in) settles into a timeline. A playhead sweeps it; each word lights as it's passed;
// a cue fires on "moment".
const WORDS = [
  { text: 'Every', x: 84, w: 121 },
  { text: 'word', x: 229, w: 104 },
  { text: 'gets', x: 357, w: 104 },
  { text: 'a', x: 485, w: 53 },
  { text: 'timestamp', x: 562, w: 189 },
];

export const Timing: React.FC<{ cues: Cues }> = ({ cues }) => {
  const { t, out } = useT();
  const sweep = interpolate(t, [cues.word - 0.4, cues.timestamp + 0.9], [AXIS.x, 820], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 84, top: 120, ...appear(t, 0.1) }}><Kicker>Step 3 · Timing</Kicker></div>
      <div style={{ position: 'absolute', left: 84, top: 160, ...appear(t, cues.word - 0.3) }}><Headline size={56}>Words set the clock</Headline></div>

      <div style={{ ...at(AXIS), background: C.muted, opacity: t < 0 ? 0 : out }} />
      {WORDS.map((w, i) => {
        const lit = sweep >= w.x + w.w / 2;
        return (
          <div key={i} style={{ ...appear(t, cues.word - 0.4 + i * 0.08, 0.3, 10) }}>
            <div style={{ position: 'absolute', left: w.x, top: 490, width: w.w, height: 58, borderRadius: 14, background: C.surface, border: `2px solid ${lit ? C.accent : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 28px/1 ${SANS}`, color: lit ? C.text : C.muted }}>{w.text}</div>
            <div style={{ position: 'absolute', left: w.x + w.w / 2 - 1, top: 548, width: 2, height: AXIS.y - 548, background: lit ? C.accent : C.border }} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: sweep - 2, top: 470, width: 4, height: 170, borderRadius: 2, background: C.accent, opacity: prog(t, cues.word - 0.4, 0.2) * out }} />

      <div style={{ position: 'absolute', left: 84, top: 670, width: 56, height: 56, borderRadius: 28, background: C.accent, transform: `scale(${pop(t, cues.moment - 0.05)})` }} />
      <div style={{ position: 'absolute', left: 164, top: 684, ...appear(t, cues.moment, 0.3, 8) }}>
        <Label>a cue fires on “moment”</Label>
      </div>
    </AbsoluteFill>
  );
};
