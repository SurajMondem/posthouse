import { Composition } from 'remotion';
import { Stage, type Storyboard } from './framework/Stage';
import { config } from './video/config';
// Written by `npm run storyboard`. Run `npm run voice && npm run storyboard` once before `npm run studio`.
import storyboard from './storyboard.json';

const sb = storyboard as unknown as Storyboard;
const Video: React.FC = () => <Stage sb={sb} config={config} />;

export const RemotionRoot: React.FC = () => (
  <Composition id="Video" component={Video} durationInFrames={Math.round(sb.total * sb.fps)} fps={sb.fps} width={sb.width} height={sb.height} />
);
