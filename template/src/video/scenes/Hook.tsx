import { AbsoluteFill } from 'remotion';
import type { Cues } from '../../framework/Stage';
import { appear, C, pop, prog } from '../../framework/theme';
import { Headline, Kicker, Lines, useT } from '../../framework/ui';
import { POST_CARD } from '../layout';

// Hook: a post in a feed. The feed scrolls it away, then stops on it, and it turns into a video.
const FEED = { x: 560, y: 100, w: 440, h: 740 };
const STEP = 246; // card height + gap

const FeedCard: React.FC<{ y: number; opacity: number; children?: React.ReactNode }> = ({ y, opacity, children }) => (
  <div style={{ position: 'absolute', left: POST_CARD.x - FEED.x, top: y, width: POST_CARD.w, height: POST_CARD.h, borderRadius: POST_CARD.r, background: C.surface, border: `2px solid ${C.border}`, opacity, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 26, top: 24, width: 44, height: 44, borderRadius: 22, background: C.surface2 }} />
    <div style={{ position: 'absolute', left: 84, top: 32, width: 150, height: 12, borderRadius: 6, background: C.muted, opacity: 0.6 }} />
    <Lines n={4} style={{ position: 'absolute', left: 26, right: 26, top: 92 }} />
    {children}
  </div>
);

export const Hook: React.FC<{ cues: Cues }> = ({ cues }) => {
  const { t, out } = useT();
  const offset = -3 * STEP * prog(t, cues.scroll, 1.2) + 3 * STEP * prog(t, cues.stop - 0.15, 0.7);
  const others = prog(t, cues.scroll - 0.25, 0.3);
  const video = prog(t, cues.video - 0.1, 0.4);
  const mainY = POST_CARD.y - FEED.y + offset;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 84, top: 150, width: 440 }}>
        <div style={appear(t, cues.post - 0.3)}><Kicker>You wrote a post</Kicker></div>
        <div style={{ marginTop: 18, ...appear(t, cues.scroll - 0.2) }}><Headline size={58}>Most people scroll past it.</Headline></div>
        <div style={{ marginTop: 34, ...appear(t, cues.stop - 0.1) }}><Headline size={58} style={{ color: C.accentInk }}>They stop for video.</Headline></div>
      </div>

      <div style={{ position: 'absolute', left: FEED.x, top: FEED.y, width: FEED.w, height: FEED.h, overflow: 'hidden', maskImage: 'linear-gradient(180deg, transparent 0%, #000 12%, #000 88%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 12%, #000 88%, transparent 100%)' }}>
        {[-2, -1, 1, 2, 3, 4, 5].map((k) => <FeedCard key={k} y={mainY + k * STEP} opacity={others} />)}
        <FeedCard y={mainY} opacity={out * prog(t, cues.post - 0.3)}>
          <div style={{ position: 'absolute', inset: 0, background: C.ink, opacity: 0.85 * video }} />
          <div style={{ position: 'absolute', left: POST_CARD.w / 2 - 40, top: POST_CARD.h / 2 - 40, width: 80, height: 80, borderRadius: 40, background: C.accent, transform: `scale(${pop(t, cues.video - 0.1)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 0, marginLeft: 8, borderTop: '17px solid transparent', borderBottom: '17px solid transparent', borderLeft: `28px solid ${C.ink}` }} />
          </div>
          <div style={{ position: 'absolute', left: 26, right: 26, bottom: 22, height: 6, borderRadius: 3, background: C.border, opacity: video }}>
            <div style={{ width: `${100 * prog(t, cues.video + 0.2, 2.5)}%`, height: '100%', borderRadius: 3, background: C.accent }} />
          </div>
        </FeedCard>
      </div>
    </AbsoluteFill>
  );
};
