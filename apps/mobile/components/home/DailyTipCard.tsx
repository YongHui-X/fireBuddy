import type { DailyTip } from '@firebuddy/shared';
import { Sprout, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { ActionSheet } from '../ui/ActionSheet';
import { PressOverlay } from '../ui/PressOverlay';
import { AppText } from '../ui/Text';

interface DailyTipCardProps {
  tip: DailyTip;
  onDismiss: () => void;
  /** Turns tips off for good; Profile turns them back on. */
  onTurnOff: () => void;
}

/**
 * One short DouDou tip under the Home hero. A sprout rather than DouDou itself, because the hero's
 * DouDou shortcut is already the one DouDou on Home. The × offers hiding it until tomorrow or
 * turning tips off.
 */
export function DailyTipCard({ tip, onDismiss, onTurnOff }: DailyTipCardProps) {
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
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
      <Pressable accessibilityRole="button" accessibilityLabel="Hide tip" hitSlop={10} onPress={() => setMenuOpen(true)} style={styles.close}>
        {({ pressed }) => (
          <>
            <PressOverlay pressed={pressed} radius={radii.pill} />
            <X size={16} color={theme.ink3} />
          </>
        )}
      </Pressable>
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Hide DouDou's tip"
        actions={[
          { key: 'today', label: 'Hide for today', detail: 'A new tip tomorrow', onSelect: onDismiss },
          { key: 'off', label: 'Turn off tips', detail: 'Turn them back on in Profile', onSelect: onTurnOff },
        ]}
      />
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
