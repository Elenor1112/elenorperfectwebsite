// ─────────────────────────────────────────────────────────────────────────────
// BUILD: hero headline glyph outlines from Priestacy
//
// Extracts real glyph outlines from the font file into a static TS module that the
// HeroHeadline component imports. Run at authoring time, not in the browser:
// shipping a 25 KB font + a parser to every visitor, just to draw four words
// that never change, would be pure waste. The generated file is committed.
//
//   npm run build:headline
//
// WHY OUTLINES AND NOT A WEBFONT
// The headline is animated by revealing ink progressively, so each word needs
// to be geometry we can mask and measure — not a text node whose rasterisation
// the browser owns. Outlines also mean no FOUT on the hero's first paint.
//
// WHY PER-WORD PATHS
// The headline face is a connected script: its glyphs deliberately overhang
// their advance widths so strokes run into their neighbours. Laying out
// per-glyph and
// summing advances would be fine, but measuring per-glyph bounding boxes would
// not — the boxes overlap heavily. Each word is therefore rendered as ONE path
// through opentype's own layout (which applies the font's kerning), and its
// extent is taken from that combined path.
// ─────────────────────────────────────────────────────────────────────────────

import opentype from 'opentype.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT = path.join(root, 'src/assets/fonts/Priestacy.otf');
const OUT = path.join(root, 'src/components/hero-headline-glyphs.ts');

// Font size in font units to render at. 1000 = unitsPerEm, so the emitted
// coordinates are em-relative and the component can scale them freely via the
// viewBox. Decimals are rounded to 2 places downstream to keep the file small.
const SIZE = 1000;

/** Words of the headline, in pen order, with their ink colour role. */
const WORDS = [
  { text: 'Where', color: 'white', line: 0 },
  { text: 'Innovation', color: 'cyan', line: 0 },
  { text: 'Meets', color: 'white', line: 1 },
  { text: 'Quality.', color: 'cyan', line: 1 },
];

const font = opentype.parse(fs.readFileSync(FONT).buffer);

const round = (n) => Math.round(n * 100) / 100;

/**
 * Renders one word to a path plus its true ink extent.
 *
 * `getPath` runs the font's own layout, including kerning pairs, so the
 * connected script joins the way the designer intended. The bounding box comes
 * from the resulting composite path, which is the only honest measure of where
 * the ink actually lands (see the overhang note in the file header).
 */
function buildWord({ text, color, line }) {
  const p = font.getPath(text, 0, 0, SIZE);
  const bb = p.getBoundingBox();
  return {
    text,
    color,
    line,
    d: p.toPathData(2),
    // Ink extents, relative to the baseline origin the path was drawn at.
    minX: round(bb.x1),
    maxX: round(bb.x2),
    minY: round(bb.y1),
    maxY: round(bb.y2),
  };
}

const words = WORDS.map(buildWord);

// Sanity check: a missing glyph silently renders as .notdef, which would ship a
// row of boxes into the hero. Fail the build instead.
const chars = [...new Set(WORDS.map((w) => w.text).join('').replace(/ /g, ''))];
const missing = chars.filter((c) => font.charToGlyph(c).index === 0);
if (missing.length) {
  console.error(`Font is missing glyphs: ${missing.join(', ')}`);
  process.exit(1);
}

const banner = `// GENERATED FILE — do not edit by hand.
// Source: ${path.relative(root, FONT).replace(/\\/g, '/')}
// Regenerate: npm run build:headline  (scripts/build-headline-glyphs.mjs)
//
// Real Priestacy glyph outlines for the hero headline, laid out
// per word with the font's own kerning. Coordinates are in a ${SIZE}-unit em
// with y pointing DOWN (SVG convention, already flipped by opentype).`;

const body = `${banner}

export type HeadlineWord = {
  /** The literal text, kept for the accessible heading and for debugging. */
  text: string;
  /** Ink colour role — cyan words get the glow + post-write pulse. */
  color: 'white' | 'cyan';
  /** Which headline line this word belongs to (0-indexed). */
  line: number;
  /** Filled outline path data for the whole word. */
  d: string;
  /** True ink extents of \`d\`, relative to the word's baseline origin. */
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/** Em size the coordinates above were generated at. */
export const EM = ${SIZE};

export const HEADLINE_WORDS: HeadlineWord[] = ${JSON.stringify(words, null, 2)};
`;

fs.writeFileSync(OUT, body, 'utf8');

const kb = (Buffer.byteLength(body) / 1024).toFixed(1);
console.log(`Wrote ${path.relative(root, OUT)} (${kb} KB)`);
for (const w of words) {
  console.log(`  ${w.text.padEnd(12)} x[${w.minX}, ${w.maxX}]  y[${w.minY}, ${w.maxY}]`);
}
