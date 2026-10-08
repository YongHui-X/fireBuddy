/**
 * DouDou (豆豆, "little bean") is FireBuddy's mascot and the face of the AI guide.
 * The art is plain shape data so web (SVG) and mobile (react-native-svg) draw the same character.
 * Poses share one 120x120 canvas; the app icon uses its own 48x48 canvas.
 */

export type DoudouPose = 'hello' | 'point' | 'peek' | 'think' | 'yay' | 'oops' | 'shh' | 'sleep';

export const DOUDOU_POSES: readonly DoudouPose[] = ['hello', 'point', 'peek', 'think', 'yay', 'oops', 'shh', 'sleep'];

/** Fill values starting with `$` are slots the renderer resolves, so the art can follow the theme. */
export type DoudouSlot = '$shadow' | '$cover' | '$line' | '$tile';

interface ShapeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  transform?: string;
}

export type DoudouShape =
  | ({ type: 'path'; d: string } & ShapeStyle)
  | ({ type: 'circle'; cx: number; cy: number; r: number } & ShapeStyle)
  | ({ type: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & ShapeStyle)
  | ({ type: 'rect'; x: number; y: number; width: number; height: number; rx?: number } & ShapeStyle);

export interface DoudouArt {
  /** Ground shadow, drawn outside the figure so it stays put while the figure moves. */
  shadow: DoudouShape[];
  /** Stem and leaves, grouped so they can wiggle on their own. */
  leaves: DoudouShape[];
  body: DoudouShape[];
  /** Eyes are grouped so they can blink. */
  eyes: DoudouShape[];
  mouth: DoudouShape[];
  /** Drawn over the figure: the ledge DouDou peeks over. */
  cover: DoudouShape[];
  /** Props around the figure: thinking dots, confetti, a sweat drop, a lock. */
  extras: DoudouShape[];
  /** Whole-figure tilt in degrees, around the feet. */
  tilt: number;
}

export const DOUDOU_COLORS = {
  ink: '#1D2A22',
  bean: '#CBEA63',
  belly: '#E2F5A0',
  leafDark: '#3E8E5A',
  leafLight: '#5FAE6E',
  stem: '#2F6B45',
  cheek: '#F28C8C',
  tongue: '#F07C7C',
  spark: '#D9782D',
  star: '#F2C94C',
  drop: '#8EC5E8',
  forest: '#163A2C',
} as const;

const C = DOUDOU_COLORS;
const CX = 60;
const CY = 74;
const EYE_GAP = 13;
const MOUTH_Y = CY + 10;

function dotEye(x: number, y: number): DoudouShape[] {
  return [
    { type: 'circle', cx: x, cy: y, r: 4.4, fill: C.ink },
    { type: 'circle', cx: x - 1.4, cy: y - 1.5, r: 1.5, fill: '#FFFFFF' },
  ];
}

function dotEyes(dx = 0, dy = 0): DoudouShape[] {
  return [...dotEye(CX - EYE_GAP + dx, CY + dy), ...dotEye(CX + EYE_GAP + dx, CY + dy)];
}

function arcEye(x: number, y: number): DoudouShape {
  return { type: 'path', d: `M${x - 4.5} ${y + 1.5}Q${x} ${y - 5} ${x + 4.5} ${y + 1.5}`, fill: 'none', stroke: C.ink, strokeWidth: 2.8 };
}

function shutEye(x: number, y: number): DoudouShape {
  return { type: 'path', d: `M${x - 4.5} ${y}Q${x} ${y + 4} ${x + 4.5} ${y}`, fill: 'none', stroke: C.ink, strokeWidth: 2.6 };
}

const CHEEKS: DoudouShape[] = [
  { type: 'ellipse', cx: 40, cy: CY + 6, rx: 4.8, ry: 2.8, fill: C.cheek, opacity: 0.6 },
  { type: 'ellipse', cx: 80, cy: CY + 6, rx: 4.8, ry: 2.8, fill: C.cheek, opacity: 0.6 },
];

const SMILE: DoudouShape = {
  type: 'path', d: `M${CX - 5} ${MOUTH_Y}Q${CX} ${MOUTH_Y + 5.5} ${CX + 5} ${MOUTH_Y}`, fill: 'none', stroke: C.ink, strokeWidth: 2.6,
};

function star(x: number, y: number, scale = 1): DoudouShape {
  return {
    type: 'path',
    d: 'M0 -5l1.6 3.4 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z',
    fill: C.star,
    transform: `translate(${x} ${y}) scale(${scale})`,
  };
}

const SHADOW: DoudouShape[] = [{ type: 'ellipse', cx: 60, cy: 110, rx: 27, ry: 4.5, fill: '$shadow' }];

const LEAVES: DoudouShape[] = [
  { type: 'path', d: 'M60 38L60 25', fill: 'none', stroke: C.stem, strokeWidth: 3.4 },
  { type: 'path', d: 'M60 28C50 13 35 16 32 21C41 31 53 31 60 28Z', fill: C.leafDark },
  { type: 'path', d: 'M60 25C68 10 85 10 89 15C82 26 68 28 60 25Z', fill: C.leafLight },
];

const BODY: DoudouShape[] = [
  { type: 'path', d: 'M60 36C84 36 95 56 95 77C95 97 80 107 60 107C40 107 25 97 25 77C25 56 36 36 60 36Z', fill: C.bean },
  { type: 'ellipse', cx: 60, cy: 93, rx: 20, ry: 9.5, fill: C.belly },
  { type: 'ellipse', cx: 42, cy: 52, rx: 6, ry: 3.6, fill: '#FFFFFF', opacity: 0.55, transform: 'rotate(-35 42 52)' },
];

/** Returns the full drawing for one pose. */
export function getDoudouArt(pose: DoudouPose): DoudouArt {
  const art: DoudouArt = { shadow: SHADOW, leaves: LEAVES, body: BODY, eyes: [], mouth: [], cover: [], extras: [], tilt: 0 };

  switch (pose) {
    case 'hello':
      art.eyes = dotEyes();
      art.mouth = [SMILE, ...CHEEKS];
      art.extras = [{ type: 'path', d: 'M95 66C104 60 108 52 106 46C101 50 97 58 95 66Z', fill: C.leafLight }];
      break;
    case 'point':
      art.tilt = -8;
      art.eyes = [...dotEye(CX - EYE_GAP + 1.5, CY), arcEye(CX + EYE_GAP, CY)];
      art.mouth = [SMILE, ...CHEEKS];
      art.extras = [
        { type: 'path', d: 'M94 74C104 72 112 70 116 66C110 64 101 66 94 70Z', fill: C.leafLight },
        star(110, 55),
      ];
      break;
    case 'peek':
      art.eyes = dotEyes(0, -1);
      art.cover = [
        { type: 'rect', x: 0, y: 82, width: 120, height: 38, fill: '$cover' },
        { type: 'path', d: 'M4 82H116', fill: 'none', stroke: '$line', strokeWidth: 2.5 },
        { type: 'ellipse', cx: 44, cy: 82, rx: 6, ry: 4, fill: '#B8DA4E' },
        { type: 'ellipse', cx: 76, cy: 82, rx: 6, ry: 4, fill: '#B8DA4E' },
      ];
      break;
    case 'think':
      art.eyes = dotEyes(1.6, -1.6);
      art.mouth = [{ type: 'circle', cx: CX + 3, cy: MOUTH_Y + 1, r: 2.4, fill: C.ink }, ...CHEEKS];
      art.extras = [
        { type: 'circle', cx: 96, cy: 32, r: 2.6, fill: C.spark },
        { type: 'circle', cx: 103, cy: 23, r: 3.4, fill: C.spark },
        { type: 'circle', cx: 110, cy: 13, r: 4.4, fill: C.spark },
      ];
      break;
    case 'yay':
      art.eyes = [arcEye(CX - EYE_GAP, CY), arcEye(CX + EYE_GAP, CY)];
      art.mouth = [
        { type: 'path', d: `M${CX - 6.5} ${MOUTH_Y - 1}Q${CX} ${MOUTH_Y + 10} ${CX + 6.5} ${MOUTH_Y - 1}Z`, fill: C.ink },
        { type: 'path', d: `M${CX - 3} ${MOUTH_Y + 3.6}Q${CX} ${MOUTH_Y + 6.5} ${CX + 3} ${MOUTH_Y + 3.6}`, fill: C.tongue },
        ...CHEEKS,
      ];
      art.extras = [
        { type: 'rect', x: 12, y: 34, width: 7, height: 3, rx: 1.5, fill: C.spark, transform: 'rotate(-30 15 35)' },
        { type: 'rect', x: 100, y: 40, width: 7, height: 3, rx: 1.5, fill: C.leafLight, transform: 'rotate(25 103 41)' },
        { type: 'circle', cx: 16, cy: 58, r: 2.5, fill: C.cheek },
        { type: 'circle', cx: 106, cy: 60, r: 2.5, fill: C.bean, stroke: '#7FB24A', strokeWidth: 1 },
        star(98, 23, 1.2),
        star(18, 19),
      ];
      break;
    case 'oops':
      art.eyes = dotEyes();
      art.mouth = [{ type: 'path', d: `M${CX - 6} ${MOUTH_Y + 2}q2 -3 4 0t4 0t4 0`, fill: 'none', stroke: C.ink, strokeWidth: 2.4 }];
      art.extras = [{ type: 'path', d: 'M88 52q-4.5 6.5 0 8.5q4.5 -2 0 -8.5z', fill: C.drop }];
      break;
    case 'shh':
      art.eyes = dotEyes(-2.2);
      art.mouth = [...CHEEKS, { type: 'path', d: 'M52 86C56 78 66 78 70 84C64 90 56 90 52 86Z', fill: C.leafDark }];
      art.extras = [
        { type: 'rect', x: 92, y: 44, width: 16, height: 12, rx: 3, fill: C.forest },
        { type: 'path', d: 'M95 44v-4a5 5 0 0 1 10 0v4', fill: 'none', stroke: C.forest, strokeWidth: 2.4 },
        { type: 'circle', cx: 100, cy: 50, r: 1.8, fill: C.bean },
      ];
      break;
    case 'sleep':
      art.eyes = [shutEye(CX - EYE_GAP, CY), shutEye(CX + EYE_GAP, CY)];
      art.mouth = [{ type: 'ellipse', cx: CX, cy: MOUTH_Y + 1, rx: 2, ry: 1.6, fill: C.ink }, ...CHEEKS];
      art.extras = [
        { type: 'path', d: 'M88 25h9l-9 10h9', fill: 'none', stroke: C.leafLight, strokeWidth: 2.6 },
        { type: 'path', d: 'M101 13h6l-6 7h6', fill: 'none', stroke: C.leafLight, strokeWidth: 2 },
      ];
      break;
  }

  return art;
}

/**
 * Chat screens may show only one full DouDou. It belongs to the answer being prepared, otherwise to the
 * most recent failed answer; every other message keeps the small avatar. Returns that message's id, or null.
 */
export function selectDoudouMessageId<T extends { id: string }>(
  messages: readonly T[],
  isThinking: (message: T) => boolean,
  isFailed: (message: T) => boolean,
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (isThinking(messages[index])) return messages[index].id;
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (isFailed(messages[index])) return messages[index].id;
  }
  return null;
}

/** A square crop of the pose canvas that frames just the bean, for avatars and small marks. */
export const DOUDOU_MARK_VIEWBOX = '11 10 98 98';

/** The olive edge drawn round the bean wherever DouDou sits on the pale launch glow (icon and light launch screen). */
export const DOUDOU_GLYPH_OUTLINE = '#5F7D12';

export interface DoudouGlyphParts {
  leaves: DoudouShape[];
  bean: DoudouShape;
  face: DoudouShape[];
}

/**
 * DouDou on the 48-unit icon canvas with no tile, split into parts so the launch screen can wave
 * the leaves on their own. `outline` adds the olive edge to the bean.
 */
export function getDoudouGlyphParts({ tiny = false, outline = false }: { tiny?: boolean; outline?: boolean } = {}): DoudouGlyphParts {
  const face: DoudouShape[] = tiny
    ? [
      { type: 'circle', cx: 19, cy: 29, r: 2.8, fill: C.ink },
      { type: 'circle', cx: 29, cy: 29, r: 2.8, fill: C.ink },
    ]
    : [
      { type: 'circle', cx: 19, cy: 29, r: 2.3, fill: C.ink },
      { type: 'circle', cx: 29, cy: 29, r: 2.3, fill: C.ink },
      { type: 'circle', cx: 18.3, cy: 28.2, r: 0.8, fill: '#FFFFFF' },
      { type: 'circle', cx: 28.3, cy: 28.2, r: 0.8, fill: '#FFFFFF' },
      { type: 'ellipse', cx: 15, cy: 32.6, rx: 2.2, ry: 1.3, fill: C.cheek, opacity: 0.7 },
      { type: 'ellipse', cx: 33, cy: 32.6, rx: 2.2, ry: 1.3, fill: C.cheek, opacity: 0.7 },
      { type: 'path', d: 'M22.4 32.6Q24 34.4 25.6 32.6', fill: 'none', stroke: C.ink, strokeWidth: 1.3 },
    ];

  return {
    leaves: [
      { type: 'path', d: 'M24 17L24 12', fill: 'none', stroke: '#7CC47F', strokeWidth: 1.8 },
      { type: 'path', d: 'M24 13.5C20 7 14 7.5 12.5 10C16 14.5 21 14.5 24 13.5Z', fill: '#7CC47F' },
      { type: 'path', d: 'M24 12C27.5 5.5 34 5.5 35.5 7.5C32.5 12 27.5 13 24 12Z', fill: '#A5DB8A' },
    ],
    bean: {
      type: 'path',
      d: 'M24 16C34 16 38.5 23.5 38.5 31C38.5 38.5 32.5 42 24 42C15.5 42 9.5 38.5 9.5 31C9.5 23.5 14 16 24 16Z',
      fill: C.bean,
      ...(outline ? { stroke: DOUDOU_GLYPH_OUTLINE, strokeWidth: 1.4 } : {}),
    },
    face,
  };
}

/** The original app icon: DouDou on a forest tile. `tiny` drops the cheeks and smile for favicon sizes. Web still uses it. */
export function getDoudouIcon(tiny = false): DoudouShape[] {
  const { leaves, bean, face } = getDoudouGlyphParts({ tiny });
  return [{ type: 'rect', x: 0, y: 0, width: 48, height: 48, rx: 13, fill: '$tile' }, ...leaves, bean, ...face];
}
