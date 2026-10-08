import { coastNumber } from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { Landmark, PencilLine, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProjectionChart } from '@/components/fire/ProjectionChart';
import { ScenarioSheet } from '@/components/fire/ScenarioSheet';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Collapsible } from '@/components/ui/Collapsible';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { ProgressTrack } from '@/components/ui/ProgressTrack';
import { AppText } from '@/components/ui/Text';
import { layout, radii, spacing } from '@/constants/tokens';
import { ageAt, describeFire, fireMonthLabel, pct, timeUntil, useFireProjection } from '@/hooks/use-fire-plan';
import { useTheme } from '@/lib/theme';
import { usePrivacy } from '@/lib/privacy';
import { useRegion } from '@/lib/user-profile';

/**
 * The saved retirement plan on a phone, told top-down: when you retire, whether the money lasts,
 * what to do about it, then the timeline, the projection and the evidence.
 */
export default function FirePlannerScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { result: fire, ready } = useFireProjection();
  const [scenarioOpen, setScenarioOpen] = useState(false);

  return (
    <Screen>
      <PageToolbar
        title="FIRE Planner"
        description="When you can retire, and whether the money lasts."
        onBack={() => router.back()}
        trailing={ready ? <IconButton icon={SlidersHorizontal} tone="bordered" accessibilityLabel="Try a scenario" onPress={() => setScenarioOpen(true)} /> : undefined}
      />

      {!ready ? (
        <Card>
          <EmptyState
            doudou="point"
            title="Review required"
            message={fire.warnings.map((warning) => warning.message).join(' ') || 'Confirm your timeline, retirement spending, spendable assets, income and assumptions to activate a projection.'}
            actionLabel="Set up plan"
            onAction={() => router.push('/fire-plan-edit')}
          />
        </Card>
      ) : (
        <Results
          fire={fire}
          theme={theme}
          onScenario={() => setScenarioOpen(true)}
          onAssets={() => router.push('/wealth')}
          onEdit={() => router.push('/fire-plan-edit')}
        />
      )}

      {ready ? <ScenarioSheet open={scenarioOpen} baseline={fire} onClose={() => setScenarioOpen(false)} /> : null}
    </Screen>
  );
}

interface ResultsProps {
  fire: ReturnType<typeof useFireProjection>['result'];
  theme: ReturnType<typeof useTheme>['theme'];
  onScenario: () => void;
  onAssets: () => void;
  onEdit: () => void;
}

function Results({ fire, theme, onScenario, onAssets, onEdit }: ResultsProps) {
  const { money, percent } = usePrivacy();
  const { isSingapore } = useRegion();
  const amount = (value: string | null | undefined) => (value == null ? 'Unavailable' : money(Number(value), 0));
  const { plan, depletion, funded, retirementAge, earliestAge, progress, contributionDelta, peak, monthsToRetirement, firstRetirement, firstCpf, cpfIncluded, years } = describeFire(fire);
  const retireMonth = fireMonthLabel(plan.retirementMonth);
  const progressLabel = `${percent(progress)} funded`;
  const contribution = money(plan.monthlyContribution, 0);

  const timeline: { label: string; value: string; detail: string; warn?: boolean }[] = [
    { label: 'Retire', value: retireMonth, detail: `age ${retirementAge} · ${timeUntil(monthsToRetirement)}` },
    fire.earliestRetirementMonth
      ? { label: 'Earliest you could retire', value: fireMonthLabel(fire.earliestRetirementMonth), detail: `age ${earliestAge}` }
      : { label: 'Earliest you could retire', value: 'Not found', detail: `not before age ${plan.endAge} on this plan`, warn: true },
    depletion
      ? { label: 'Money runs out', value: fireMonthLabel(depletion), detail: `age ${ageAt(plan, depletion)} · plan runs to ${plan.endAge}`, warn: true }
      : { label: 'Money lasts until', value: `Age ${plan.endAge}`, detail: 'the end of your plan' },
    // CPF LIFE is Singapore's; the general mode leaves it out entirely.
    ...(isSingapore ? [{ label: 'CPF LIFE payouts start', value: cpfIncluded ? `Age ${plan.cpfStartAge}` : 'Not included', detail: cpfIncluded ? `${money(plan.cpfMonthlyPayout, 0)} a month` : plan.cpfPlan === 'basic' ? 'Basic plan payouts are not modelled yet' : 'payout amount not known yet' }] : []),
  ];
  // Coast FIRE: what today's portfolio must be to reach the target with no more contributions.
  const coast = plan.fireType === 'coast' && fire.fiTarget != null ? coastNumber(Number(fire.fiTarget), Math.max(0, monthsToRetirement), plan.beforeReturn) : null;
  const coastReached = coast !== null && Number(fire.currentInvestableAssets ?? 0) >= coast;

  const budgetColumns = [
    { title: 'First month of retirement', when: firstRetirement ? fireMonthLabel(firstRetirement.month) : '', row: firstRetirement },
    ...(isSingapore ? [{ title: 'Once CPF LIFE starts', when: `age ${plan.cpfStartAge}`, row: firstCpf }] : []),
  ];

  return (
    <>
      {/* 1. When, and whether it works. */}
      <Card tone="hero" style={styles.hero}>
        <AppText variant="overline" tone="heroMuted">Your retirement</AppText>
        <AppText variant="heroFigure" tone="hero" numberOfLines={1} adjustsFontSizeToFit>{retireMonth}</AppText>
        <AppText variant="caption" tone="heroMuted">Age {retirementAge} · {timeUntil(monthsToRetirement)}</AppText>
        <View style={styles.heroStatus}>
          <Chip label={funded ? 'On track' : 'Shortfall'} tone={funded ? 'lime' : 'warning'} round />
          <AppText variant="captionMedium" tone="hero">{progressLabel}</AppText>
        </View>
        <ProgressTrack value={progress} color={funded ? theme.railActiveInk : theme.warning} height={8} keepColorWhenOver accessibilityLabel={`${progressLabel} of the amount needed for retirement`} />
        <View style={[styles.heroMeta, { borderTopColor: theme.heroLine }]}>
          <View style={styles.heroMetaRow}>
            <AppText variant="overline" tone="heroMuted">Amount needed</AppText>
            <AppText variant="amount" tone="hero" numberOfLines={1} adjustsFontSizeToFit style={styles.heroMetaValue}>{amount(fire.fiTarget)}</AppText>
          </View>
          <View style={styles.heroMetaRow}>
            <AppText variant="overline" tone="heroMuted">Projected amount</AppText>
            <AppText variant="amount" tone="hero" numberOfLines={1} adjustsFontSizeToFit style={styles.heroMetaValue}>{amount(fire.projectedPortfolio)}</AppText>
          </View>
        </View>
        <AppText variant="caption" tone="heroMuted">Accounting for {pct(plan.inflation)} annual inflation.</AppText>
      </Card>

      {coast !== null ? (
        <Card>
          <CardHeader title="Your coast number" subtitle={`What you need invested today to stop adding and still reach ${amount(fire.fiTarget)} by ${retireMonth}`} style={styles.tightHeader} />
          <AppText variant="metric">{money(coast, 0)}</AppText>
          <AppText variant="body" tone="ink2">
            {coastReached
              ? `You have ${amount(fire.currentInvestableAssets)}, so you have reached it. Growth alone at ${pct(plan.beforeReturn)} a year can carry you from here.`
              : `You have ${amount(fire.currentInvestableAssets)}: ${money(coast - Number(fire.currentInvestableAssets ?? 0), 0)} to go. Once you reach it, you can stop investing and let ${pct(plan.beforeReturn)} a year of growth do the rest.`}
          </AppText>
        </Card>
      ) : null}

      {/* 2. What to do about it. */}
      <Card style={!funded ? { borderColor: theme.warning, backgroundColor: theme.warningSoft } : null}>
        {funded ? (
          <>
            <CardHeader title="You’re on track" subtitle={`Funded through age ${plan.endAge} on your current plan`} style={styles.tightHeader} />
            <AppText variant="body" tone="ink2">
              {`Your ${contribution} a month covers it.`}
              {contributionDelta != null && contributionDelta < -0.005 ? ` You could invest as little as ${amount(fire.requiredMonthlyInvestment)} a month and still get there.` : ''}
            </AppText>
          </>
        ) : (
          <>
            <CardHeader title="Remaining needed amount" subtitle={`${amount(fire.fundingGap)} short in ${retireMonth}`} style={styles.tightHeader} />
            <AppText variant="body" tone="ink2">
              {fire.requiredMonthlyInvestment == null
                ? `No monthly amount closes this gap by ${retireMonth}. Try a later retirement date in a scenario.`
                : `Invest ${amount(fire.requiredMonthlyInvestment)} a month instead of ${contribution} to be funded through age ${plan.endAge}. That is ${money(Math.abs(contributionDelta ?? 0), 0)} more each month.`}
            </AppText>
          </>
        )}
        <Button label="Try a scenario" variant={funded ? 'secondary' : 'primary'} icon={SlidersHorizontal} onPress={onScenario} style={styles.actionButton} />
      </Card>

      {/* 3. The timeline in one list. */}
      <Card padded={false}>
        <CardHeader title="Your timeline" style={styles.listHeader} />
        {timeline.map((row, index) => (
          <View key={row.label} style={[styles.timelineRow, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null]}>
            <AppText variant="bodySmall" tone="ink2" style={styles.timelineLabel}>{row.label}</AppText>
            <View style={styles.timelineValue}>
              <AppText variant="amount" tone={row.warn ? 'warning' : 'ink'} align="right">{row.value}</AppText>
              <AppText variant="caption" tone="ink3" align="right">{row.detail}</AppText>
            </View>
          </View>
        ))}
      </Card>

      {/* 4. The projection. */}
      <Card>
        <CardHeader title="How your money grows, then draws down" subtitle="In future dollars, assuming steady returns" />
        <ProjectionChart fire={fire} depletion={depletion} peak={peak} />
        <AppText variant="caption" tone="ink2" style={styles.chartNote}>
          The gold dot is what you need in {retireMonth}. Dips below zero are months the plan cannot pay for, not borrowing.
          {depletion ? ' A later retirement date or a higher monthly investment would fix that.' : ''}
        </AppText>
        <AppText variant="caption" tone="ink3">
          {plan.portfolioOverride
            ? `Starts from the ${money(plan.portfolioOverride.amount, 0)} you typed, dated ${plan.portfolioOverride.date}.`
            : `Starts from ${amount(fire.currentInvestableAssets)} across ${plan.assetIds.length} asset${plan.assetIds.length === 1 ? '' : 's'} in the plan, at their latest values in Wealth.`}
        </AppText>
      </Card>

      {/* 5. What retirement costs each month. */}
      <Card>
        <CardHeader title="Monthly budget in retirement" subtitle="Per month, in future dollars" />
        {isSingapore && !cpfIncluded ? <AppText variant="caption" tone="warning" style={styles.note}>CPF LIFE income is not included{plan.cpfPlan === 'basic' ? ': Basic plan payouts are not modelled yet.' : ': the payout amount is not known yet.'}</AppText> : null}
        <View style={styles.columns}>
          {budgetColumns.map(({ title, when, row }) => (
            <View key={title} style={[styles.column, { backgroundColor: theme.surface2 }]}>
              <View style={styles.columnHead}>
                <AppText variant="label">{title}</AppText>
                {row ? <AppText variant="caption" tone="ink2">{when}</AppText> : null}
              </View>
              {row ? (
                <>
                  <Fact label="Spending" value={amount(row.expenses)} />
                  {isSingapore ? <Fact label="CPF LIFE payout" value={amount(row.cpf)} /> : null}
                  <Fact label="Other income" value={amount(row.otherIncome)} />
                  <Fact label="Drawn from your portfolio" value={money(Math.max(0, Number(row.expenses) - Number(row.cpf) - Number(row.otherIncome)), 0)} strong />
                </>
              ) : (
                <AppText variant="caption" tone="ink2">Outside this plan’s horizon.</AppText>
              )}
            </View>
          ))}
        </View>
      </Card>

      {/* 6. Evidence, folded away. */}
      <Collapsible title="Year by year" subtitle="Future dollars. In = investments plus income, Out = spending.">
        <View style={[styles.tableHead, { borderBottomColor: theme.line }]}>
          <AppText variant="overline" tone="ink2" style={styles.yearCell}>Year</AppText>
          <AppText variant="overline" tone="ink2" style={styles.numCell} align="right">In</AppText>
          <AppText variant="overline" tone="ink2" style={styles.numCell} align="right">Out</AppText>
          <AppText variant="overline" tone="ink2" style={styles.balanceCell} align="right">Balance</AppText>
        </View>
        {years.map((row) => (
          <View key={row.year} style={styles.tableRow}>
            <View style={styles.yearCell}>
              <AppText variant="amountSmall">{row.year}</AppText>
              <AppText variant="caption" tone="ink3">age {row.age}</AppText>
            </View>
            <AppText variant="caption" style={styles.numCell} align="right">{money(row.contribution + row.income, 0)}</AppText>
            <AppText variant="caption" style={styles.numCell} align="right">{money(row.expenses, 0)}</AppText>
            <AppText variant="amountSmall" tone={row.balance < 0 ? 'expense' : 'ink'} style={styles.balanceCell} align="right">{money(row.balance, 0)}</AppText>
          </View>
        ))}
      </Collapsible>

      <Collapsible title="How the numbers are calculated">
        <AppText variant="bodySmall" tone="ink2">
          {`Month by month: investments grow ${pct(plan.beforeReturn)} a year until you retire and ${pct(plan.afterReturn)} after, and spending rises ${pct(plan.inflation)} a year.`}
        </AppText>
        {firstRetirement ? <Formula label="Spending when you retire" value={`${money(plan.monthlySpending, 0)} today, after ${pct(plan.inflation)} a year of inflation = ${amount(firstRetirement.expenses)} a month`} /> : null}
        <Formula label="Amount needed" value={`Enough to pay every month to age ${plan.endAge}${isSingapore && cpfIncluded ? ', after CPF LIFE and other income' : ', after other income'} = ${amount(fire.fiTarget)}`} />
        <Formula label="Projected amount" value={`${amount(fire.currentInvestableAssets)} now plus ${contribution} a month, grown to ${retireMonth} = ${amount(fire.projectedPortfolio)}`} />
        <Formula label="Funded" value={`${amount(fire.projectedPortfolio)} ÷ ${amount(fire.fiTarget)} = ${percent(progress, 1)}`} />
      </Collapsible>

      <Collapsible title="Assumptions and data quality">
        <AppText variant="bodySmall" tone="ink2">
          {`Returns ${pct(plan.beforeReturn)} before and ${pct(plan.afterReturn)} after retiring, inflation ${pct(plan.inflation)}, planned to age ${plan.endAge}. Assumptions you can edit, not forecasts.`}
        </AppText>
        {fire.spendingBaseline.startDate && fire.spendingBaseline.endDate ? (
          <AppText variant="bodySmall" tone="ink2">{`Spending based on ${fire.spendingBaseline.completedMonths} recorded month${fire.spendingBaseline.completedMonths === 1 ? '' : 's'}.`}</AppText>
        ) : null}
        {fire.warnings
          .filter((warning) => isSingapore || warning.code !== 'cpf_not_included')
          .map((warning) => <AppText key={warning.code} variant="bodySmall" tone="ink2">{`• ${shortWarning(warning.code, warning.message)}`}</AppText>)}
        <AppText variant="caption" tone="ink3">{provenanceSummary(plan.provenance)}</AppText>
        {isSingapore ? (
          <AppText variant="caption" tone="ink3">CPF LIFE rules checked against the CPF Board on 6 Oct 2026.</AppText>
        ) : null}
      </Collapsible>

      {/* 7. Next steps. */}
      <View style={styles.footer}>
        <Button label="Review assets" variant="secondary" icon={Landmark} onPress={onAssets} style={styles.footerButton} />
        <Button label="Edit plan" variant="secondary" icon={PencilLine} onPress={onEdit} style={styles.footerButton} />
      </View>
    </>
  );
}

function Fact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.factRow}>
      <AppText variant={strong ? 'captionMedium' : 'caption'} tone={strong ? 'ink' : 'ink2'} style={styles.factLabel}>{label}</AppText>
      <AppText variant={strong ? 'amount' : 'amountSmall'}>{value}</AppText>
    </View>
  );
}

/** Plain, short versions of the engine's warnings; anything unknown keeps the engine's own words. */
const SHORT_WARNINGS: Record<string, string> = {
  smooth_returns: 'Assumes steady returns; real markets rise and fall.',
  selected_assets: 'Only the assets you ticked count.',
  cpf_not_included: 'CPF LIFE isn’t included yet.',
  stale_snapshot: 'Your typed total is over 35 days old.',
};
function shortWarning(code: string, message: string) {
  return SHORT_WARNINGS[code] ?? message;
}

/** "5 values typed by you, 3 defaults" for the plan's provenance. */
function provenanceSummary(provenance: Record<string, string>) {
  const values = Object.values(provenance);
  const typed = values.filter((value) => value === 'user-entered').length;
  const recorded = values.filter((value) => value === 'recorded').length;
  const defaults = values.length - typed - recorded;
  return [
    typed ? `${typed} value${typed === 1 ? '' : 's'} typed by you` : null,
    recorded ? `${recorded} from your records` : null,
    defaults ? `${defaults} default${defaults === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(', ') + '.';
}

function Formula({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.formula}>
      <AppText variant="captionMedium">{label}</AppText>
      <AppText variant="caption" tone="ink2">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 22,
    gap: 4,
  },
  heroStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  heroMeta: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroMetaValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  tightHeader: {
    marginBottom: spacing.sm,
  },
  actionButton: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  listHeader: {
    paddingHorizontal: layout.cardPad,
    paddingTop: layout.cardPad,
    marginBottom: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: layout.cardPad,
  },
  timelineLabel: {
    flex: 1,
    minWidth: 0,
  },
  timelineValue: {
    flexShrink: 0,
    maxWidth: '60%',
    gap: 2,
  },
  chartNote: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  note: {
    marginBottom: spacing.md,
  },
  columns: {
    gap: spacing.md,
  },
  column: {
    borderRadius: radii.tile,
    padding: spacing.md,
    gap: spacing.xs,
  },
  columnHead: {
    marginBottom: spacing.xs,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 24,
  },
  factLabel: {
    flex: 1,
  },
  tableHead: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
  },
  yearCell: {
    width: 60,
  },
  numCell: {
    flex: 1,
    minWidth: 0,
  },
  balanceCell: {
    flex: 1.15,
    minWidth: 0,
  },
  formula: {
    gap: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});
