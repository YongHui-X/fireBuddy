import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AppText } from './Text';

export interface ChipProps {
  label: string;
  tone?: 'neutral' | 'income' | 'expense' | 'warning' | 'info' | 'lime' | 'accent' | 'ai';
  icon?: LucideIcon;
  round?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Small status badge: semantic tints for income/expense, lime for the hero delta, pill for filter counts. */
export function Chip({ label, tone = 'neutral', icon: Icon, round = false, style }: ChipProps) {
  const { theme } = useTheme();
  const palette = {
    neutral: { bg: theme.surface2, ink: theme.ink2 },
    income: { bg: theme.incomeSoft, ink: theme.income },
    expense: { bg: theme.expenseSoft, ink: theme.expense },
    warning: { bg: theme.warningSoft, ink: theme.warning },
    info: { bg: theme.infoSoft, ink: theme.info },
    lime: { bg: 'rgba(203, 234, 99, 0.16)', ink: theme.railActiveInk },
    accent: { bg: theme.accentSoft, ink: theme.accentText },
    ai: { bg: theme.accentSoft, ink: theme.accentText },
  }[tone];

  return (
    <View style={[styles.chip, { backgroundColor: palette.bg, borderRadius: round ? radii.pill : radii.chip }, style]}>
      {Icon ? <Icon size={13} color={palette.ink} strokeWidth={2.2} /> : null}
      {tone === 'ai' ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
      <AppText variant="captionMedium" style={{ color: palette.ink }}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
