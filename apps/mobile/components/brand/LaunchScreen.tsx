import { getDoudouGlyphParts } from '@firebuddy/shared';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useColorScheme, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, G, RadialGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { BRAND_TAGLINE, fonts, launchPalettes } from '@/constants/tokens';

import { Shapes } from './Doudou';

/** DouDou's box at full size, matching app.json `imageWidth` 160. The art fills 0.9 of it. */
const ART_SIZE = 160;
const GLYPH = 'translate(2.4 1.95) scale(0.9)';
/** Spare room round the art so the hop, squash and leaf wave never reach an edge and get clipped. */
const ROOM = 32;
const STAGE = ART_SIZE + ROOM * 2;
/**
 * The native splash PNG draws DouDou at 0.62 of its canvas so Android's circle mask never cuts
 * him. The overlay starts at the same size (0.62 / 0.9 of full) and pops up from there.
 */
const START_SCALE = 0.62 / 0.9;
/** The text starts this far below the centre: DouDou's ground line (about 61pt) plus a clear gap. */
const TEXT_OFFSET = 92;

// The phone's reduce-motion setting is read below and decides the whole timeline, so Reanimated
// must not also skip delays or steps on its own.
const never = ReduceMotion.Never;
const to = (value: number, duration: number, easing: (t: number) => number = Easing.inOut(Easing.quad)) =>
  withTiming(value, { duration, easing, reduceMotion: never });
const after = (ms: number, animation: number) => withDelay(ms, animation, never);

interface LaunchScreenProps {
  /** True once fonts and stored data are loaded and the app underneath can be shown. */
  ready: boolean;
  onDone: () => void;
}

/**
 * FireBuddy's launch moment. It sits on top of the app and starts as a copy of the native splash
 * (same colour, same small DouDou in the middle), so hiding the native splash shows no change.
 * Then the glow comes up, DouDou pops to full size, hops, waves his leaves, the name and slogan
 * fade in underneath, it holds a moment, and the layer fades and lifts away to reveal the app.
 * About 3.2 seconds. Colours follow the phone's light or dark setting because the native splash
 * does too. Everything is placed from the overlay's own measured size, never the window's, so the
 * text always sits below DouDou. With reduced motion it only fades.
 */
export function LaunchScreen({ ready, onDone }: LaunchScreenProps) {
  const system = useColorScheme();
  const palette = launchPalettes[system === 'dark' ? 'dark' : 'light'];
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [parts] = useState(() => getDoudouGlyphParts({ outline: palette.outline }));

  const glow = useSharedValue(0);
  const pop = useSharedValue(START_SCALE);
  const lift = useSharedValue(0);
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);
  const leaves = useSharedValue(0);
  const name = useSharedValue(0);
  const slogan = useSharedValue(0);
  const exit = useSharedValue(0);
  // 1 allows movement; 0 under reduced motion, so the text and the exit only fade.
  const travel = useSharedValue(1);

  const laidOut = size !== null;
  useEffect(() => {
    if (!ready || !laidOut) return undefined;
    let cancelled = false;
    const finish = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onDone);
    };

    // Our copy is on screen now, so the native splash can go without a visible change.
    SplashScreen.hideAsync().catch(() => undefined);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          // DouDou stays at the native splash size: no pop, so nothing jumps.
          travel.value = 0;
          glow.value = to(1, 250);
          name.value = after(150, to(1, 300));
          slogan.value = after(250, to(1, 300));
          exit.value = after(1400, withTiming(1, { duration: 400, reduceMotion: never }, finish));
          return;
        }
        glow.value = to(1, 400);
        // Pop up from the native splash size, with a small overshoot.
        pop.value = after(100, withSequence(to(1.06, 320, Easing.out(Easing.cubic)), to(1, 180)));
        // Squash, jump, land, settle.
        squashY.value = after(650, withSequence(to(0.9, 180), to(1.06, 280), to(0.93, 300), to(1, 240)));
        squashX.value = after(650, withSequence(to(1.08, 180), to(0.95, 280), to(1.06, 300), to(1, 240)));
        lift.value = after(650, withSequence(to(0, 180), to(-24, 280, Easing.out(Easing.quad)), to(0, 300, Easing.in(Easing.quad))));
        leaves.value = after(1350, withSequence(to(-10, 200), to(8, 240), to(0, 220)));
        name.value = after(1500, to(1, 400, Easing.out(Easing.cubic)));
        slogan.value = after(1750, to(1, 400, Easing.out(Easing.cubic)));
        // Hold until 2.7s so the whole frame can be read, then leave.
        exit.value = after(2700, withTiming(1, { duration: 550, easing: Easing.inOut(Easing.cubic), reduceMotion: never }, finish));
      });
    return () => {
      cancelled = true;
    };
  }, [ready, laidOut, onDone, glow, pop, lift, squashX, squashY, leaves, name, slogan, exit, travel]);

  const layerStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ translateY: -14 * exit.value * travel.value }, { scale: 1 + 0.04 * exit.value * travel.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scaleX: squashX.value }, { scaleY: squashY.value }],
  }));
  const leavesStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${leaves.value}deg` }] }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: name.value, transform: [{ translateY: 6 * (1 - name.value) * travel.value }] }));
  const sloganStyle = useAnimatedStyle(() => ({ opacity: slogan.value, transform: [{ translateY: 6 * (1 - slogan.value) * travel.value }] }));

  const measure = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (current && current.width === width && current.height === height ? current : { width, height }));
  };

  return (
    // Takes touches until it unmounts, so nothing in the hidden app underneath can be tapped.
    <Animated.View
      onLayout={measure}
      style={[StyleSheet.absoluteFill, styles.layer, { backgroundColor: palette.bg }, layerStyle]}
      accessible
      accessibilityLabel={`FireBuddy. ${BRAND_TAGLINE}`}
    >
      {/* Dark icons on beige, light icons on the dark forest, matching the phone's setting like the native splash. */}
      <StatusBar style={system === 'dark' ? 'light' : 'dark'} />
      {size ? (
        <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
          <Svg width={size.width} height={size.height}>
            <Defs>
              <RadialGradient id="launchGlow" cx={size.width / 2} cy={size.height / 2} r={size.width * 0.9} gradientUnits="userSpaceOnUse">
                {palette.glow.map(([offset, color, opacity]) => <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />)}
              </RadialGradient>
            </Defs>
            <Rect width={size.width} height={size.height} fill="url(#launchGlow)" />
          </Svg>
        </Animated.View>
      ) : null}

      {/* DouDou is centred on this layer, and the text below is placed from the same centre. */}
      <View style={styles.centre}>
        <View style={styles.stage}>
          <Animated.View style={[styles.art, popStyle]}>
            <Svg width={ART_SIZE} height={ART_SIZE} viewBox="0 0 48 48" style={StyleSheet.absoluteFill}>
              <G transform={GLYPH}>
                <Ellipse cx={24} cy={43.2} rx={10} ry={1.6} fill={palette.ground} />
              </G>
            </Svg>
            <Animated.View style={[StyleSheet.absoluteFill, styles.body, bodyStyle]}>
              <Animated.View style={[StyleSheet.absoluteFill, styles.leaves, leavesStyle]}>
                <Svg width={ART_SIZE} height={ART_SIZE} viewBox="0 0 48 48">
                  <G transform={GLYPH}><Shapes shapes={parts.leaves} /></G>
                </Svg>
              </Animated.View>
              <Svg width={ART_SIZE} height={ART_SIZE} viewBox="0 0 48 48" style={StyleSheet.absoluteFill}>
                <G transform={GLYPH}>
                  <Shapes shapes={[parts.bean, ...parts.face]} />
                </G>
              </Svg>
            </Animated.View>
          </Animated.View>
        </View>
      </View>

      {/*
        Mounted only once fonts are loaded (`ready`). Android sizes text when it first lays it out,
        so text drawn in the fallback font and then switched to Bricolage gets cut short ("FireBud").
        It is invisible until then anyway.
      */}
      {ready ? (
        <View style={styles.copy}>
          <Animated.Text numberOfLines={1} style={[styles.name, { color: palette.ink }, nameStyle]}>FireBuddy</Animated.Text>
          <Animated.Text style={[styles.slogan, { color: palette.muted }, sloganStyle]}>{BRAND_TAGLINE}</Animated.Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 100,
    elevation: 100,
  },
  centre: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: STAGE,
    height: STAGE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  // Pops about its own centre, which keeps DouDou on the native splash's spot as he grows.
  art: {
    width: ART_SIZE,
    height: ART_SIZE,
    overflow: 'visible',
    transformOrigin: '50% 50%',
  },
  // Squash and stretch about DouDou's feet (y 39.75 of 48 after the glyph transform).
  body: {
    overflow: 'visible',
    transformOrigin: '50% 83%',
  },
  // The leaves pivot where the stem meets the bean (y 16.35 of 48).
  leaves: {
    overflow: 'visible',
    transformOrigin: '50% 34%',
  },
  // Placed from the layer's own centre, the same point DouDou is centred on.
  copy: {
    position: 'absolute',
    top: '50%',
    marginTop: TEXT_OFFSET,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 6,
  },
  // Full row width and centred, so the line is never shrink-wrapped to a stale measurement.
  name: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: fonts.display.bold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  slogan: {
    alignSelf: 'stretch',
    fontFamily: fonts.body.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
