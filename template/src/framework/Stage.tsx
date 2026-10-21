import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, E, SANS } from './theme';
import { Captions, type CaptionPage } from './Captions';
import { SceneClock } from './ui';

// The stage: one continuous world, timed by the narration.
// Stations sit in a row (station i at x = i × W). The camera rests on a station while its voice plays and travels in
// the pause after it; carriers morph one station's element into the next, so nothing ever cuts. An optional last
// scene is an overlay drawn over a pulled-back view of every station.
// Sounds: whoosh on each move, tick when a carrier lands, pop on cue words, sting after the last word (public/sfx).
// Nothing here is video-specific: each video supplies a StageConfig (src/video/config.tsx).

export type Cues = Record<string, number>;
export type Box = { x: number; y: number; w: number; h: number; r: number };
export type Pose = { cx: number; cy: number; s: number };

export type StageConfig = {
  stations: { id: string; Comp: React.FC<{ cues: Cues }> }[];
  // render(p) draws a carrier while the camera travels from station `after` to the next; p runs 0 → 1 (eased).
  carriers: { after: number; render: (p: number) => React.ReactNode }[];
  // cue names (from scenes.json) that get a pop sound, per scene id
  pops?: Record<string, string[]>;
  // closing scene drawn in screen space over the pulled-back world; its id is the last scene in scenes.json
  overlay?: { id: string; Comp: React.FC<{ cues: Cues }>; pose?: Pose };
  // small corner mark, top-left; fades before the overlay. false hides it.
  chrome?: { text: string; logo?: string } | false;
  volume?: { voice?: number; whoosh?: number; tick?: number; pop?: number; sting?: number };
};

export type Storyboard = {
  fps: number;
  width: number;
  height: number;
  total: number;
  scenes: { id: string; audio: string | null; start: number; duration: number; lead: number; moveIn: number; cues: Cues }[];
  // lines spoken over the camera move into a scene (`bridge` in scenes.json); `at` is when the move begins
  bridges?: { id: string; audio: string | null; at: number }[];
  captions: CaptionPage[];
  sting?: { at: number; duration: number } | null;
  // optional bed under everything; envelope = [seconds, gain] keyframes that duck under the voice (lib/timeline.mjs)
  music?: { file: string; envelope: [number, number][] } | null;
};

export const mix = (a: Box, b: Box, p: number): Box => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, w: a.w + (b.w - a.w) * p, h: a.h + (b.h - a.h) * p, r: a.r + (b.r - a.r) * p });
export const at = (b: Box): React.CSSProperties => ({ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: b.r });

export const Stage: React.FC<{ sb: Storyboard; config: StageConfig }> = ({ sb, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width: W, height: H } = sb;
  const f = (s: number) => Math.round(s * fps);
  const t = frame / fps;
  const sc = sb.scenes;
  const n = config.stations.length;
  const vol = { voice: 1, whoosh: 0.35, tick: 0.6, pop: 0.5, sting: 0.6, ...config.volume };
  const poses: Pose[] = config.stations.map((_, i) => ({ cx: i + 0.5, cy: 0.5, s: 1 }));
  if (config.overlay) poses.push(config.overlay.pose ?? { cx: n / 2, cy: 0.5, s: 0.9 / n });
  const cam = (p: Pose) => ({ x: W / 2 - p.s * p.cx * W, y: H / 2 - p.s * p.cy * H, s: p.s });

  const depart = (i: number) => sc[i].start + sc[i].duration;
  const inMove = (i: number) => i < sc.length - 1 && t >= depart(i) && t < sc[i + 1].start;
  const move = (i: number) => interpolate(t, [depart(i), sc[i + 1].start], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: E });

  let pose = poses[0];
  for (let i = 0; i < sc.length; i++) {
    if (t >= sc[i].start) pose = poses[i];
    if (inMove(i)) {
      const a = poses[i];
      const b = poses[i + 1];
      const p = move(i);
      pose = { cx: a.cx + (b.cx - a.cx) * p, cy: a.cy + (b.cy - a.cy) * p, s: a.s + (b.s - a.s) * p };
    }
  }
  const c = cam(pose);
  const overlayScene = config.overlay ? sc[sc.length - 1] : null;
  const chrome = config.chrome;

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0', transform: `translate(${c.x}px, ${c.y}px) scale(${c.s})` }}>
        {config.stations.map(({ id, Comp }, i) => (
          <div key={id} style={{ position: 'absolute', left: i * W, top: 0, width: W, height: H }}>
            <Sequence from={f(sc[i].start - sc[i].moveIn)} layout="none">
              <SceneClock.Provider value={{ offset: sc[i].moveIn, depart: sc[i].duration, away: sc[i].duration + (sc[i + 1]?.moveIn ?? 0) }}>
                <Comp cues={sc[i].cues} />
              </SceneClock.Provider>
            </Sequence>
          </div>
        ))}
        {config.carriers.map((k) => (inMove(k.after) ? <div key={`c${k.after}`}>{k.render(move(k.after))}</div> : null))}
      </div>

      {config.overlay && overlayScene && (
        <Sequence from={f(overlayScene.start)} layout="none">
          <SceneClock.Provider value={{ offset: 0, depart: Infinity, away: Infinity }}>
            <config.overlay.Comp cues={overlayScene.cues} />
          </SceneClock.Provider>
        </Sequence>
      )}

      {sc.map((s) => (s.audio ? (
        <Sequence key={`v-${s.id}`} from={f(s.start + s.lead)}><Audio src={staticFile(s.audio)} volume={vol.voice} /></Sequence>
      ) : null))}
      {(sb.bridges ?? []).map((b) => (b.audio ? (
        <Sequence key={`b-${b.id}`} from={f(b.at)}><Audio src={staticFile(b.audio)} volume={vol.voice} /></Sequence>
      ) : null))}
      {sc.slice(0, -1).map((s, i) => (
        <Sequence key={`w-${s.id}`} from={Math.max(0, f(depart(i)) - 3)} durationInFrames={f(0.8)}><Audio src={staticFile('sfx/whoosh.wav')} volume={vol.whoosh} /></Sequence>
      ))}
      {config.carriers.map((k) => (
        <Sequence key={`k-${k.after}`} from={f(sc[k.after + 1].start)} durationInFrames={f(0.1)}><Audio src={staticFile('sfx/tick.wav')} volume={vol.tick} /></Sequence>
      ))}
      {sc.flatMap((s) => (config.pops?.[s.id] || []).filter((cue) => s.cues[cue] !== undefined).map((cue) => (
        <Sequence key={`p-${s.id}-${cue}`} from={f(s.start + s.cues[cue])} durationInFrames={f(0.2)}><Audio src={staticFile('sfx/pop.wav')} volume={vol.pop} /></Sequence>
      )))}
      {sb.music && sb.music.envelope.length > 1 && (
        <Audio src={staticFile(sb.music.file)} loop volume={(fr) => interpolate(fr / fps, sb.music!.envelope.map((k) => k[0]), sb.music!.envelope.map((k) => k[1]), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      )}
      {sb.sting && (
        <Sequence from={f(sb.sting.at)} durationInFrames={f(sb.sting.duration)}><Audio src={staticFile('sfx/sting.wav')} volume={vol.sting} /></Sequence>
      )}

      <Captions pages={sb.captions} />
      {chrome && (
        <div style={{ position: 'absolute', left: 60, top: 44, display: 'flex', alignItems: 'center', gap: 12, font: `600 22px/1 ${SANS}`, color: C.muted, opacity: overlayScene ? interpolate(t, [overlayScene.start - 1.5, overlayScene.start - 0.5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1 }}>
          {chrome.logo && <Img src={staticFile(chrome.logo)} style={{ height: 30, width: 'auto' }} />}{chrome.text}
        </div>
      )}
    </AbsoluteFill>
  );
};
