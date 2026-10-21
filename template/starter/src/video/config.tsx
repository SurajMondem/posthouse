// THIS VIDEO: stations, carriers and sounds. A two-scene starter; replace the stations with your own scenes and add
// carriers between them (docs/stage-api.md). The example video's code is in template/src/video/ for reference.
import type { StageConfig } from '../framework/Stage';
import { title } from './scenes/Title';

export const config: StageConfig = {
  stations: [
    { id: 's1-hook', Comp: title('Start here', 'Your opening line lands here.', 'opening') },
    { id: 's2-point', Comp: title('Then', 'One idea per scene, acted out on screen.', 'idea') },
  ],
  carriers: [],
  pops: { 's1-hook': ['opening'] },
};
