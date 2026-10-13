import type { ActiveFilterKey } from '@firebuddy/shared';
import { X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AppText } from '../ui/Text';

export interface ActiveFiltersProps {
  chips: readonly { key: ActiveFilterKey; label: string }[];
  onRemove: (key: ActiveFilterKey) => void;
  onClear: () => void;
}

/**
 * What the ledger is filtered by, as removable gold chips (Expense ×, Food ×, DBS ×) with
 * "Clear all" after them on the same line and height, instead of a bare count.
 */
export function ActiveFilters({ chips, onRemove, onClear }: ActiveFiltersProps) {
  const { theme } = useTheme();
  if (!chips.length) return null;
  return (
    <View style={styles.row}>
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          accessibilityRole="button"
          accessibilityLabel={`Remove filter ${chip.label}`}
          hitSlop={{ top: 6, bottom: 6 }}
          onPress={() => onRemove(chip.key)}
          style={({ pressed }) => [styles.chip, { backgroundColor: 'rgba(255, 195, 0, 0.18)' }, pressed ? styles.pressed : null]}
        >
          <AppText variant="captionMedium" numberOfLines={1} style={[styles.label, { color: theme.goldText }]}>{chip.label}</AppText>
          <X size={14} color={theme.goldText} strokeWidth={2.4} />
        </Pressable>
      ))}
      {chips.length > 1 ? (
        <Pressable accessibilityRole="button" hitSlop={{ top: 6, bottom: 6 }} onPress={onClear} style={({ pressed }) => [styles.clear, pressed ? styles.pressed : null]}>
          <AppText variant="captionMedium" tone="accentText">Clear all</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: radii.pill,
    maxWidth: 200,
  },
  label: {
    flexShrink: 1,
  },
  clear: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
