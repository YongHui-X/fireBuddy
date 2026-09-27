/**
 * Rasterise the FireBuddy sun-on-horizon mark into the PNGs Expo needs for the app icon, the
 * Android adaptive icon layers, the splash image and the web favicon.
 *
 * Run from apps/mobile with sharp fetched on demand (it is not a project dependency):
 *   npx --yes --package sharp node scripts/render-brand-assets.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const forest = '#163a2c';
const lime = '#cbea63';
const white = '#ffffff';

/** The mark on its forest tile, as drawn in apps/web/src/app/BrandMarks.tsx. */
function tileMark(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="13" fill="${forest}"/>
  <path d="M13 28a11 11 0 0 1 22 0Z" fill="${lime}"/>
  <path d="M24 9v4M11 14l3 3M37 14l-3 3" stroke="${white}" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M9 33h30" stroke="${white}" stroke-width="5" stroke-linecap="round"/>
</svg>`;
}

/** The bare glyph, centred inside the adaptive-icon safe zone (inner 66%) on a transparent canvas. */
function glyph(size, { monochrome = false, scale = 0.58 } = {}) {
  const sun = monochrome ? white : lime;
  const inset = (1 - scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
  <g transform="translate(${48 * inset} ${48 * inset}) scale(${scale})">
    <path d="M13 28a11 11 0 0 1 22 0Z" fill="${sun}"/>
    <path d="M24 9v4M11 14l3 3M37 14l-3 3" stroke="${white}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M9 33h30" stroke="${white}" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>`;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');
await mkdir(outDir, { recursive: true });

const jobs = [
  ['icon.png', tileMark(1024), 1024],
  ['favicon.png', tileMark(96), 96],
  ['android-icon-foreground.png', glyph(1024), 1024],
  ['android-icon-monochrome.png', glyph(1024, { monochrome: true }), 1024],
  // Splash sits on a forest background, so the glyph alone is enough.
  ['splash-icon.png', glyph(600, { scale: 0.9 }), 600],
];

for (const [name, svg, size] of jobs) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(join(outDir, name), png);
  console.log(`wrote ${name} (${size}px)`);
}
