import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

export interface DialogProps {
  open: boolean;
  /** Back button and backdrop tap. Leave undefined to make the dialog dismissable only by its buttons. */
  onClose?: () => void;
  /** Buttons pinned under the scrolling body. */
  footer?: ReactNode;
  children: ReactNode;
}

const DURATION = 200;

/**
 * A centred popup for moments that need a decision before the screen behind can be used, such as
 * DouDou's consent. Fades and grows in; the body scrolls when it is taller than the screen.
 * Insets are read outside the Modal subtree because inside it Android reports 0.
 */
export function Dialog({ open, onClose, footer, children }: DialogProps) {
  const { theme, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const [progress] = useState(() => new Animated.Value(0));
  // Mount as soon as it opens, during render, so the effect below only drives the animation.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      Animated.timing(progress, { toValue: 1, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: DURATION - 60, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [open, progress]);

  if (!mounted) return null;

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => onClose?.()} supportedOrientations={['portrait']}>
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backdrop, opacity: progress }]}>
          <Pressable accessibilityLabel="Close" accessibilityRole="button" disabled={!onClose} style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            shadows.lg,
            { backgroundColor: theme.surface, borderColor: theme.line, maxHeight: height - insets.top - insets.bottom - spacing.lg * 2, opacity: progress, transform: [{ scale }] },
          ]}
        >
          <ScrollView bounces={false} overScrollMode="never" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
          {footer ? <View style={[styles.footer, { borderTopColor: theme.line }]}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
  },
  card: {
    borderRadius: radii.drawer,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  body: {
    padding: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
