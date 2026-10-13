/**
 * Rasterise DouDou, the FireBuddy mark, into the PNGs Expo needs for the app icon, the
 * Android adaptive icon layers, the light and dark splash images and the web favicon.
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

/**
 * Gold Standard (owner, 9 Oct 2026): the golden DouDou on a navy tile with a soft lighter-navy glow,
 * filling the whole icon so the phone's own mask is the only edge. The light splash puts DouDou on
 * the cool white canvas with a dark gold edge. Colours match `brand`, `doudouColors` and
 * `launchPalettes` in constants/tokens.ts and `DOUDOU_GOLD_COLORS` in packages/shared; keep them in step.
 */
const canvas = '#001d3d';
// A lighter navy pool of light behind DouDou; gold glow over navy turns muddy olive.
const glowStops = `<stop offset="0" stop-color="#1f5a99" stop-opacity=".95"/><stop offset=".42" stop-color="#003566" stop-opacity=".7"/><stop offset=".85" stop-color="${canvas}" stop-opacity="0"/>`;
const outline = '#e0a800';
const groundLight = 'rgba(0,29,61,0.12)';
const groundDark = 'rgba(0,0,0,0.35)';
const beanFill = '#ffc300';
const leafDark = '#46a868';
const leafLight = '#7cc47f';
const cheek = '#ff8a65';

/**
 * DouDou on the 48x48 icon canvas, copied from `getDoudouGlyphParts` in packages/shared/src/doudou.ts.
 * Keep the two in step when the mark changes.
 */
const leaves = `
  <path d="M24 17L24 12" stroke="${leafDark}" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M24 13.5C20 7 14 7.5 12.5 10C16 14.5 21 14.5 24 13.5Z" fill="${leafDark}"/>
  <path d="M24 12C27.5 5.5 34 5.5 35.5 7.5C32.5 12 27.5 13 24 12Z" fill="${leafLight}"/>`;
const bean = 'M24 16C34 16 38.5 23.5 38.5 31C38.5 38.5 32.5 42 24 42C15.5 42 9.5 38.5 9.5 31C9.5 23.5 14 16 24 16Z';
const face = `
  <circle cx="19" cy="29" r="2.3" fill="#1d2a22"/><circle cx="29" cy="29" r="2.3" fill="#1d2a22"/>
  <circle cx="18.3" cy="28.2" r=".8" fill="#ffffff"/><circle cx="28.3" cy="28.2" r=".8" fill="#ffffff"/>
  <ellipse cx="15" cy="32.6" rx="2.2" ry="1.3" fill="${cheek}" opacity=".7"/><ellipse cx="33" cy="32.6" rx="2.2" ry="1.3" fill="${cheek}" opacity=".7"/>
  <path d="M22.4 32.6Q24 34.4 25.6 32.6" fill="none" stroke="#1d2a22" stroke-width="1.3" stroke-linecap="round"/>`;

/** DouDou with an optional dark gold edge on the bean and a ground shadow under the feet. */
function doudou({ edge = false, ground } = {}) {
  const shadow = ground ? `<ellipse cx="24" cy="43.2" rx="10" ry="1.6" fill="${ground}"/>` : '';
  const stroke = edge ? ` stroke="${outline}" stroke-width="1.4" stroke-linejoin="round"` : '';
  return `${shadow}${leaves}<path d="${bean}" fill="${beanFill}"${stroke}/>${face}`;
}

/** The navy tile with the gold glow as a full-bleed square, centred a little above the middle. */
function glowRect() {
  return `<defs><radialGradient id="glow" cx="24" cy="22" r="30" gradientUnits="userSpaceOnUse">${glowStops}</radialGradient></defs>
  <rect width="48" height="48" fill="${canvas}"/><rect width="48" height="48" fill="url(#glow)"/>`;
}

/**
 * DouDou scaled about the canvas centre. The art spans y 5.5 to 42, so it is nudged up half a
 * unit to sit on the optical centre. `background` draws the full-bleed glow behind it.
 */
function glyph(size, { scale = 0.62, monochrome = false, background = false, edge = false, ground } = {}) {
  const inset = (1 - scale) / 2;
  const art = monochrome
    ? `<mask id="eyes"><rect width="48" height="48" fill="#fff"/><circle cx="19" cy="29" r="2.6" fill="#000"/><circle cx="29" cy="29" r="2.6" fill="#000"/></mask>
  <g fill="#ffffff" mask="url(#eyes)">
    <path d="M24 17L24 12" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M24 13.5C20 7 14 7.5 12.5 10C16 14.5 21 14.5 24 13.5Z"/>
    <path d="M24 12C27.5 5.5 34 5.5 35.5 7.5C32.5 12 27.5 13 24 12Z"/>
    <path d="${bean}"/>
  </g>`
    : doudou({ edge, ground });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
  ${background ? glowRect() : ''}
  <g transform="translate(${48 * inset} ${48 * inset - 0.5 * scale}) scale(${scale})">${art}</g>
</svg>`;
}

/** The adaptive icon's background layer: the glow alone. */
function glowLayer(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">${glowRect()}</svg>`;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');
await mkdir(outDir, { recursive: true });

const jobs = [
  // iOS and older launchers: one opaque square, the system applies the corner mask.
  ['icon.png', glyph(1024, { scale: 0.78, background: true, ground: groundDark }), 1024],
  ['favicon.png', glyph(96, { scale: 0.86, background: true }), 96],
  // Android adaptive icon: glow behind, DouDou inside the inner 66% safe zone in front.
  ['android-icon-background.png', glowLayer(1024), 1024],
  ['android-icon-foreground.png', glyph(1024, { ground: groundDark }), 1024],
  ['android-icon-monochrome.png', glyph(1024, { monochrome: true }), 1024],
  // Splash art, transparent. Android 12+ masks the splash image to a circle, so DouDou sits at the
  // adaptive-icon safe scale; components/brand/LaunchScreen.tsx starts at this size and pops up.
  ['splash-icon.png', glyph(600, { scale: 0.62, edge: true, ground: groundLight }), 600],
  ['splash-icon-dark.png', glyph(600, { scale: 0.62, ground: groundDark }), 600],
];

for (const [name, svg, size] of jobs) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(join(outDir, name), png);
  console.log(`wrote ${name} (${size}px)`);
}
