// Emits the aspect/fillX/fillY values in src/lib/serviceIcons.ts by measuring
// each file's alpha bounding box. Re-run after replacing any service artwork
// and paste the numbers in, rather than estimating them by eye — a hand-set
// value once shrank the sofa icon to 77% of every other icon's size.
//
//   node scripts/measure-icons.mjs
//
// `offset` is how far the ink sits off the canvas centre; it should stay near
// 0% on both axes, since both consumers centre the artwork in its box.
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const dir = 'src/assets/Services';
for (const f of (await readdir(dir)).filter((f) => f.endsWith('.png')).sort()) {
  const img = sharp(path.join(dir, f));
  const { width, height } = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2;
  console.log(
    f.padEnd(22),
    `bbox ${w}x${h}`,
    `aspect: ${w} / ${h},`,
    `fillX: ${(w / width).toFixed(3)}, fillY: ${(h / height).toFixed(3)},`,
    `offset ${((cx - width / 2) / width * 100).toFixed(1)}% ${((cy - height / 2) / height * 100).toFixed(1)}%`,
  );
}
