import type { DailyTip } from '@firebuddy/shared';
import { Sprout, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { PressOverlay } from '../ui/PressOverlay';
import { AppText } from '../ui/Text';

interface DailyTipCardProps {
  tip: DailyTip;
  onDismiss: () => void;
}

/**
 * One short DouDou tip under the Home hero. A sprout rather than DouDou itself, because the hero's
 * DouDou shortcut is already the one DouDou on Home. Dismissing hides it until tomorrow.
 */
export function DailyTipCard({ tip, onDismiss }: DailyTipCardProps) {
  const { theme } = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      style={[styles.card, { backgroundColor: theme.surface2, borderColor: theme.line }]}
      accessibilityRole="summary"
    >
      <View style={[styles.icon, { backgroundColor: theme.surface }]}>
        <Sprout size={18} color={theme.accentText} strokeWidth={2} />
      </View>
      <View style={styles.copy}>
        <AppText variant="overline" tone="ink2">{"DouDou's tip"}</AppText>
        <AppText variant="bodySmall">{tip.text}</AppText>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Hide today's tip" hitSlop={10} onPress={onDismiss} style={styles.close}>
        {({ pressed }) => (
          <>
            <PressOverlay pressed={pressed} radius={radii.pill} />
            <X size={16} color={theme.ink3} />
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
