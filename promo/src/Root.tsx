import { Composition, Folder, Still } from 'remotion';
import { Hero, HERO_FRAMES } from './Hero';
import { Promo, type PromoProps } from './Promo';
import { Poster, Social } from './Stills';
import { FPS } from './theme';
import { PROMO_FRAMES } from './timeline';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={PROMO_FRAMES}
      defaultProps={{ lang: 'en' } satisfies PromoProps}
    />
    <Composition id="Hero" component={Hero} width={1280} height={720} fps={FPS} durationInFrames={HERO_FRAMES} />
    <Folder name="Stills">
      <Still id="Social" component={Social} width={1280} height={640} />
      <Still id="Poster" component={Poster} width={1920} height={1080} />
    </Folder>
  </>
);
