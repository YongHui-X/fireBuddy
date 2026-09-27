import { formatMonthLabel } from '@firebuddy/shared';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { IconButton } from './IconButton';
import { PressOverlay } from './PressOverlay';
import { AppText } from './Text';

export interface MonthStepperProps {
  /** Newest first, as `getTransactionMonthOptions` returns them. */
  months: readonly string[];
  value: string;
  onChange: (monthKey: string) => void;
  /** Opens a picker listing every month. */
  onOpenPicker?: () => void;
  /** Overrides the month text, e.g. "Custom range". */
  valueLabel?: string;
}

/** One pill: previous month, the month name (tap for the full list), next month. */
export function MonthStepper({ months, value, onChange, onOpenPicker, valueLabel }: MonthStepperProps) {
  const { theme } = useTheme();
  const index = months.indexOf(value);
  const older = index >= 0 ? months[index + 1] : undefined;
  const newer = index > 0 ? months[index - 1] : undefined;

  return (
    <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.lineStrong }]}>
      <IconButton icon={ChevronLeft} accessibilityLabel="Show previous month" disabled={!older} onPress={() => older && onChange(older)} size="compact" />
        <Pressable
          accessibilityRole={onOpenPicker ? 'button' : undefined}
          accessibilityLabel="Month"
          disabled={!onOpenPicker}
          onPress={onOpenPicker}
          style={styles.value}
        >
          {({ pressed }) => (
            <>
              <PressOverlay pressed={pressed && Boolean(onOpenPicker)} radius={radii.control} />
              <View style={styles.valueRow}>
                <CalendarDays size={16} color={theme.ink2} strokeWidth={1.9} />
                <AppText variant="bodySemibold">{valueLabel ?? formatMonthLabel(value)}</AppText>
                {onOpenPicker ? <ChevronDown size={15} color={theme.ink3} strokeWidth={2} /> : null}
              </View>
            </>
          )}
        </Pressable>
      <IconButton icon={ChevronRight} accessibilityLabel="Show next month" disabled={!newer} onPress={() => newer && onChange(newer)} size="compact" />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 4,
    borderRadius: radii.control,
    borderWidth: 1,
  },
  value: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radii.control - 3,
    overflow: 'hidden',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
