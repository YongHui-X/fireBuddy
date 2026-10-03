import { formatMonthLabel, formatShortDate } from '@firebuddy/shared';
import { Landmark, TrendingUp } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import type { PositionView } from '@/hooks/use-wealth';
import { useTheme } from '@/lib/theme';
import { usePrivacy } from '@/lib/privacy';

import { PressOverlay } from '../ui/PressOverlay';
import { ProgressTrack } from '../ui/ProgressTrack';
import { AppText } from '../ui/Text';

export interface PositionRowProps {
  row: PositionView;
  first?: boolean;
  onPress: () => void;
}

/** One asset or debt: icon tile, name, plain-language tags, value on the right, payoff line for debts. */
export function PositionRow({ row, first, onPress }: PositionRowProps) {
  const { theme } = useTheme();
  const { money, percent } = usePrivacy();
  const { position, isLiability, balance, valueDate, tags, payoff, repaid } = row;
  const Icon = isLiability ? Landmark : TrendingUp;
  const valueText = balance === null ? 'Add a value' : `${isLiability ? '−' : ''}${money(balance, 0)}`;
  const meta = [...tags, ...(isLiability && position.monthlyPayment ? [`${money(Number(position.monthlyPayment), 0)}/month`] : [])].join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${position.name}, ${valueText}. Edit`}
      onPress={onPress}
      style={[styles.row, !first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null]}
    >
      {({ pressed }) => (
        <>
          <PressOverlay pressed={pressed} />
          <View style={[styles.iconTile, { backgroundColor: isLiability ? theme.expenseSoft : theme.accentSoft }]}>
            <Icon size={19} color={isLiability ? theme.expense : theme.accentText} strokeWidth={1.9} />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <AppText variant="bodySemibold" numberOfLines={1} style={styles.name}>{position.name}</AppText>
              <AppText variant="amount" tone={isLiability ? 'expense' : 'ink'}>{valueText}</AppText>
            </View>
            <AppText variant="caption" tone="ink2" numberOfLines={2}>{meta}</AppText>
            {payoff ? (
              <AppText variant="caption" tone={payoff.warning ? 'warning' : 'ink2'}>
                {payoff.payoffMonth ? `Paid off by ${formatMonthLabel(payoff.payoffMonth)} · ${payoff.text}` : payoff.text}
              </AppText>
            ) : null}
            {repaid !== null ? (
              <View style={styles.progress}>
                <ProgressTrack value={repaid} color={theme.accent} height={6} style={styles.track} accessibilityLabel={`${percent(repaid)} repaid`} />
                <AppText variant="caption" tone="ink3">{percent(repaid)} repaid</AppText>
              </View>
            ) : null}
            <AppText variant="caption" tone="ink3">{valueDate ? `As of ${formatShortDate(valueDate)}` : 'No dated value yet'}</AppText>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  track: {
    flex: 1,
  },
});
