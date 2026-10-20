// THIS VIDEO: stations, carriers and sounds. Replace per video (the example is examples/hello-posthouse/post.md).
// Carrier boxes are world px (station i starts at x = i × 1080) and mirror the scene layouts they connect.
import { at, mix, type StageConfig } from '../framework/Stage';
import { C } from '../framework/theme';
import { AXIS, BASE, POST_CARD, POST_PANEL, WAVE, world } from './layout';
import { Hook } from './scenes/Hook';
import { Script } from './scenes/Script';
import { Voice } from './scenes/Voice';
import { Timing } from './scenes/Timing';
import { StageScene } from './scenes/StageScene';
import { CtaOverlay } from './scenes/Cta';

const panel = (p: number, from = C.surface, to = C.surface): React.CSSProperties => ({ background: p < 0.5 ? from : to, border: `2px solid ${C.border}` });

export const config: StageConfig = {
  stations: [
    { id: 's1-hook', Comp: Hook },
    { id: 's2-script', Comp: Script },
    { id: 's3-voice', Comp: Voice },
    { id: 's4-timing', Comp: Timing },
    { id: 's5-stage', Comp: StageScene },
  ],
  carriers: [
    // the post in the feed opens into the post being read
    { after: 0, render: (p) => <div style={{ ...at(mix(world(POST_CARD, 0), world(POST_PANEL, 1), p)), ...panel(p) }} /> },
    // the post becomes the voice's waveform panel
    { after: 1, render: (p) => <div style={{ ...at(mix(world(POST_PANEL, 1), world(WAVE, 2), p)), ...panel(p) }} /> },
    // the waveform flattens into the timeline
    { after: 2, render: (p) => <div style={{ ...at(mix(world(WAVE, 2), world(AXIS, 3), p)), background: p < 0.6 ? C.surface : C.muted, border: `2px solid ${p < 0.6 ? C.border : 'transparent'}` }} /> },
    // the timeline becomes the stage floor
    { after: 3, render: (p) => <div style={{ ...at(mix(world(AXIS, 3), world(BASE, 4), p)), background: C.muted }} /> },
  ],
  pops: {
    's1-hook': ['video'], 's2-script': ['script', 'number'], 's3-voice': ['eleven', 'free', 'none'],
    's4-timing': ['moment'], 's5-stage': ['carrying'], 's6-cta': ['github'],
  },
  overlay: { id: 's6-cta', Comp: CtaOverlay, pose: { cx: 2.5, cy: 0.5, s: 0.18 } },
  chrome: { text: 'posthouse', logo: 'img/posthouse-mark.svg' },
};
