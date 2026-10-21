import { AbsoluteFill } from 'remotion';
import { at, type Cues } from '../../framework/Stage';
import { appear, C, prog, SANS } from '../../framework/theme';
import { Headline, Kicker, Small, useT } from '../../framework/ui';
import { WAVE } from '../layout';

// Voice: the post panel (carried in) becomes a live waveform. Three ways to voice it light up as they're named;
// at "no voice" the waveform falls flat.
const OPTIONS = [
  { cue: 'eleven', title: 'ElevenLabs', note: 'hosted · your own clone' },
  { cue: 'free', title: 'Local voice', note: 'say · Kokoro · Piper' },
  { cue: 'none', title: 'Silent', note: 'paced for reading' },
] as const;

export const Voice: React.FC<{ cues: Cues }> = ({ cues }) => {
  const { t, out } = useT();
  const amp = prog(t, cues.voice - 0.1, 0.3) * (1 - 0.88 * prog(t, cues.none, 0.5));
  const active = OPTIONS.reduce((k, o, i) => (t >= cues[o.cue] - 0.1 ? i : k), -1);
  const bars = 36;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 84, top: 120, ...appear(t, 0.1) }}><Kicker>Step 2 · Voice</Kicker></div>
      <div style={{ position: 'absolute', left: 84, top: 160, ...appear(t, cues.voice - 0.3) }}><Headline size={56}>Any voice, or none</Headline></div>

      <div style={{ ...at(WAVE), background: C.surface, border: `2px solid ${C.border}`, opacity: t < 0 ? 0 : out, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {Array.from({ length: bars }, (_, i) => {
          const h = 10 + 140 * amp * Math.abs(Math.sin(i * 0.62 + t * 7) * Math.cos(i * 0.21 - t * 2.3));
          return <div key={i} style={{ width: 14, height: h, borderRadius: 7, background: C.accent, opacity: 0.35 + 0.65 * amp }} />;
        })}
      </div>

      {OPTIONS.map((o, i) => (
        <div key={o.cue} style={{ position: 'absolute', left: 84 + i * 316, top: 580, width: 280, ...appear(t, cues[o.cue] - 0.15, 0.35, 14) }}>
          <div style={{ height: 76, borderRadius: 9999, background: C.surface, border: `2px solid ${active === i ? C.accent : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 28px/1 ${SANS}`, color: C.text }}>{o.title}</div>
          <Small style={{ textAlign: 'center', marginTop: 14 }}>{o.note}</Small>
        </div>
      ))}
    </AbsoluteFill>
  );
};
