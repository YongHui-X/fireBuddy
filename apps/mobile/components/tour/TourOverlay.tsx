import { TOUR_STEPS } from '@firebuddy/shared';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Doudou } from '@/components/brand/Doudou';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { layout, radii, spacing } from '@/constants/tokens';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/lib/theme';

import { useTour } from './TourProvider';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Breathing room between the control and the edge of the spotlight. */
const HOLE_PAD = 6;
/** Gap between the spotlight and DouDou's bubble. */
const BUBBLE_GAP = 14;
/** Below a control the gap is wider, so the caret clears the label printed under a round shortcut. */
const BUBBLE_GAP_BELOW = 34;
/** How long the spotlight takes to glide to the next control. */
const MOVE_MS = 320;
/** A missing target is retried this many times (100 ms apart) before its step is skipped. */
const MAX_TRIES = 20;

/**
 * DouDou's spotlight: dims the whole app, leaves a round hole around one control and shows a
 * speech bubble beside it. The dim is one view with a very thick border, so the hole is its
 * transparent middle and can glide between controls on every platform, web included. Touches on
 * the app underneath are swallowed, so tapping the highlighted control does nothing mid-tour.
 */
export function TourOverlay() {
  const { stepIndex, next, back, finish, getTarget } = useTour();
  const { theme, shadows } = useTheme();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const step = stepIndex === null ? null : TOUR_STEPS[stepIndex] ?? null;
  const root = useRef<View>(null);
  const [measured, setMeasured] = useState<{ stepId: string; rect: Rect; frame: { width: number; height: number } } | null>(null);
  const current = step && measured?.stepId === step.id ? measured : null;
  const rect = current?.rect ?? null;
  // The overlay's own size, not the window's: with edge-to-edge Android the two differ by the system bars.
  const frameHeight = current?.frame.height ?? height;
  const frameWidth = current?.frame.width ?? width;

  // Measure the step's control once navigation has settled, retrying while it mounts.
  useEffect(() => {
    if (!step) return undefined;
    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const retry = () => {
      tries += 1;
      if (tries >= MAX_TRIES) next();
      else timer = setTimeout(attempt, 100);
    };
    const attempt = () => {
      const node = getTarget(step.targetId);
      if (!node) {
        retry();
        return;
      }
      const overlay = root.current;
      if (!overlay) {
        retry();
        return;
      }
      // Both are measured in window space, then the control is placed relative to the overlay,
      // so the hole and bubble line up even when the window and the overlay disagree on height.
      overlay.measureInWindow((ox, oy, ow, oh) => {
        node.measureInWindow((x, y, w, h) => {
          if (cancelled) return;
          if (!w || !h || !ow || !oh) retry();
          else setMeasured({ stepId: step.id, rect: { x: x - ox, y: y - oy, width: w, height: h }, frame: { width: ow, height: oh } });
        });
      });
    };
    const frame = requestAnimationFrame(attempt);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
    // Window size is a dependency so rotation or a resized browser re-measures.
  }, [step, getTarget, next, width, height]);

  // Each new step is read out, because focus stays on the Next button.
  useEffect(() => {
    if (step && rect && stepIndex !== null) {
      AccessibilityInfo.announceForAccessibility(`DouDou's tour, step ${stepIndex + 1} of ${TOUR_STEPS.length}. ${step.title}. ${step.body}`);
    }
  }, [step, rect, stepIndex]);

  // Android back ends the tour rather than leaving the screen underneath.
  useEffect(() => {
    if (!step || Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      finish();
      return true;
    });
    return () => subscription.remove();
  }, [step, finish]);

  // The border's outer edge is rounded too, so it must be at least the screen diagonal thick: then
  // its curve stays beyond every screen corner wherever the hole sits (a hole in the bottom-right
  // once left the top-left corner undimmed as a light triangle).
  const border = Math.ceil(Math.hypot(frameWidth, frameHeight)) + HOLE_PAD;
  const holeX = useSharedValue(0);
  const holeY = useSharedValue(0);
  const holeW = useSharedValue(0);
  const holeH = useSharedValue(0);
  const holeR = useSharedValue(0);
  const shown = useSharedValue(0);
  const placed = useSharedValue(false);

  useEffect(() => {
    if (!rect) return;
    // A circle around the control, centred on it and wide enough for its longer side.
    const side = Math.max(rect.width, rect.height) + HOLE_PAD * 2;
    const target = {
      x: rect.x + rect.width / 2 - side / 2,
      y: rect.y + rect.height / 2 - side / 2,
      w: side,
      h: side,
      r: side / 2,
    };
    // The first step and reduced motion jump; later steps glide.
    const glide = placed.get() && !reduceMotion;
    const to = (value: number) => (glide ? withTiming(value, { duration: MOVE_MS, easing: Easing.out(Easing.cubic) }) : value);
    holeX.set(to(target.x));
    holeY.set(to(target.y));
    holeW.set(to(target.w));
    holeH.set(to(target.h));
    holeR.set(to(target.r));
    placed.set(true);
    shown.set(reduceMotion ? 1 : withTiming(1, { duration: 220 }));
  }, [rect, reduceMotion, holeX, holeY, holeW, holeH, holeR, shown, placed]);

  // Reset between tours so the next one fades in again from its first control.
  useEffect(() => {
    if (step) return;
    placed.set(false);
    shown.set(0);
  }, [step, placed, shown]);

  const holeStyle = useAnimatedStyle(() => ({
    left: holeX.value - border,
    top: holeY.value - border,
    width: holeW.value + border * 2,
    height: holeH.value + border * 2,
    borderRadius: holeR.value + border,
    opacity: shown.value,
  }));

  if (!step || stepIndex === null) return null;

  const last = stepIndex === TOUR_STEPS.length - 1;
  // Bubble goes on whichever side of the control has more room.
  const below = rect ? rect.y + rect.height / 2 < frameHeight / 2 : true;
  // Half the circle's extra reach past the control's own edge.
  const reach = rect ? (Math.max(rect.width, rect.height) - rect.height) / 2 + HOLE_PAD : HOLE_PAD;
  const bubblePosition = rect
    ? below
      ? { top: rect.y + rect.height + reach + BUBBLE_GAP_BELOW }
      : { bottom: frameHeight - rect.y + reach + BUBBLE_GAP }
    : null;
  const caretLeft = rect ? Math.max(layout.gutter + 20, Math.min(frameWidth - layout.gutter - 34, rect.x + rect.width / 2 - 7)) - layout.gutter : 0;

  return (
    <View ref={root} collapsable={false} style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} accessibilityViewIsModal>
      {/* Until the first control is measured the overlay stays clear and only swallows touches, so the screen never goes dark and empty. */}
      <Animated.View pointerEvents="none" style={[styles.hole, { borderWidth: border, borderColor: theme.backdrop }, holeStyle]} />
      {rect && bubblePosition ? (
        <Animated.View
          key={step.id}
          entering={FadeIn.duration(220)}
          style={[styles.bubble, shadows.lg, bubblePosition, { backgroundColor: theme.surface, borderColor: theme.line }]}
        >
          <View
            style={[
              styles.caret,
              below ? styles.caretTop : styles.caretBottom,
              { left: caretLeft, backgroundColor: theme.surface, borderColor: theme.line },
            ]}
          />
          <View style={styles.content}>
            <Doudou pose={step.pose} size={56} />
            <View style={styles.copy}>
              <AppText variant="cardTitle">{step.title}</AppText>
              <AppText variant="bodySmall" tone="ink2">{step.body}</AppText>
            </View>
          </View>
          <View style={styles.footer}>
            {last ? <View style={styles.skip} /> : <Button label="Skip" variant="text" size="compact" onPress={finish} style={styles.skip} />}
            <AppText variant="caption" tone="ink3">{`${stepIndex + 1} of ${TOUR_STEPS.length}`}</AppText>
            <View style={styles.footerEnd}>
              {stepIndex > 0 ? <Button label="Back" variant="text" size="compact" onPress={back} /> : null}
              <Button label={last ? 'Done' : 'Next'} variant="primary" size="compact" onPress={next} style={styles.nextButton} />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hole: {
    position: 'absolute',
  },
  bubble: {
    position: 'absolute',
    left: layout.gutter,
    right: layout.gutter,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  caret: {
    position: 'absolute',
    width: 14,
    height: 14,
    transform: [{ rotate: '45deg' }],
  },
  caretTop: {
    top: -7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  caretBottom: {
    bottom: -7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: {
    minWidth: 64,
  },
  footerEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nextButton: {
    minWidth: 80,
  },
});
