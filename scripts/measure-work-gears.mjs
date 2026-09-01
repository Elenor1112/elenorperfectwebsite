// Emits the fillX/fillY/offsetX/offsetY values in src/lib/workGears.ts by
// measuring each gear badge's alpha bounding box. Re-run after replacing any
// artwork and paste the numbers in, rather than estimating them by eye.
//
//   node scripts/measure-work-gears.mjs
//
// `offset` matters more here than it does for the service icons: these gears
// SPIN, so ink that sits off the canvas centre traces a visible circle instead
// of turning in place. WorkGearsAnimation corrects for it, which is why the
// number is recorded rather than just flagged.
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const dir = 'src/assets/Our Work';
for (const f of (await readdir(dir)).filter((f) => f.endsWith('.png')).sort()) {
  const img = sharp(path.join(dir, f));
  const { width, height } = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width,
    y0 = info.height,
    x1 = -1,
    y1 = -1;
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
  const w = x1 - x0 + 1,
    h = y1 - y0 + 1;
  const cx = (x0 + x1 + 1) / 2,
    cy = (y0 + y1 + 1) / 2;
  console.log(
    f.padEnd(22),
    `canvas ${width}x${height}`,
    `bbox ${w}x${h}`,
    `aspect ${(w / h).toFixed(4)}`,
    `fillX: ${(w / width).toFixed(3)}, fillY: ${(h / height).toFixed(3)},`,
    `offsetX: ${((cx - width / 2) / width).toFixed(3)}, offsetY: ${((cy - height / 2) / height).toFixed(3)}`,
  );
}
