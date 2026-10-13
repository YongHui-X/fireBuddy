import { formatMonthLabel } from '@firebuddy/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import type { PositionView } from '@/hooks/use-wealth';
import { useTheme } from '@/lib/theme';
import { usePrivacy } from '@/lib/privacy';

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
 * One asset or debt: a type icon, name and value, then for debts one fact per line (monthly payment,
 * payoff month, interest still to pay, the goal, progress) so nothing runs together. No tags or dates
 * (owner, 11 Oct 2026).
 */
export function PositionRow({ row, first, onPress }: PositionRowProps) {
  const { theme } = useTheme();
  const { money, signedMoney, percent } = usePrivacy();
  const { position, isLiability, linkedAccountName, balance, payoff, repaid, goal } = row;
  // A row tied to an account shows the account's live name, so renaming it anywhere renames the row.
  const displayName = linkedAccountName ?? position.name;
  const Icon = positionIcon(position.positionType, position.positionKind);
  // A debt reads as owed (−); an account overspent from zero keeps its own minus sign.
  const valueText = balance === null ? 'Add a value' : isLiability ? `−${money(balance, 0)}` : signedMoney(balance, 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${displayName}, ${valueText}. Edit`}
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
              <AppText variant="bodySemibold" numberOfLines={1} style={styles.name}>{displayName}</AppText>
              <AppText variant="amount" tone={isLiability ? 'expense' : 'ink'}>{valueText}</AppText>
            </View>
            {isLiability && position.monthlyPayment ? <AppText variant="caption" tone="ink2">{`${money(Number(position.monthlyPayment), 0)} a month`}</AppText> : null}
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
