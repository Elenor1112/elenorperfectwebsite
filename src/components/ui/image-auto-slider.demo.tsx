// Demos for <ImageAutoSlider />. Each export is one usecase.

import { ImageAutoSlider, type SliderImage } from '@/components/ui/image-auto-slider';

import Pantogar from '@/assets/Pantogar Social Media/Pantogar.jpg';
import SaintGobain from '@/assets/Image slider/Saint-Gobain.JPG';
import Duravit1st from '@/assets/Image slider/Duravit1st.PNG';
import Duravit2nd from '@/assets/Image slider/Duravit2nd.PNG';
import Duravit3rd from '@/assets/Image slider/Duravit3rd.PNG';
import CocaCola from '@/assets/Image slider/Coca-Cola.PNG';
import CocaCola2nd from '@/assets/Image slider/Coca-Cola2nd.PNG';
import AlNesr from '@/assets/Image slider/AL-Nesr.PNG';
import BlendHouse from '@/assets/Image slider/BlendHouse.PNG';
import Taza from '@/assets/Taza branding/WhatsApp Image 2026-07-08 at 11.21.40 AM.jpeg';

// Elenor work/campaign photos. href left empty for now.
// Ordered so the same brand never appears twice in a row — including across
// the loop seam (last slide → first slide), since the slider repeats.
const showcaseImages: SliderImage[] = [
  { src: Duravit1st.src, href: '', alt: 'Duravit1st' },
  { src: CocaCola.src, href: '', alt: 'Coca-Cola' },
  { src: SaintGobain.src, href: '', alt: 'Saint-Gobain' },
  { src: Duravit2nd.src, href: '', alt: 'Duravit2nd' },
  { src: AlNesr.src, href: '', alt: 'AL-Nesr' },
  { src: CocaCola2nd.src, href: '', alt: 'Coca-Cola2nd' },
  { src: Duravit3rd.src, href: '', alt: 'Duravit3rd' },
  { src: Pantogar.src, href: '', alt: 'Pantogar' },
  { src: BlendHouse.src, href: '', alt: 'BlendHouse' },
  { src: Taza.src, href: '', alt: 'Taza' },
];

const DemoOne = () => {
  return <ImageAutoSlider images={showcaseImages} />;
};

export { DemoOne, showcaseImages };
