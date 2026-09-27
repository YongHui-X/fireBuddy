import { Check, X } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AppText } from './Text';

export interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  /** Lifts the toast above the tab bar on tab screens. */
  aboveTabBar?: boolean;
}

/** Forest confirmation pill that rises above the tab bar and dismisses itself after three seconds. */
export function Toast({ message, onDismiss, aboveTabBar = true }: ToastProps) {
  const { theme, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [message, onDismiss, opacity]);

  if (!message) return null;

  const bottom = (aboveTabBar ? layout.tabBar : 0) + insets.bottom + spacing.lg;
  return (
    <Animated.View pointerEvents="box-none" style={[styles.host, { bottom, opacity }]}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.toast, shadows.lg, { backgroundColor: theme.railBg }]}>
        <View style={[styles.check, { backgroundColor: theme.primary }]}>
          <Check size={13} color={theme.onPrimary} strokeWidth={2.6} />
        </View>
        <AppText variant="captionMedium" tone="rail" style={styles.message}>{message}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" hitSlop={8} onPress={onDismiss} style={styles.dismiss}>
          <X size={15} color={theme.railInkMuted} strokeWidth={2.2} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: layout.gutter,
    right: layout.gutter,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 420,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flexShrink: 1,
  },
  dismiss: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
