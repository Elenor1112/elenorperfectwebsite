// Builds the About-hero wordmark pair from the source art.
//
//   icon-01.src.png  ->  icon-01.png       "About us" (word space cut in)
//                    ->  icon-01-bold.png  same, one weight heavier
//
// Two problems with the delivered art, both fixed here rather than in CSS:
//
// 1. It sets "Aboutus" solid. The t|u gap is 56px, the same as every other
//    letter gap, so there is no word space at all. We cut the image at the
//    middle of that gap and push the "us" out by SPACE px.
//
// 2. The heavier copy that shows through the lens used to be produced in CSS by
//    stacking nine offset copies of the alpha mask. Those offsets are in CSS px
//    while the art draws ~4x down from source, so the stroke grew ~4x more than
//    intended — counters closed and terminals rounded. Dilating the alpha here,
//    at full source resolution, keeps the letterforms and just adds weight.
//
// Run: node scripts/build-about-wordmark.mjs

import sharp from 'sharp';

const DIR = 'public/assets/about-hero';
const SRC = `${DIR}/icon-01.src.png`;

/** Middle of the t|u gap (measured: ink runs end 1626, resume 1683). */
const CUT = 1655;
/** Extra px of word space. 56 + 190 = 246, ~4.5x a letter gap. */
const SPACE = 190;
/** Dilation radius, source px. Strokes 40 -> 52: a weight step, not a smear. */
const BOLD_R = 6;
/** The art's own ink colour. */
const INK = [0x68, 0xc9, 0xd5];

const { width: W0, height: H } = await sharp(SRC).metadata();
const W = W0 + SPACE;

// ── 1. cut the word space in ───────────────────────────────────────────────
const left = await sharp(SRC).extract({ left: 0, top: 0, width: CUT, height: H }).toBuffer();
const right = await sharp(SRC)
  .extract({ left: CUT, top: 0, width: W0 - CUT, height: H })
  .toBuffer();

await sharp({
  create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    { input: left, left: 0, top: 0 },
    { input: right, left: CUT + SPACE, top: 0 },
  ])
  .png()
  .toFile(`${DIR}/icon-01.png`);

// ── 2. dilate that result into the bold cut ────────────────────────────────
const { data, info } = await sharp(`${DIR}/icon-01.png`)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const alpha = new Uint8Array(info.width * info.height);
for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * info.channels + 3];

// Circular structuring element, stored as a half-width per row.
const spans = [];
for (let dy = -BOLD_R; dy <= BOLD_R; dy++) {
  spans.push([dy, Math.floor(Math.sqrt(BOLD_R * BOLD_R - dy * dy))]);
}

const grown = new Uint8Array(alpha.length);
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    let max = 0;
    for (const [dy, ex] of spans) {
      const ny = y + dy;
      if (ny < 0 || ny >= info.height) continue;
      const row = ny * info.width;
      for (let dx = -ex; dx <= ex; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= info.width) continue;
        const v = alpha[row + nx];
        if (v > max) max = v;
      }
      if (max === 255) break;
    }
    grown[y * info.width + x] = max;
  }
}

const px = Buffer.alloc(alpha.length * 4);
for (let i = 0; i < alpha.length; i++) {
  px[i * 4] = INK[0];
  px[i * 4 + 1] = INK[1];
  px[i * 4 + 2] = INK[2];
  px[i * 4 + 3] = grown[i];
}

await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile(`${DIR}/icon-01-bold.png`);

console.log(`icon-01.png ${W}x${H}, icon-01-bold.png r=${BOLD_R}`);
