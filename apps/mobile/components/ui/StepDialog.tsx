import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

import { radii, spacing } from '@/constants/tokens';
import { useGridItemWidth } from '@/hooks/use-grid-item-width';
import { useTheme } from '@/lib/theme';

import { Button } from './Button';
import { Dialog } from './Dialog';
import { AppText, type TextTone } from './Text';

export interface DialogStep {
  key: string;
  /** Picture above the text, usually DouDou in a pose. */
  art?: ReactNode;
  eyebrow?: string;
  title: string;
  /** Optional heading colour; keeps the standard page title typography. */
  titleTone?: TextTone;
  body: string;
  /** Anything extra under the body, such as a small illustration. */
  extra?: ReactNode;
}

export interface StepDialogProps {
  open: boolean;
  steps: readonly DialogStep[];
  /** Android back button and backdrop tap. Leave undefined to allow leaving only by the buttons. */
  onClose?: () => void;
  /** Buttons for the last page, such as a decision. Without it the last page shows a Done button that calls onClose. */
  finalFooter?: ReactNode;
  labels?: { next?: string; back?: string; skip?: string; done?: string };
  /** Shows Skip on every page but the last, jumping straight to it. */
  allowSkip?: boolean;
  /** Freezes page navigation, e.g. while the last page's decision is being saved. */
  locked?: boolean;
}

/**
 * A short series of pages in one popup, read with Next and Back, with progress dots. Used for
 * DouDou's consent and meant for the app tutorial too: pass different steps and a last-page footer.
 * Opens on the first page every time. Page changes slide in from the side they come from.
 */
export function StepDialog({ open, steps, onClose, finalFooter, labels = {}, allowSkip = false, locked = false }: StepDialogProps) {
  const { theme } = useTheme();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [wasOpen, setWasOpen] = useState(open);
  const half = useGridItemWidth(2, spacing.sm);
  // Start from the first page each time the dialog opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setIndex(0);
      setDirection(1);
    }
  }

  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const go = (next: number) => {
    if (locked) return;
    setDirection(next > index ? 1 : -1);
    setIndex(Math.max(0, Math.min(steps.length - 1, next)));
  };

  // Screen readers stay on the Next button, so read out each new page as it arrives.
  const announcement = open && step ? `Page ${index + 1} of ${steps.length}. ${step.title}. ${step.body}` : null;
  useEffect(() => {
    if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  if (!step) return null;

  const footer = last
    ? finalFooter ?? <Button label={labels.done ?? 'Done'} variant="primary" block onPress={onClose} />
    : (
      // Two equal buttons; on the first page Next stands alone, centred, at the same half width.
      <View style={[styles.nav, index === 0 ? styles.navSolo : null]} onLayout={half.onLayout}>
        {index > 0 ? <Button label={labels.back ?? 'Back'} variant="tonal" onPress={() => go(index - 1)} style={styles.navButton} /> : null}
        <Button
          label={labels.next ?? 'Next'}
          variant="primary"
          onPress={() => go(index + 1)}
          style={index === 0 ? [styles.navSoloButton, half.itemWidth ? { width: half.itemWidth } : null] : styles.navButton}
        />
      </View>
    );

  return (
    <Dialog open={open} onClose={onClose} footer={footer}>
      <View style={styles.top}>
        <View style={styles.dots} accessible accessibilityLabel={`Page ${index + 1} of ${steps.length}`}>
          {steps.map((item, dot) => (
            <View
              key={item.key}
              style={[styles.dot, dot === index ? styles.dotActive : null, { backgroundColor: dot <= index ? theme.accent : theme.lineStrong }]}
            />
          ))}
        </View>
        {allowSkip && !last ? (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => go(steps.length - 1)}>
            <AppText variant="captionMedium" tone="ink2">{labels.skip ?? 'Skip'}</AppText>
          </Pressable>
        ) : null}
        {/* The last page's footer is the decision, so going back to re-read lives up here. */}
        {last && index > 0 ? (
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: locked }} disabled={locked} hitSlop={10} onPress={() => go(index - 1)} style={locked ? styles.disabled : null}>
            <AppText variant="captionMedium" tone="ink2">{labels.back ?? 'Back'}</AppText>
          </Pressable>
        ) : null}
      </View>
      <Animated.View key={step.key} entering={(direction > 0 ? FadeInRight : FadeInLeft).duration(220)} style={styles.page}>
        {step.art ? <View style={styles.art}>{step.art}</View> : null}
        {step.eyebrow ? <AppText variant="overline" tone="accentText" align="center">{step.eyebrow}</AppText> : null}
        <AppText variant="pageTitle" tone={step.titleTone} align="center" accessibilityRole="header">{step.title}</AppText>
        <AppText variant="body" tone="ink2" align="center">{step.body}</AppText>
        {step.extra}
      </Animated.View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 20,
    marginBottom: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
  },
  dotActive: {
    width: 20,
  },
  // A steady height so the popup does not jump between short and long pages.
  page: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  art: {
    marginBottom: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  nav: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    flex: 1,
    alignSelf: 'stretch',
  },
  navSolo: {
    justifyContent: 'center',
  },
  // Half width before the first layout, then the exact width of one of a pair.
  navSoloButton: {
    width: '48%',
    alignSelf: 'stretch',
  },
});
