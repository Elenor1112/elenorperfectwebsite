// Demos for <ImageAutoSlider />. Each export is one usecase.

import { ImageAutoSlider, type SliderImage } from '@/components/ui/image-auto-slider';

import Pantogar from '@/assets/Pantogar Social Media/Pantogar.jpg';
import SaintGobain from '@/assets/Image slider/Saint-Gobain.JPG';
import Duravit1st from '@/assets/Image slider/Duravit1st.PNG';
import Duravit2nd from '@/assets/Image slider/Duravit2nd.PNG';
import Duravit3rd from '@/assets/Image slider/Duravit3rd.PNG';
import CocaCola from '@/assets/CocaCola/Event Planning/TOMY9434.JPG';
import CocaCola2nd from '@/assets/Image slider/Coca-Cola2nd.PNG';
import AlNesr from '@/assets/Image slider/AL-Nesr.PNG';
import BlendHouse from '@/assets/Image slider/BlendHouse.PNG';
import Taza from '@/assets/Taza branding/WhatsApp Image 2026-07-08 at 11.21.40 AM.jpeg';

// Elenor work/campaign photos. Each slide links to that brand's case study
// (/work/[slug]). Ordered so the same brand never appears twice in a row —
// including across the loop seam (last slide → first slide), since the slider
// repeats.
const showcaseImages: SliderImage[] = [
  { src: Duravit1st.src, href: '/work/duravit-event', alt: 'Duravit' },
  { src: CocaCola.src, href: '/work/coca-cola', alt: 'Coca-Cola' },
  { src: SaintGobain.src, href: '/work/saint-gobain-social', alt: 'Saint-Gobain' },
  { src: Duravit2nd.src, href: '/work/duravit-event', alt: 'Duravit' },
  { src: AlNesr.src, href: '/work/al-nesr-al-jawhari', alt: 'Al-Nesr Al-Jawhari' },
  { src: CocaCola2nd.src, href: '/work/coca-cola', alt: 'Coca-Cola' },
  { src: Duravit3rd.src, href: '/work/duravit-event', alt: 'Duravit' },
  { src: Pantogar.src, href: '/work/pantogar-social', alt: 'Pantogar' },
  { src: BlendHouse.src, href: '/work/blend-house', alt: 'Blend House' },
  { src: Taza.src, href: '/work/taza-brand', alt: 'Taza' },
];

const DemoOne = () => {
  return <ImageAutoSlider images={showcaseImages} />;
};

export { DemoOne, showcaseImages };
