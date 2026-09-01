import type { StaticImageData } from 'next/image';

import fingerprintSrc from '@/assets/Services/services icon-02.png';
import circlesSrc from '@/assets/Services/services icon-03.png';
import playSrc from '@/assets/Services/services icon-04.png';
import codeSrc from '@/assets/Services/services icon-05.png';
import sofaSrc from '@/assets/Services/services icon-06.png';
import calendarSrc from '@/assets/Services/services icon-07.png';
import boxSrc from '@/assets/Services/services icon-08.png';
import socialSrc from '@/assets/Services/services icon-09.png';
import printerSrc from '@/assets/Services/services icon-10.png';

/**
 * The one place a service slug is bound to its artwork. Both the hero ring and
 * the service cards read from here, so a card can never end up wearing an icon
 * the ring gives to a different service.
 *
 * Every file is the same 713x673 canvas with the art floating in a lot of
 * transparent padding — from 72% of the canvas (the AI cluster) down to 23%
 * (the play triangle). Rendering the canvas as-is therefore shrinks each icon
 * by its own padding, and by a different amount each time, so both consumers
 * grow the canvas to cancel it.
 *
 * `aspect` is opaque width / opaque height, so a box can take the artwork's
 * real shape instead of always being a square.
 *
 * `fillX` / `fillY` are the opaque bbox's width over the canvas WIDTH and its
 * height over the canvas HEIGHT — measured per axis by scripts/measure-icons.mjs.
 * A single longest-side `fill` is not enough: the canvas is not square (713x673),
 * so for a wide icon the height ratio is not recoverable from the width ratio,
 * and sizing a square box off one axis let the other overflow. Growing the
 * canvas by 1/fillX or 1/fillY puts the ART at the target size on that axis.
 */
export type ServiceIcon = {
  src: StaticImageData;
  aspect: number;
  fillX: number;
  fillY: number;
};

// Values below are emitted verbatim by scripts/measure-icons.mjs — re-run it if
// any artwork is replaced rather than eyeballing new numbers.
export const SERVICE_ICONS: Record<string, ServiceIcon> = {
  'brand-identity': { src: fingerprintSrc, aspect: 355 / 308, fillX: 0.498, fillY: 0.458 },
  // The sofa's fill was once hand-set to 0.666, which is not this file's alpha
  // bbox. Because the canvas is grown by 1/fill, that overstatement shrank the
  // sofa to ~77% of the size every other icon got and it read as visibly
  // undersized in the ring. Measured values only. (The faint drop shadow on
  // this file, the only icon that has one, moves the numbers by <0.01.)
  'interior-design': { src: sofaSrc, aspect: 366 / 364, fillX: 0.513, fillY: 0.541 },
  giveaways: { src: boxSrc, aspect: 263 / 237, fillX: 0.369, fillY: 0.352 },
  'printing-production': { src: printerSrc, aspect: 201 / 189, fillX: 0.282, fillY: 0.281 },
  'event-planning': { src: calendarSrc, aspect: 249 / 185, fillX: 0.349, fillY: 0.275 },
  'ai-motion-graphics': { src: circlesSrc, aspect: 510 / 289, fillX: 0.715, fillY: 0.429 },
  'video-production': { src: playSrc, aspect: 131 / 152, fillX: 0.184, fillY: 0.226 },
  'web-app-development': { src: codeSrc, aspect: 197 / 213, fillX: 0.276, fillY: 0.316 },
  'social-media': { src: socialSrc, aspect: 387 / 386, fillX: 0.543, fillY: 0.574 },
};
