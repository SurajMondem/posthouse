// Waveform: a row of rounded bars that dance while `amp` (0–1) is up and fall flat as it drops.
// Usage (inside a scene): <Waveform t={t} amp={prog(t, cues.voice, 0.3)} style={{ ...at(BOX) }} />
import { C } from '../framework/theme';

export const Waveform: React.FC<{ t: number; amp: number; bars?: number; color?: string; style?: React.CSSProperties }> = ({ t, amp, bars = 36, color = C.accent, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, ...style }}>
    {Array.from({ length: bars }, (_, i) => {
      const h = 10 + 140 * amp * Math.abs(Math.sin(i * 0.62 + t * 7) * Math.cos(i * 0.21 - t * 2.3));
      return <div key={i} style={{ width: 14, height: h, borderRadius: 7, background: color, opacity: 0.35 + 0.65 * amp }} />;
    })}
  </div>
);
