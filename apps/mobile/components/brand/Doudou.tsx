import { DOUDOU_MARK_VIEWBOX, getDoudouArt, getDoudouIcon, type DoudouPose, type DoudouShape } from '@firebuddy/shared';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { doudouColors } from '@/constants/tokens';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/lib/theme';

export type DoudouMotion = 'none' | 'idle' | 'think' | 'celebrate' | 'sleep';

interface SlotColors {
  shadow: string;
  cover: string;
  line: string;
  tile: string;
}

const NO_SLOTS: SlotColors = { shadow: 'transparent', cover: 'transparent', line: 'transparent', tile: 'transparent' };

/** Resolves the `$` slots in the shared art to theme colours, so DouDou follows light and dark mode. */
function resolve(value: string | undefined, slots: SlotColors) {
  if (!value || !value.startsWith('$')) return value;
  return slots[value.slice(1) as keyof SlotColors];
}

/** Draws shared shape descriptors with react-native-svg. Exported for the launch screen, whose art has no `$` slots. */
export function Shapes({ shapes, slots = NO_SLOTS }: { shapes: DoudouShape[]; slots?: SlotColors }) {
  return (
    <>
      {shapes.map((shape, index) => {
        const common = {
          fill: resolve(shape.fill, slots) ?? 'none',
          stroke: resolve(shape.stroke, slots),
          strokeWidth: shape.strokeWidth,
          strokeLinecap: shape.stroke ? ('round' as const) : undefined,
          strokeLinejoin: shape.stroke ? ('round' as const) : undefined,
          opacity: shape.opacity,
          transform: shape.transform,
        };
        switch (shape.type) {
          case 'path':
            return <Path key={index} d={shape.d} {...common} />;
          case 'circle':
            return <Circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
          case 'ellipse':
            return <Ellipse key={index} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />;
          case 'rect':
            return <Rect key={index} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} {...common} />;
        }
      })}
    </>
  );
}

function useSlots(cover?: string): SlotColors {
  const { theme, scheme } = useTheme();
  return {
    shadow: scheme === 'dark' ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 29, 61, 0.12)',
    cover: cover ?? theme.surface,
    line: theme.line,
    tile: theme.brandMarkFill,
  };
}

/** Small looping movements. Each one returns to rest, and all of them stop when the phone asks for reduced motion. */
function useMotionStyle(motion: DoudouMotion) {
  const reduceMotion = useReduceMotion();
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);

  useEffect(() => {
    const values = [translateY, rotate, scaleX, scaleY];
    values.forEach(cancelAnimation);
    translateY.value = 0;
    rotate.value = 0;
    scaleX.value = 1;
    scaleY.value = 1;
    if (reduceMotion || motion === 'none') return undefined;

    // The live setting above already decides whether to move, so Reanimated's cached copy must not override it.
    const never = ReduceMotion.Never;
    const ease = Easing.inOut(Easing.sin);
    // Pass `easing` only when given: an explicit `easing: undefined` replaces Reanimated's default
    // and crashes with "undefined is not a function" at timing (seen on the celebrate pose).
    const to = (value: number, duration: number, easing?: (t: number) => number) =>
      withTiming(value, easing ? { duration, easing, reduceMotion: never } : { duration, reduceMotion: never });
    const loop = (animation: number, reverse = false) => withRepeat(animation, -1, reverse, undefined, never);
    const rest = (value: number, delay: number) => withDelay(delay, to(value, 1), never);

    if (motion === 'idle') {
      translateY.value = loop(to(-4, 1600, ease), true);
    } else if (motion === 'think') {
      rotate.value = withSequence(never, to(-4, 600, ease), loop(to(4, 1200, ease), true));
    } else if (motion === 'sleep') {
      scaleX.value = loop(to(1.03, 1800, ease), true);
      scaleY.value = loop(to(0.98, 1800, ease), true);
    } else if (motion === 'celebrate') {
      // Squash, jump, land, then rest before the next hop.
      translateY.value = loop(withSequence(never, to(0, 140), to(-16, 250, Easing.out(Easing.quad)), to(0, 290, Easing.in(Easing.quad)), rest(0, 1100)));
      scaleY.value = loop(withSequence(never, to(0.9, 140), to(1.07, 250), to(0.93, 290), to(1, 180), rest(1, 920)));
      scaleX.value = loop(withSequence(never, to(1.08, 140), to(0.94, 250), to(1.07, 290), to(1, 180), rest(1, 920)));
    }

    return () => values.forEach(cancelAnimation);
  }, [motion, reduceMotion, translateY, rotate, scaleX, scaleY]);

  return useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));
}

interface DoudouProps {
  pose?: DoudouPose;
  size?: number;
  motion?: DoudouMotion;
  /** Accessible name. Leave empty when nearby text already says what is happening. */
  label?: string;
  /** Colour behind the peeking ledge. Defaults to the card surface. */
  coverColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * DouDou, FireBuddy's mascot and AI guide, in one of its eight poses.
 * Use it for moments such as welcomes, tips, empty and error states, never beside figures, and at most once per screen.
 * The ground shadow, ledge and props stay still while the figure moves.
 */
export function Doudou({ pose = 'hello', size = 96, motion = 'none', label, coverColor, style }: DoudouProps) {
  const art = getDoudouArt(pose, doudouColors);
  const slots = useSlots(coverColor);
  const motionStyle = useMotionStyle(motion);
  const a11y = label
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

  return (
    <View style={[{ width: size, height: size }, style]} {...a11y}>
      <Svg width={size} height={size} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Shapes shapes={art.shadow} slots={slots} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, styles.figure, motionStyle]}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          <G transform={art.tilt ? `rotate(${art.tilt} 60 108)` : undefined}>
            <Shapes shapes={art.leaves} slots={slots} />
            <Shapes shapes={art.body} slots={slots} />
            <Shapes shapes={art.eyes} slots={slots} />
            <Shapes shapes={art.mouth} slots={slots} />
          </G>
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Shapes shapes={art.cover} slots={slots} />
        <Shapes shapes={art.extras} slots={slots} />
      </Svg>
    </View>
  );
}

/** Just DouDou's bean and face, cropped square, for chat avatars and shortcut tiles. Never animates. */
export function DoudouMark({ size = 24 }: { size?: number }) {
  const art = getDoudouArt('hello', doudouColors);
  const slots = useSlots();
  return (
    <Svg width={size} height={size} viewBox={DOUDOU_MARK_VIEWBOX} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Shapes shapes={art.leaves} slots={slots} />
      <Shapes shapes={art.body} slots={slots} />
      <Shapes shapes={art.eyes} slots={slots} />
      <Shapes shapes={art.mouth} slots={slots} />
    </Svg>
  );
}

/** The app icon art: DouDou on the forest tile. Below 24 points the cheeks and smile drop out. */
export function DoudouIcon({ size = 36 }: { size?: number }) {
  const slots = useSlots();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Shapes shapes={getDoudouIcon(size < 24, doudouColors)} slots={slots} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  // Moves and squashes around the feet, like the web version.
  figure: {
    transformOrigin: '50% 100%',
  },
});
