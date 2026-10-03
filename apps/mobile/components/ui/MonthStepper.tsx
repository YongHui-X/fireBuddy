import { formatMonthLabel } from '@firebuddy/shared';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { layout, radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { PressOverlay } from './PressOverlay';
import { AppText } from './Text';

export interface MonthStepperProps {
  /** Newest first, as `getTransactionMonthOptions` returns them. */
  months: readonly string[];
  value: string;
  onChange: (monthKey: string) => void;
  /** Opens a picker listing every month. */
  onOpenPicker?: () => void;
  /** Overrides the month text, e.g. "3 Sep – 27 Sep" for a custom range. */
  valueLabel?: string;
}

/**
 * A borderless period header: the month name in display type, flanked by two round step buttons.
 * Tapping the name opens the full month picker. No enclosing frame, so it reads as a heading
 * rather than a form control.
 */
export function MonthStepper({ months, value, onChange, onOpenPicker, valueLabel }: MonthStepperProps) {
  const { theme } = useTheme();
  const index = months.indexOf(value);
  const older = index >= 0 ? months[index + 1] : undefined;
  const newer = index > 0 ? months[index - 1] : undefined;

  const step = (label: string, Icon: typeof ChevronLeft, target?: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!target}
      hitSlop={6}
      onPress={() => target && onChange(target)}
      style={[styles.stepTarget, !target ? styles.disabled : null]}
    >
      {({ pressed }) => (
        <View style={[styles.stepCircle, { backgroundColor: theme.surface2 }]}>
          <PressOverlay pressed={pressed && Boolean(target)} radius={radii.pill} />
          <Icon size={18} color={theme.ink2} strokeWidth={2} />
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {step('Show previous month', ChevronLeft, older)}
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
              <AppText variant="cardTitle" numberOfLines={1}>{valueLabel ?? formatMonthLabel(value)}</AppText>
              {onOpenPicker ? <ChevronDown size={16} color={theme.ink3} strokeWidth={2.2} /> : null}
            </View>
          </>
        )}
      </Pressable>
      {step('Show next month', ChevronRight, newer)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepTarget: {
    width: layout.touchCompact,
    height: layout.touchCompact,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.35,
  },
  value: {
    flex: 1,
    minHeight: layout.touchCompact,
    justifyContent: 'center',
    borderRadius: radii.control,
    overflow: 'hidden',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
