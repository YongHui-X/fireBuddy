import { formatMonthLabel, formatShortDate } from '@firebuddy/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import type { PositionView } from '@/hooks/use-wealth';
import { useTheme } from '@/lib/theme';
import { usePrivacy } from '@/lib/privacy';

import { Chip } from '../ui/Chip';
import { PressOverlay } from '../ui/PressOverlay';
import { ProgressTrack } from '../ui/ProgressTrack';
import { AppText } from '../ui/Text';
import { positionIcon } from './position-icons';

export interface PositionRowProps {
  row: PositionView;
  first?: boolean;
  onPress: () => void;
}

/**
 * One asset or debt: a type icon, name and value, the tags as separate chips, then for debts one fact
 * per line (payoff month, interest still to pay, the goal, progress) so nothing runs together.
 */
export function PositionRow({ row, first, onPress }: PositionRowProps) {
  const { theme } = useTheme();
  const { money, percent } = usePrivacy();
  const { position, isLiability, balance, valueDate, tags, payoff, repaid, goal } = row;
  const Icon = positionIcon(position.positionType, position.positionKind);
  const valueText = balance === null ? 'Add a value' : `${isLiability ? '−' : ''}${money(balance, 0)}`;
  const chips = [...tags, ...(isLiability && position.monthlyPayment ? [`${money(Number(position.monthlyPayment), 0)} a month`] : [])];

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
            <View style={styles.chips}>
              {chips.map((chip) => <Chip key={chip} label={chip} />)}
            </View>
            {payoff?.payoffMonth ? (
              <AppText variant="caption" tone="ink">{`Paid off by ${formatMonthLabel(payoff.payoffMonth)}`}</AppText>
            ) : null}
            {payoff ? <AppText variant="caption" tone={payoff.warning ? 'warning' : 'ink2'}>{payoff.text}</AppText> : null}
            {goal ? <AppText variant="caption" tone={goal.onTrack ? 'income' : 'ink2'}>{goal.text}</AppText> : null}
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 2,
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
