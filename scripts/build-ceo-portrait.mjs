// Builds the CEO portrait cutout used by the About page's "CEO's Word" section.
//
//   emad-samir.src.png  ->  emad-samir-cutout.png
//
// The delivered photo is a rectangular JPEG shot against a defocused office
// interior — a waist-up portrait, arms crossed, cropped mid-thigh by the frame.
// The section composites the figure over the card ground, which needs a real
// alpha channel — so the background is removed first, outside this script:
//
//   python -m venv venv && venv/Scripts/pip install "rembg[cpu]"
//   rembg i -m isnet-general-use -a -ae 11 <photo>.jpeg emad-samir.src.png
//
// `rembg[cpu]` does not ship the CLI entry point (that needs the extra `cli`
// extra, which drags in a web server we have no use for), so the equivalent is
// driven through the Python API: new_session('isnet-general-use') and
// remove(data, session=..., alpha_matting=True, alpha_matting_erode_size=11).
//
// `isnet-general-use` beats the default u2net on a half-body studio portrait
// (cleaner lapel and shoulder edges), and -a (alpha matting) is what keeps the
// hair boundary from going blocky. That step is one-off and its 179MB model has
// no business in this repo, hence the checked-in .src.png. This script is the
// reproducible half: what turns that raw matte into the shipped asset.
//
// Two fixes applied here rather than in CSS:
//
// 1. Fringe. Segmentation leaves a 1-2px rim of background-coloured pixels on
//    low-contrast edges (here: grey suit against the beige pillar). Eroding the
//    alpha eats it. Eroding alone reads as cut-with-scissors, so a sub-pixel
//    blur follows to hand the edge back its softness.
//
// 2. Size. The source is 928x1152, whose figure bbox is ~679x1025 — more height
//    than the layout can use, since the section caps the figure at a 26rem
//    (416px) box. MAX_H therefore downscales rather than clamping.
//
// The subject is cropped by the source frame on the bottom edge only (the alpha
// bbox runs to y=1151); transparent margin is trimmed on the other three sides.
// The logged bounding box is what the section's ELBOW_CROP fraction in
// AboutContent.tsx is measured against — re-read it and re-check that fraction
// if the portrait is ever re-cut.
//
// Run: node scripts/build-ceo-portrait.mjs

import sharp from 'sharp';

const DIR = 'src/assets/CEO';
const SRC = `${DIR}/emad-samir.src.png`;
const OUT = `${DIR}/emad-samir-cutout.png`;

/** Alpha erosion radius, source px. 1px: enough for the fringe, short of the edge. */
const ERODE_R = 1;
/** Alpha below this after the erosion blur is cleared. High = a real pull-back. */
const ERODE_CUT = 160;
/** Alpha at or below this counts as empty when measuring the figure's box. */
const ALPHA_FLOOR = 20;
/** Feather applied after eroding, source px. Sub-pixel — softens without haloing. */
const FEATHER = 0.5;
/** Output height. At the layout's 416px xl box this is a touch over 2x. */
const MAX_H = 900;

const src = sharp(SRC);
const { width: W0, height: H0 } = await src.metadata();

// ── 1. trim the transparent margin ─────────────────────────────────────────
// `trim` needs to know what to cut against; on an RGBA source it uses the alpha
// channel, so this reduces to the subject's own bounding box.
const trimmed = await sharp(SRC).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
const { width: W1, height: H1 } = trimmed.info;

// ── 2. erode + feather the alpha ───────────────────────────────────────────
// Worked on the alpha channel alone, then re-joined: blurring the colour
// channels too would smear the suit texture into the background.
const rgb = await sharp(trimmed.data).removeAlpha().raw().toBuffer();

// sharp has no morphological min filter, so erosion is done the equivalent way
// for a near-binary mask: blur by the radius, then push everything below
// ERODE_CUT to zero. Blurring bleeds transparency inward across the boundary,
// and the high cutoff keeps only pixels that were solidly interior — which
// retreats the edge by ~ERODE_R and takes the fringe with it. Feathering after
// (not before) means the softness is applied to the already-pulled-back edge.
const alpha = await sharp(trimmed.data)
  .extractChannel(3)
  .blur(ERODE_R)
  .linear(255 / (255 - ERODE_CUT), (-255 * ERODE_CUT) / (255 - ERODE_CUT))
  .blur(FEATHER)
  .raw()
  .toBuffer();

const cleaned = await sharp(rgb, {
  raw: { width: W1, height: H1, channels: 3 },
})
  .joinChannel(alpha, { raw: { width: W1, height: H1, channels: 1 } })
  .png()
  .toBuffer();

// ── 3. re-trim after eroding ───────────────────────────────────────────────
// The erode in step 2 pulls the silhouette in by ~ERODE_R on every side,
// including the ones the step-1 trim had already cut flush. That leaves a thin
// fully-transparent band around the figure — and the section renders the
// portrait with `object-top`, which pins the *image box* to the top of the
// frame, not the figure. A transparent band at the top therefore reads on the
// page as the figure hanging low, and shifts where the elbow crop lands on his
// body. Trimming again reseats the box on the ink.
// `trim` can't do this job: it keys off the corner pixel's colour and leaves
// rows whose alpha the erode dropped to a low-but-nonzero value, which is
// exactly what this band is. So the box is measured directly off the alpha,
// counting any pixel at or under ALPHA_FLOOR as empty.
const { data: aTmp, info: iTmp } = await sharp(cleaned)
  .extractChannel(3)
  .raw()
  .toBuffer({ resolveWithObject: true });

const solidAt = (x, y) => aTmp[y * iTmp.width + x] > ALPHA_FLOOR;
let x0 = iTmp.width, y0 = iTmp.height, x1 = -1, y1 = -1;
for (let y = 0; y < iTmp.height; y++) {
  for (let x = 0; x < iTmp.width; x++) {
    if (!solidAt(x, y)) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
}

const retrimmed = await sharp(cleaned)
  .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
  .toBuffer({ resolveWithObject: true });
const { width: W2, height: H2 } = retrimmed.info;

// ── 4. resize to the shipped height ────────────────────────────────────────
const scale = Math.min(1, MAX_H / H2);
const W3 = Math.round(W2 * scale);
const H3 = Math.round(H2 * scale);

await sharp(retrimmed.data)
  .resize(W3, H3, { fit: 'fill', kernel: 'lanczos3' })
  .png({ compressionLevel: 9, palette: false })
  .toFile(OUT);

// ── 5. report ──────────────────────────────────────────────────────────────
// The section's ELBOW_CROP fraction is tuned against these numbers.
const outMeta = await sharp(OUT).metadata();
const bbox = await sharp(OUT).extractChannel(3).stats();

// Guard the failure this script shipped once: any transparent band left on an
// edge shifts the figure inside its box on the page. `object-top` makes the top
// edge the one that shows, so check it explicitly.
const { data: aOut, info: iOut } = await sharp(OUT).extractChannel(3).raw().toBuffer({ resolveWithObject: true });
let blankTop = 0;
for (let y = 0; y < iOut.height; y++) {
  let solid = false;
  for (let x = 0; x < iOut.width; x++) if (aOut[y * iOut.width + x] > 20) { solid = true; break; }
  if (solid) break;
  blankTop++;
}

console.log(`source     ${W0}x${H0}`);
console.log(`trimmed    ${W1}x${H1}  (margin cut: ${W0 - W1}px w, ${H0 - H1}px h)`);
console.log(`re-trimmed ${W2}x${H2}  (erode margin cut: ${W1 - W2}px w, ${H1 - H2}px h)`);
console.log(`output     ${outMeta.width}x${outMeta.height}  ->  ${OUT}`);
console.log(`alpha      min ${bbox.channels[0].min}, max ${bbox.channels[0].max}`);
console.log(`blank rows at top: ${blankTop} ${blankTop === 0 ? '(ok)' : '(WARN: figure will sit low)'}`);

// ── 6. where do the elbows sit? ────────────────────────────────────────────
// The collapsed state crops at the elbows, and the section expresses that as a
// single fraction of the figure's height (ELBOW_CROP in AboutContent.tsx). The
// crossed forearms are the widest part of this silhouette, so the row-width
// profile finds them without anyone eyeballing the PNG: the width peaks at the
// elbow points, then falls away as the forearms end. The fraction wants to be
// just past where that fall stops — below the arms, on the jacket, so the
// section's fade-out mask has something to dissolve through.
const widths = [];
for (let y = 0; y < iOut.height; y++) {
  let l = -1;
  let r = -1;
  for (let x = 0; x < iOut.width; x++) {
    if (aOut[y * iOut.width + x] <= ALPHA_FLOOR) continue;
    if (l < 0) l = x;
    r = x;
  }
  widths.push(l < 0 ? 0 : r - l + 1);
}
const peak = widths.reduce((b, w, y) => (w > widths[b] ? y : b), 0);
// Walk down from the peak until the silhouette stops narrowing: that plateau is
// the torso below the arms. The profile wiggles by a pixel or two from row to
// row, so a strict `next < current` test stops on the first bit of noise —
// compare against a running minimum with a small tolerance instead, and only
// call it done after the width has held steady for a stretch.
const NOISE = 4;
// The descent from the elbow points to the waist is gradual and terraced — it
// plateaus for stretches longer than a naive window before dropping again — so
// the hold has to span a good slice of the figure, not a handful of rows.
const HOLD = Math.max(40, Math.round(widths.length * 0.08));
let taper = peak;
let floorW = widths[peak];
let held = 0;
for (let y = peak + 1; y < widths.length; y++) {
  if (widths[y] < floorW - NOISE) {
    floorW = widths[y];
    taper = y;
    held = 0;
  } else if (++held >= HOLD) {
    break;
  }
}
const frac = (y) => (y / (iOut.height - 1)).toFixed(3);
console.log(`elbow peak  y ${peak} (frac ${frac(peak)}), width ${widths[peak]}`);
console.log(`arms end    y ${taper} (frac ${frac(taper)}), width ${widths[taper]}`);
console.log(`  -> ELBOW_CROP wants to sit just past ${frac(taper)}`);
