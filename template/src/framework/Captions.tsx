import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, SANS } from './theme';

export type CaptionPage = { startMs: number; endMs: number; tokens: { text: string; fromMs: number; toMs: number }[] };

// Burned-in captions from the word timings, so the video works on mute. Each word brightens as it's said.
// Pages are built per scene (lib/timeline.mjs) so a page never crosses a scene.
export const Captions: React.FC<{ pages: CaptionPage[] }> = ({ pages }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const page = pages.find((p) => ms >= p.startMs && ms < p.endMs);
  if (!page) return null;
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70 }}>
      <div style={{ maxWidth: 900, textAlign: 'center', font: `600 40px/1.25 ${SANS}`, padding: '12px 22px', borderRadius: 16, background: C.captionBg }}>
        {page.tokens.map((tok, i) => (
          <span key={i} style={{ color: ms >= tok.fromMs ? C.text : C.muted }}>{i ? ' ' : ''}{tok.text}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
