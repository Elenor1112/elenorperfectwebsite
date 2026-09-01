import type { StaticImageData } from 'next/image';

import mednetSrc from '@/assets/Our Work/Our Work icon-02.png';
import saintGobainSrc from '@/assets/Our Work/Our Work icon-03.png';
import elenorSrc from '@/assets/Our Work/Our Work icon-04.png';
import duravitSrc from '@/assets/Our Work/Our Work icon-05.png';
import cocaColaSrc from '@/assets/Our Work/Our Work icon-06.png';

/**
 * The one place a hero gear is bound to its artwork, mirroring SERVICE_ICONS.
 *
 * Every file is a cog badge — teal gear ring, white hub, client logo in the hub
 * — but each sits on a DIFFERENT canvas (653x739 up to 1162x1203) with a
 * different amount of transparent padding, and two of them are measurably
 * off-centre. Both facts matter here in a way they do not for a static logo:
 * the gears SPIN, so any offset between the artwork's centre and its box centre
 * becomes a visible wobble once the thing turns.
 *
 * `fillX`/`fillY` are the alpha bbox over the canvas on each axis, and
 * `offsetX`/`offsetY` are how far the ink's centre sits off the canvas centre as
 * a share of the canvas. Values below are emitted by scripts/measure-work-gears.mjs
 * — re-run it if any artwork is replaced rather than eyeballing new numbers.
 */
export type WorkGear = {
  src: StaticImageData;
  fillX: number;
  fillY: number;
  /** Ink-centre offset from canvas centre, share of canvas. Corrected on render. */
  offsetX: number;
  offsetY: number;
};

/**
 * White hub radius over the gear's outer radius, measured on the artwork.
 *
 * All five files agree to three decimals (0.553 / 0.552 / 0.551 / 0.552 / 0.552
 * by ray-scanning each PNG for the largest fully-white radius), and the clip
 * itself measures 64.1/117.9 = 0.544 — so one shared constant is honest here
 * rather than a per-file value.
 *
 * This is load-bearing, not decorative: the logos in the clip do NOT turn with
 * their gears. Sampling the second-moment principal axis of the dark logo ink
 * inside each hub gives a constant orientation across the whole spin
 * (Coca-Cola 178.95 -> 178.86 deg, Duravit 179.09 flat, Saint-Gobain 175.59 ->
 * 175.55, the "e" 143.32 -> 143.34 over 2.5s) while the teeth advance at
 * 35 deg/s. The artwork bakes logo and ring into one bitmap, so each gear is
 * drawn twice and clipped at this radius: the ring spins, the hub does not.
 */
export const HUB_RATIO = 0.552;

// Measured with scripts/measure-work-gears.mjs. All five alpha bboxes are square
// (aspect 1.000 +/- 0.002), which is why there is no `aspect` field: unlike the
// service icons, a square box is honest for every one of these.
export const WORK_GEARS = {
  elenor: { src: elenorSrc, fillX: 0.841, fillY: 0.812, offsetX: 0.014, offsetY: 0.014 },
  'coca-cola': { src: cocaColaSrc, fillX: 0.807, fillY: 0.811, offsetX: 0.006, offsetY: -0.008 },
  duravit: { src: duravitSrc, fillX: 0.77, fillY: 0.89, offsetX: -0.033, offsetY: -0.007 },
  'saint-gobain': { src: saintGobainSrc, fillX: 0.764, fillY: 0.71, offsetX: 0.044, offsetY: 0.007 },
  // The reference clip's fifth gear is GSK; the supplied artwork set ships
  // mednet in that slot and no GSK cog badge exists. Swapping this one import
  // (and the label in WorkGearsAnimation's SLOTS) is all that is needed if a
  // GSK badge is produced later.
  mednet: { src: mednetSrc, fillX: 0.758, fillY: 0.671, offsetX: 0.0, offsetY: -0.009 },
} satisfies Record<string, WorkGear>;

export type WorkGearKey = keyof typeof WORK_GEARS;

/**
 * Client names the gear cluster shows, in the clip's paint order.
 *
 * This lives here rather than being exported from WorkGearsAnimation because
 * that module is `'use client'`: anything it exports becomes a client
 * reference, so a server component calling `.join()` on an array from there
 * fails with "Attempted to call join() from the server". Plain data shared
 * across the boundary has to come from a module that is neutral about which
 * side it runs on.
 */
export const WORK_GEAR_LABELS = ['Coca-Cola', 'Duravit', 'Saint-Gobain', 'Mednet', 'Elenor'] as const;
