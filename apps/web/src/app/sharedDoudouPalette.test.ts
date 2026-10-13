import { describe, expect, it } from 'vitest';
import {
  DOUDOU_COLORS,
  DOUDOU_GOLD_COLORS,
  DOUDOU_POSES,
  getDoudouArt,
  getDoudouGlyphParts,
  getDoudouIcon,
  type DoudouArt,
  type DoudouShape,
} from '@firebuddy/shared';

const shapesOf = (art: DoudouArt): DoudouShape[] => [...art.shadow, ...art.leaves, ...art.body, ...art.eyes, ...art.mouth, ...art.cover, ...art.extras];
const paints = (shapes: DoudouShape[]) => shapes.flatMap((shape) => [shape.fill, shape.stroke]).filter(Boolean);

describe('DouDou palettes', () => {
  it('keeps the default (web) art in the lime palette', () => {
    expect(getDoudouArt('hello')).toEqual(getDoudouArt('hello', DOUDOU_COLORS));
    expect(paints(shapesOf(getDoudouArt('hello')))).toContain(DOUDOU_COLORS.bean);
    expect(getDoudouGlyphParts({ outline: true }).bean.stroke).toBe(DOUDOU_COLORS.outline);
  });

  it('repaints every pose in the gold palette with no lime left', () => {
    const lime = [DOUDOU_COLORS.bean, DOUDOU_COLORS.belly, DOUDOU_COLORS.ledge, DOUDOU_COLORS.forest];
    for (const pose of DOUDOU_POSES) {
      const gold = paints(shapesOf(getDoudouArt(pose, DOUDOU_GOLD_COLORS)));
      for (const colour of lime) expect(gold).not.toContain(colour);
    }
    expect(paints(shapesOf(getDoudouArt('hello', DOUDOU_GOLD_COLORS)))).toContain(DOUDOU_GOLD_COLORS.bean);
  });

  it('repaints the icon glyph, leaving the tile slot for the theme', () => {
    const icon = getDoudouIcon(false, DOUDOU_GOLD_COLORS);
    expect(icon[0].fill).toBe('$tile');
    expect(paints(icon)).toContain(DOUDOU_GOLD_COLORS.bean);
    expect(paints(icon)).not.toContain(DOUDOU_COLORS.bean);
    expect(getDoudouGlyphParts({ outline: true, colors: DOUDOU_GOLD_COLORS }).bean.stroke).toBe(DOUDOU_GOLD_COLORS.outline);
  });
});
