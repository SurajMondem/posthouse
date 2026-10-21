import { AbsoluteFill, useVideoConfig } from 'remotion';
import type { Cues } from '../../framework/Stage';
import { appear, C } from '../../framework/theme';
import { Headline, Kicker, useT } from '../../framework/ui';

// A starter station: a kicker and a headline that land on a cue word. Sized from the canvas, so it works at
// 1080×1080, 1920×1080 or 1080×1920. Replace it with your own scenes (docs/stage-api.md).
export const title = (kicker: string, headline: string, cue: string): React.FC<{ cues: Cues }> => {
  const Scene: React.FC<{ cues: Cues }> = ({ cues }) => {
    const { t } = useT();
    const { width, height } = useVideoConfig();
    const pad = Math.round(Math.min(width, height) * 0.08);
    const size = Math.round(Math.min(width, height) * 0.075);
    return (
      <AbsoluteFill style={{ padding: pad, justifyContent: 'center' }}>
        <div style={appear(t, 0.1)}><Kicker style={{ color: C.accent }}>{kicker}</Kicker></div>
        <div style={{ marginTop: size * 0.4, maxWidth: width - pad * 2, ...appear(t, (cues[cue] ?? 0.3) - 0.2) }}>
          <Headline size={size}>{headline}</Headline>
        </div>
      </AbsoluteFill>
    );
  };
  return Scene;
};
