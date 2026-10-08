import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AppText } from './Text';

/**
 * A tick box with its label on the right. Only the box toggles, so the label can hold inline
 * links (nested AppText with onPress) that open without ticking it.
 */
export function CheckboxRow({
  checked,
  onChange,
  accessibilityLabel,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={accessibilityLabel}
        onPress={() => onChange(!checked)}
        hitSlop={9}
        style={[styles.box, { borderColor: checked ? theme.accent : theme.lineStrong, backgroundColor: checked ? theme.accent : 'transparent' }]}
      >
        {checked ? <Check size={16} color={theme.surface} strokeWidth={3} /> : null}
      </Pressable>
      <AppText variant="body" tone="ink2" style={styles.label}>{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: radii.chip + 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
});
