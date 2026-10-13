import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AppText } from './Text';

export interface ChipProps {
  label: string;
  tone?: 'neutral' | 'income' | 'expense' | 'warning' | 'info' | 'gold' | 'accent' | 'ai' | 'heroNeutral' | 'heroUp' | 'heroDown';
  icon?: LucideIcon;
  round?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Makes the chip a button, e.g. a prompt that opens the screen it mentions. */
  onPress?: () => void;
}

/** Small status badge: semantic tints for income/expense, gold for highlights, pill for filter counts, `hero*` tones inside a navy hero. */
export function Chip({ label, tone = 'neutral', icon: Icon, round = false, style, onPress }: ChipProps) {
  const { theme } = useTheme();
  const palette = {
    neutral: { bg: theme.surface2, ink: theme.ink2 },
    income: { bg: theme.incomeSoft, ink: theme.income },
    expense: { bg: theme.expenseSoft, ink: theme.expense },
    warning: { bg: theme.warningSoft, ink: theme.warning },
    info: { bg: theme.infoSoft, ink: theme.info },
    gold: { bg: 'rgba(255, 195, 0, 0.18)', ink: theme.goldText },
    accent: { bg: theme.accentSoft, ink: theme.accentText },
    ai: { bg: theme.accentSoft, ink: theme.accentText },
    // Badges inside a hero; the delta reads gold up, coral down.
    heroNeutral: { bg: theme.heroChipBg, ink: theme.heroChipInk },
    heroUp: { bg: theme.heroUpBg, ink: theme.heroUpInk },
    heroDown: { bg: theme.heroChipBg, ink: theme.heroDownInk },
  }[tone];

  const chipStyle = [styles.chip, { backgroundColor: palette.bg, borderRadius: round ? radii.pill : radii.chip }, style];
  const content = (
    <>
      {Icon ? <Icon size={13} color={palette.ink} strokeWidth={2.2} /> : null}
      {tone === 'ai' ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
      <AppText variant="captionMedium" style={{ color: palette.ink }}>{label}</AppText>
    </>
  );
  if (!onPress) return <View style={chipStyle}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      onPress={onPress}
      style={({ pressed }) => [chipStyle, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
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
  pressed: {
    opacity: 0.7,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
