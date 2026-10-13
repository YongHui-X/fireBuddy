import { CPF_LIFE_SOURCE_DATE, CPF_PROJECTION_SOURCE_DATE, CPF_WITHDRAWAL_LABEL, fireStages, formatLongDate, type FireStage } from '@firebuddy/shared';
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
import { InfoButton } from '@/components/ui/InfoButton';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { ProgressTrack } from '@/components/ui/ProgressTrack';
import { AppText } from '@/components/ui/Text';
import { layout, radii, spacing } from '@/constants/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ageAt, describeFire, fireMonthLabel, pct, todaysMoney, useAffordableSpending, useFireProjection, usePayInsight } from '@/hooks/use-fire-plan';
import { useWealth } from '@/hooks/use-wealth';
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
  const projection = useFireProjection();
  const { result: fire, ready } = projection;
  const pay = usePayInsight(projection);
  const affordableSpending = useAffordableSpending(projection);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  // The ideal path: the same plan investing what it needs each month, which dates any stage the
  // current plan does not reach (owner, 10 Oct 2026). Without a gap it simply mirrors the plan.
  const needsIdeal = ready && fire.requiredMonthlyInvestment != null && fireStages(fire).some((stage) => !stage.month);
  const ideal = useFireProjection(needsIdeal ? { monthlyContribution: Number(fire.requiredMonthlyInvestment) } : undefined);
  const idealStages = needsIdeal ? fireStages(ideal.result) : [];

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
          {/* No plan yet: an invitation. A saved plan that stopped working says what to fix (PRD 6.6.1, 28). */}
          {projection.plan ? (
            <EmptyState
              doudou="point"
              title="Review your plan"
              message={fire.warnings.map((warning) => warning.message).join(' ') || 'Something in your plan needs another look.'}
              actionLabel="Edit plan"
              onAction={() => router.push('/fire-plan-edit')}
            />
          ) : (
            <EmptyState
              doudou="point"
              title="Set up your Financial Independence, Retire Early (FIRE) plan today!"
              message="The information you provide is stored only on your phone."
              actionLabel="Set up plan"
              onAction={() => router.push('/fire-plan-edit')}
            />
          )}
        </Card>
      ) : (
        <Results
          fire={fire}
          pay={pay}
          affordableSpending={affordableSpending}
          idealStages={idealStages}
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
  /** Savings rate and the "save 10% more" comparison (PRD 6.6.1, 23); null without pay. */
  pay: ReturnType<typeof usePayInsight>;
  /** Most monthly retirement spending the current plan pays for; null when funded or out of reach. */
  affordableSpending: number | null;
  /** Stage dates when investing what the plan needs; fills stages the current plan does not reach. */
  idealStages: readonly FireStage[];
  theme: ReturnType<typeof useTheme>['theme'];
  onScenario: () => void;
  onAssets: () => void;
  onEdit: () => void;
}

function Results({ fire, pay, affordableSpending, idealStages, theme, onScenario, onAssets, onEdit }: ResultsProps) {
  const { money, signedMoney, percent } = usePrivacy();
  const { isSingapore } = useRegion();
  // Every amount on the planner is in today's money; one set of numbers only (owner, 10 Oct 2026).
  const real = todaysMoney(fire);
  const amountAt = (value: string | number | null | undefined, month: string) => {
    const converted = real(value, month);
    return converted == null ? 'Unavailable' : money(converted, 0);
  };
  const { plan, depletion, funded, earliestAge, progress, contributionDelta, firstRetirement, firstCpf, cpfIncluded, cpfMonth, endMonth } = describeFire(fire);
  const retireMonth = fireMonthLabel(plan.retirementMonth);
  // Amounts at the stop-work month (amount needed, projected, shortfall) and now (assets, investing).
  const atRetirement = (value: string | null | undefined) => amountAt(value, plan.retirementMonth);
  const now = (value: string | number | null | undefined) => (value == null ? 'Unavailable' : money(Number(value), 0));
  // Progress today: current net worth (Home's figure: cash, investments and everything else, minus
  // debts) against the amount needed, both in today's money (owner, 10 and 13 Oct 2026). On track /
  // Shortfall still comes from the projection.
  const { netWorth, active: wealthRows } = useWealth();
  const neededToday = real(fire.fiTarget, plan.retirementMonth) ?? 0;
  const goalProgress = neededToday > 0 ? Math.max(0, netWorth) / neededToday : 1;
  const progressLabel = `${percent(goalProgress)} achieved`;
  // Why the plan's starting amount differs from net worth (owner, 10 Oct 2026).
  const planAssets = now(fire.currentInvestableAssets);
  const netWorthInfo = [
    'Net worth is everything you own minus everything you owe, so your debts are already taken off. It is the same figure as on Home.',
    plan.portfolioOverride
      ? `Your plan starts from the ${planAssets} you typed on ${formatLongDate(plan.portfolioOverride.date)}, which is not part of your net worth. To count it here, tick “Also add this to Wealth” in Edit plan.`
      : `Your plan grows only the assets you ticked as money you could spend in retirement: ${planAssets} today. Things like your home are part of your net worth but are left out of the plan, because you cannot spend them on living costs.`,
    'Change which assets count in Edit plan.',
  ];
  const contribution = money(plan.monthlyContribution, 0);
  const stepUp = plan.contributionGrowth ?? 0;

  // What actually happens for this FIRE type. The hero leads with the stage at the age the person
  // typed (retire, or go part-time for Barista); Coast's earlier Coast age sits in the (i) and the
  // timeline (owner, 10 Oct 2026).
  const stages = fireStages(fire);
  const primary = stages.find((stage) => stage.primary) ?? stages[0]!;
  const others = stages.filter((stage) => stage !== primary);
  const typeName = { lean: 'Lean FIRE', regular: 'Regular FIRE', fat: 'Fat FIRE', coast: 'Coast FIRE', barista: 'Barista FIRE', custom: 'Custom FIRE' }[plan.fireType ?? 'custom'];
  // Timeline and chart use the ideal path: a stage the current plan misses takes its ideal date.
  const plannedMonth = (stage: FireStage) => stage.month ?? idealStages.find((item) => item.key === stage.key)?.month ?? null;
  const stageEvents: TimelineEvent[] = stages.flatMap((stage) => {
    const month = plannedMonth(stage);
    return month ? [{ key: stage.key, label: stage.title, month, age: ageAt(plan, month), tone: stage.primary ? 'key' as const : undefined }] : [];
  });
  // The hero leads with the realistic date: the earliest month the plan is funded on the current
  // monthly investment, not the age typed (PRD 6.6.1, 29). The typed age is the goal beneath it.
  const realistic = fire.earliestRetirementMonth;
  // Coast FIRE's goal is its Coast age, when investing stops (PRD 6.6.1, 33).
  const goalAge = ageAt(plan, plan.fireType === 'coast' && plan.coastMonth ? plan.coastMonth : plan.retirementMonth);
  // Judged like the On track / Shortfall chip, so the two never disagree.
  // A lead-in then bulleted actions (owner, 11 Oct 2026). On track, the actions are about reaching FI
  // faster, so only they carry the time saved; a shortfall lists what closes the gap.
  // A shortfall lists alternatives, each enough on its own (PRD 6.6.1, 35): invest more, retire at the
  // earliest date the current investing allows (not Coast, whose goal is when investing stops), or
  // spend less in retirement. Save 10% more and a pay rise are partial or repeat "invest more".
  const goalMonth = plan.retirementMonth;
  const later = realistic && plan.fireType !== 'coast' && realistic > goalMonth ? realistic : null;
  const verb = primary.key === 'barista' ? 'Go part-time' : 'Retire';
  const shortfallActions = [
    ...(fire.requiredMonthlyInvestment != null ? [`Invest ${now(fire.requiredMonthlyInvestment)} a month instead of ${contribution}.`] : []),
    ...(later
      ? [earliestAge !== null && earliestAge > ageAt(plan, goalMonth)
        ? `${verb} at age ${earliestAge} instead of ${ageAt(plan, goalMonth)}.`
        : `${verb} in ${fireMonthLabel(later)} instead of ${fireMonthLabel(goalMonth)}.`]
      : []),
    ...(affordableSpending != null ? [`Spend ${money(affordableSpending, 0)} a month in retirement instead of ${money(plan.monthlySpending, 0)}.`] : []),
  ];
  const goalLine = funded
    ? `You’re on track for ${typeName} at age ${goalAge}.`
    : shortfallActions.length
      ? `To reach your goal of ${typeName} at age ${goalAge}, it is recommended to do either one of the following:`
      : `Your goal of ${typeName} at age ${goalAge} can’t be reached by investing more. Try a later age.`;
  // Non-breaking spaces keep "(S$650 a month)" on one line.
  const saveMore = pay ? `Save 10% more of your pay (${money(pay.extra, 0)} a month)` : null;
  const fasterBy = pay
    ? pay.monthsEarlier !== null && pay.monthsEarlier > 0
      ? `${yearsText(pay.monthsEarlier)} earlier to FI`
      : pay.monthsEarlier === 0 ? 'under a month earlier to FI' : null
    : null;
  const actions = funded ? (saveMore && fasterBy ? [`${saveMore}: ${fasterBy}.`] : []) : shortfallActions;
  // The same totals in the dollars of the retirement year, the figure the account would actually
  // show then, as their own rows beside today's money (PRD 6.6.1, 35).
  const retireYear = goalMonth.slice(0, 4);
  const actual = (value: string | null | undefined) => (value == null ? 'Unavailable' : money(Number(value), 0));
  // Chart and budget share one Today's $ | Actual $ choice, not saved.
  const [basis, setBasis] = useState<'today' | 'future'>('today');
  const future = basis === 'future';
  const shown = (value: string | number | null | undefined, month: string) => (future ? (value == null ? 'Unavailable' : money(Number(value), 0)) : amountAt(value, month));
  const basisSwitch = (
    <SegmentedControl
      options={[{ value: 'today', label: 'Today’s $' }, { value: 'future', label: 'Actual $' }]}
      value={basis}
      onChange={setBasis}
      accessibilityLabel="Show amounts in today’s or actual dollars"
      style={styles.basis}
    />
  );

  // The hero shows progress only, in one sentence; what to do sits in Recommended actions (owner, 11 Oct 2026).
  const heroLine = realistic
    ? primary.key === 'barista'
      ? `You can go part-time with ${typeName} by age ${earliestAge} in ${realistic.slice(0, 4)} with your current progress.`
      : `You can achieve ${typeName} by age ${earliestAge} in ${realistic.slice(0, 4)} with your current progress.`
    : `You’re not on track for ${typeName} yet. The recommended actions below can change that.`;

  // The hero's (i): the other stage, the earliest possible date and the money basis.
  const heroInfo = [
    ...others.map((stage) => {
      if (stage.month) return `${stage.title}: ${stage.action.toLowerCase()} in ${fireMonthLabel(stage.month)}, at age ${ageAt(plan, stage.month)}.`;
      const idealMonth = plannedMonth(stage);
      if (stage.key === 'coast' && idealMonth) return `${stage.title}: investing ${now(fire.requiredMonthlyInvestment)} a month would let you stop investing in ${fireMonthLabel(idealMonth)}, at age ${ageAt(plan, idealMonth)}.`;
      return stage.key === 'coast' ? `${stage.title}: keep investing until you retire.` : `${stage.title}: part-time work continues to the end of your plan.`;
    }),
    realistic
      ? `On your current investing of ${contribution} a month you could stop working in ${fireMonthLabel(realistic)}, at age ${earliestAge}.`
      : `On your current investing of ${contribution} a month your money doesn’t last to age ${plan.endAge}, whenever you stop.`,
    `The bar compares your current net worth with the amount needed. On track means the assets in your plan, plus your monthly investing, are projected to reach it.`,
    `All amounts are in today’s money, with ${pct(plan.inflation)} yearly inflation taken out.`,
  ];

  // Each stage's dashed line on the chart: a short word before its year at the foot, its age on top.
  const stageWord: Record<string, string> = { fire: 'Retire', coast: 'Coast', barista: 'Part-time', full: plan.fireType === 'barista' ? 'Stop' : 'Retire' };
  const chartStages = stages.flatMap((stage) => { const month = plannedMonth(stage); return month ? [{ month, label: stageWord[stage.key] ?? 'Retire', age: ageAt(plan, month) }] : []; });

  // The planned path, one short row per event: stages, CPF LIFE, the money running out (only if it
  // does) and the plan's end. No "not reached" rows (owner, 10 Oct 2026).
  const events: TimelineEvent[] = [
    ...stageEvents,
    ...(isSingapore && cpfIncluded ? [{ key: 'cpf', label: 'CPF LIFE payouts start', month: cpfMonth, age: plan.cpfStartAge }] : []),
    ...(plan.lumpSums ?? []).filter((item) => item.label === CPF_WITHDRAWAL_LABEL).map((item) => ({ key: 'cpfWithdrawal', label: 'CPF withdrawal at 55', month: item.month, age: ageAt(plan, item.month) })),
    ...(depletion ? [{ key: 'runsOut', label: 'Money runs out', month: depletion, age: ageAt(plan, depletion), tone: 'warn' as const }] : []),
    { key: 'end', label: 'Plan ends', month: endMonth, age: plan.endAge },
  ];
  // Date order; on the same month the FIRE stages come first, in stage order.
  const stageOrder = (event: TimelineEvent) => { const index = stages.findIndex((stage) => stage.key === event.key); return index < 0 ? 99 : index; };
  const timeline = [...events].sort((a, b) => a.month.localeCompare(b.month) || stageOrder(a) - stageOrder(b));

  const budgetColumns = [
    { title: plan.fireType === 'coast' ? 'First month of full retirement' : `First month of ${typeName}`, when: firstRetirement ? fireMonthLabel(firstRetirement.month) : '', row: firstRetirement },
    ...(isSingapore ? [{ title: 'Once CPF LIFE starts', when: `Age ${plan.cpfStartAge}`, row: firstCpf }] : []),
  ];

  return (
    <>
      {/* 1. When, and whether it works. */}
      <Card tone="hero" style={styles.hero}>
        {/* Only what matters at a glance; the detail sits behind the (i) (owner, 10 Oct 2026). */}
        <View style={styles.heroTitle}>
          <Chip label={typeName} tone="gold" round />
        </View>
        <AppText variant="pageTitle" tone="hero" style={styles.heroLine}>{heroLine}</AppText>
        <View style={styles.heroStatus}>
          {/* The (i) sits beside On track / Shortfall (owner, 13 Oct 2026). */}
          <View style={styles.heroTitle}>
            <Chip label={funded ? 'On track' : 'Shortfall'} tone={funded ? 'heroUp' : 'warning'} round />
            <InfoButton title={typeName} body={heroInfo} tone="hero" />
          </View>
          <AppText variant="captionMedium" tone="hero">{progressLabel}</AppText>
        </View>
        <ProgressTrack value={goalProgress} color={funded ? theme.railActiveInk : theme.warning} height={8} keepColorWhenOver accessibilityLabel={`Net worth is ${progressLabel}`} />
        <View style={[styles.heroMeta, { borderTopColor: theme.heroLine }]}>
          <View style={styles.heroMetaRow}>
            <AppText variant="overline" tone="heroMuted" style={styles.heroMetaLabel}>Amount needed (today’s $)</AppText>
            <AppText variant="amount" tone="hero" numberOfLines={1} adjustsFontSizeToFit style={styles.heroMetaValue}>{atRetirement(fire.fiTarget)}</AppText>
          </View>
          <View style={styles.heroMetaRow}>
            <AppText variant="overline" tone="heroMuted" style={styles.heroMetaLabel}>{`Amount needed in ${retireYear} (actual $)`}</AppText>
            <AppText variant="amount" tone="hero" numberOfLines={1} adjustsFontSizeToFit style={styles.heroMetaValue}>{actual(fire.fiTarget)}</AppText>
          </View>
          <View style={styles.heroMetaRow}>
            <View style={[styles.heroTitle, styles.heroMetaLabel]}>
              <AppText variant="overline" tone="heroMuted">Current net worth</AppText>
              <InfoButton title="Net worth and your plan" body={netWorthInfo} tone="hero" />
            </View>
            <AppText variant="amount" tone="hero" numberOfLines={1} adjustsFontSizeToFit style={styles.heroMetaValue}>{wealthRows.length ? signedMoney(netWorth, 0) : '—'}</AppText>
          </View>
        </View>
      </Card>

      {/* 2. Recommended actions: every goal and what moves it, in both states (owner, 11 Oct 2026). */}
      <Card>
        <CardHeader
          title="Recommended actions"
          info={funded ? [
            `The projection starts from the ${planAssets} in your plan’s assets, not your full net worth, then adds your monthly investing and growth.`,
            ...netWorthInfo.slice(1),
          ] : undefined}
          style={styles.tightHeader}
        />
        <AppText variant="bodySmall" tone="ink">{goalLine}</AppText>
        {funded ? (
          <View style={[styles.factList, styles.payLines, { borderTopColor: theme.line }]}>
            <Fact label={`Projected by ${retireYear} (today’s $)`} value={atRetirement(fire.projectedPortfolio)} />
            <Fact label={`Projected by ${retireYear} (actual $)`} value={actual(fire.projectedPortfolio)} />
            <Fact label="Amount needed (today’s $)" value={atRetirement(fire.fiTarget)} />
            <Fact label={`Amount needed in ${retireYear} (actual $)`} value={actual(fire.fiTarget)} />
            <Fact label={stepUp ? `You invest a month, rising ${pct(stepUp)} a year` : 'You invest a month'} value={contribution} />
            {contributionDelta != null && contributionDelta < -0.005 ? <Fact label="The least you could invest a month" value={now(fire.requiredMonthlyInvestment)} /> : null}
          </View>
        ) : null}
        {actions.length ? (
          <View style={[styles.actions, funded ? [styles.payLines, { borderTopColor: theme.line }] : null]}>
            {funded ? <AppText variant="bodySmall" tone="ink">To reach FI faster:</AppText> : null}
            {actions.map((action) => (
              <View key={action} style={styles.bullet}>
                <AppText variant="bodySmall" tone="ink">•</AppText>
                <AppText variant="bodySmall" tone="ink" style={styles.bulletText}>{action}</AppText>
              </View>
            ))}
            {!funded ? <AppText variant="caption" tone="ink2" style={styles.mixNote}>Or mix smaller steps of each in Try a scenario.</AppText> : null}
          </View>
        ) : null}
      </Card>

      {/* 3. The timeline, one event per row. */}
      <Card padded={false}>
        <CardHeader title="Your FIRE timeline" info="Your planned path, assuming you invest what the plan needs each month." style={styles.listHeader} />
        <View style={styles.timeline}>
          {timeline.map((event, index) => {
            const dot = event.tone === 'warn' ? theme.warning : event.tone === 'key' ? theme.primary : theme.accent;
            const last = index === timeline.length - 1;
            return (
              <View key={event.key} style={styles.event}>
                <View style={styles.rail}>
                  <View style={[styles.railDot, { backgroundColor: dot }]} />
                  {!last ? <View style={[styles.railLine, { backgroundColor: theme.line }]} /> : null}
                </View>
                <View style={[styles.eventBody, !last ? styles.eventGap : null]}>
                  <AppText variant="caption" tone="ink2">{event.label}</AppText>
                  <View style={styles.eventMain}>
                    <AppText variant="bodySemibold" tone={event.tone === 'warn' ? 'warning' : 'ink'} style={styles.eventValue}>{fireMonthLabel(event.month)}</AppText>
                    <Chip label={`Age ${event.age}`} tone={event.tone === 'key' ? 'gold' : 'neutral'} round />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      {/* 4. The projection. */}
      <Card>
        <CardHeader
          title="FIRE Projection"
          info={[
            'Your investments grow until you stop full-time work, then pay for your spending. The dark dot is the amount you need at that point. Dashed lines mark your FIRE stages.',
            future
              ? 'Actual $ shows each year’s amount in the dollars of that year, with no inflation taken out, so the line climbs faster.'
              : 'Everything is in today’s money: inflation is taken out, so figures compare with prices now.',
            ...((plan.lumpSums ?? []).some((item) => item.direction === 'out' && item.month < plan.retirementMonth)
              ? ['A ring on the line is a big cost, such as cash for a home, taken from your investments that month, so the line drops there.']
              : []),
            plan.portfolioOverride
              ? `Starts from the ${money(plan.portfolioOverride.amount, 0)} you typed on ${formatLongDate(plan.portfolioOverride.date)}.`
              : `Starts from ${now(fire.currentInvestableAssets)} across ${plan.assetIds.length} asset${plan.assetIds.length === 1 ? '' : 's'} in the plan, at their latest values in Wealth.`,
            'The line assumes steady returns; the good and bad markets card below shows how sure it is. Dips below zero are months the plan cannot pay for, not borrowing.',
          ]}
          style={styles.tightHeader}
        />
        {basisSwitch}
        <ProjectionChart fire={fire} depletion={depletion} stages={chartStages} future={future} />
        {depletion ? (
          <AppText variant="caption" tone="warning" style={styles.chartNote}>A later retirement date or a higher monthly investment would stop the money running out.</AppText>
        ) : null}
      </Card>

      {/* 5. What retirement costs each month, in today's money first (PRD 6.6.1, 4). */}
      <Card>
        <CardHeader
          title="Monthly budget in retirement"
          subtitle={future ? 'Per month, in the dollars of that year' : 'Per month, in today’s money'}
          info={[
            future
              ? `Actual $ shows what each line will cost in the dollars of that year, with prices rising ${pct(plan.inflation)} a year. Switch to Today’s $ to compare with what you spend now.`
              : `Your ${money(plan.monthlySpending, 0)} a month stays ${money(plan.monthlySpending, 0)} here: amounts are in today’s money, so you can compare them with what you spend now. The plan still allows for prices rising ${pct(plan.inflation)} a year.`,
            ...(plan.healthcare ? [`Insurance and healthcare rise ${pct(plan.healthcare.growth)} a year, faster than other prices, so they look bigger here in later years.`] : []),
            ...(isSingapore && cpfIncluded ? [`Your CPF LIFE payout of ${money(plan.cpfMonthlyPayout, 0)} is in the dollars of the year it starts, as the CPF estimator shows it. In today’s money that is ${amountAt(plan.cpfMonthlyPayout, cpfMonth)} a month${future ? '' : ', which is why it looks smaller here'}.`] : []),
          ]}
        />
        {basisSwitch}
        {isSingapore && !cpfIncluded && plan.residency !== 'foreigner' ? <AppText variant="caption" tone="warning" style={styles.note}>CPF LIFE income is not included yet. Edit plan can estimate it for you.</AppText> : null}
        <View style={styles.columns}>
          {budgetColumns.map(({ title, when, row }) => {
            const fact = (label: string, value: number, strong = false) => (row ? (
              <Fact label={label} value={shown(value, row.month)} strong={strong} />
            ) : null);
            return (
              <View key={title} style={[styles.column, { backgroundColor: theme.surface2 }]}>
                <View style={styles.columnHead}>
                  <AppText variant="label">{title}</AppText>
                  {row ? <AppText variant="caption" tone="ink2">{when}</AppText> : null}
                </View>
                {row ? (
                  <>
                    {fact('Spending', Number(row.expenses) - Number(row.healthcare ?? 0))}
                    {row.healthcare !== undefined ? fact('Insurance and healthcare', Number(row.healthcare)) : null}
                    {isSingapore ? fact('CPF LIFE payout', Number(row.cpf)) : null}
                    {fact('Other income', Number(row.otherIncome))}
                    {fact('Drawn from your portfolio', Math.max(0, Number(row.expenses) - Number(row.cpf) - Number(row.otherIncome)), true)}
                  </>
                ) : (
                  <AppText variant="caption" tone="ink2">Outside this plan’s horizon.</AppText>
                )}
              </View>
            );
          })}
        </View>
      </Card>

      {/* 6. Evidence, folded away. */}
      <Collapsible title="How the numbers are calculated">
        <AppText variant="bodySmall" tone="ink2">
          {`Month by month: investments grow ${plan.beforeReturn === plan.afterReturn ? `${pct(plan.beforeReturn)} a year` : `${pct(plan.beforeReturn)} a year until you retire and ${pct(plan.afterReturn)} after`}, and spending rises ${pct(plan.inflation)} a year.${stepUp ? ` Your monthly investment rises ${pct(stepUp)} each year until you retire.` : ''}`}
        </AppText>
        <AppText variant="bodySmall" tone="ink2">Every amount is shown in today’s money: the figure divided by inflation from now to that month.</AppText>
        <Formula label="Amount needed" value={`Enough to pay ${money(plan.monthlySpending, 0)} a month to age ${plan.endAge}${isSingapore && cpfIncluded ? ', after CPF LIFE and other income' : ', after other income'}${plan.lumpSums?.length ? ' and your big costs and payments' : ''} = ${atRetirement(fire.fiTarget)}`} />
        <Formula label="Projected amount" value={`${now(fire.currentInvestableAssets)} now plus ${contribution} a month${stepUp ? ` rising ${pct(stepUp)} a year` : ''}, grown to ${retireMonth} = ${atRetirement(fire.projectedPortfolio)}`} />
        <Formula label="On track" value={`Projected ${atRetirement(fire.projectedPortfolio)} ÷ needed ${atRetirement(fire.fiTarget)} = ${percent(progress, 1)}`} />
        <Formula label="How far you are" value={`Net worth ${signedMoney(netWorth, 0)} ÷ needed ${atRetirement(fire.fiTarget)} = ${percent(goalProgress, 1)}`} />
      </Collapsible>

      <Collapsible title="Assumptions and data quality">
        <AppText variant="bodySmall" tone="ink2">
          {`Returns ${plan.beforeReturn === plan.afterReturn ? pct(plan.beforeReturn) : `${pct(plan.beforeReturn)} before and ${pct(plan.afterReturn)} after retiring`}, inflation ${pct(plan.inflation)}, planned to age ${plan.endAge}. Assumptions you can edit, not forecasts.`}
        </AppText>
        {fire.spendingBaseline.startDate && fire.spendingBaseline.endDate ? (
          <AppText variant="bodySmall" tone="ink2">{`Spending based on ${fire.spendingBaseline.completedMonths} recorded month${fire.spendingBaseline.completedMonths === 1 ? '' : 's'}.`}</AppText>
        ) : null}
        {fire.warnings
          .filter((warning) => (isSingapore && plan.residency !== 'foreigner') || warning.code !== 'cpf_not_included')
          .map((warning) => <AppText key={warning.code} variant="bodySmall" tone="ink2">{`• ${shortWarning(warning.code, warning.message)}`}</AppText>)}
        <AppText variant="caption" tone="ink3">{provenanceSummary(plan.provenance)}</AppText>
        {isSingapore && cpfIncluded && plan.cpfEstimate ? (
          <AppText variant="bodySmall" tone="ink2">
            {plan.cpfEstimate.source === 'balances' && plan.cpfBalances
              ? `CPF LIFE ${money(plan.cpfMonthlyPayout, 0)} a month is projected from your CPF balances with CPF’s 2026 contribution, allocation and interest rates, setting aside the ${CPF_SUM_NAMES[plan.cpfEstimate.sum]} at 55. Pay and CPF ceilings are assumed to rise with inflation; CPF credits interest yearly where the plan does it monthly. Check yours with CPF’s Retirement Payout Planner.`
              : `CPF LIFE ${money(plan.cpfMonthlyPayout, 0)} a month is estimated from the ${CPF_SUM_NAMES[plan.cpfEstimate.sum]} at 55, using CPF’s published figures. Check yours with CPF’s Retirement Payout Planner.`}
          </AppText>
        ) : null}
        {isSingapore && plan.residency === 'foreigner' ? (
          <AppText variant="bodySmall" tone="ink2">No CPF: you said you are not a Singapore citizen or PR.</AppText>
        ) : null}
        {isSingapore && cpfIncluded ? (
          <AppText variant="caption" tone="ink3">{`CPF figures checked against the CPF Board on ${new Date(plan.cpfEstimate?.source === 'balances' ? CPF_PROJECTION_SOURCE_DATE : CPF_LIFE_SOURCE_DATE).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}.`}</AppText>
        ) : null}
      </Collapsible>

      {/* 7. Next steps; Try a scenario sits above the other two (owner, 11 Oct 2026). */}
      <Button label="Try a scenario" variant={funded ? 'secondary' : 'primary'} icon={SlidersHorizontal} block onPress={onScenario} />
      <View style={styles.footer}>
        <Button label="Review assets" variant="secondary" icon={Landmark} onPress={onAssets} style={styles.footerButton} />
        <Button label="Edit plan" variant="secondary" icon={PencilLine} onPress={onEdit} style={styles.footerButton} />
      </View>
    </>
  );
}

interface TimelineEvent {
  key: string;
  label: string;
  /** YYYY-MM. */
  month: string;
  age: number;
  tone?: 'key' | 'warn';
}

/** "2 years", "1 year 3 months" or "5 months" for a count of months. */
function yearsText(months: number) {
  const years = Math.floor(months / 12), rest = months % 12;
  const y = years ? `${years} year${years === 1 ? '' : 's'}` : '';
  const m = rest ? `${rest} month${rest === 1 ? '' : 's'}` : '';
  return [y, m].filter(Boolean).join(' ');
}

/** One budget line in today's money. */
function Fact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.factRow}>
      <AppText variant={strong ? 'captionMedium' : 'caption'} tone={strong ? 'ink' : 'ink2'} style={styles.factLabel}>{label}</AppText>
      <AppText variant={strong ? 'amount' : 'amountSmall'} align="right" numberOfLines={1}>{value}</AppText>
    </View>
  );
}

const CPF_SUM_NAMES = { brs: 'Basic Retirement Sum', frs: 'Full Retirement Sum', ers: 'Enhanced Retirement Sum' } as const;

/** Plain, short versions of the engine's warnings; anything unknown keeps the engine's own words. */
const SHORT_WARNINGS: Record<string, string> = {
  smooth_returns: 'The main figures assume steady returns; “In good and bad markets” shows how they hold up.',
  selected_assets: 'Only the assets you ticked count.',
  cpf_not_included: 'CPF LIFE isn’t included yet.',
  cpf_basic_level: 'Basic payouts fall once your CPF balances drop below S$60,000; they are counted as level here.',
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
  heroTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroLine: {
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  bullet: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bulletText: {
    flex: 1,
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
  // Every row is as tall as the (i) button and centres its label and amount, so the three
  // lines sit evenly apart whether or not a row has an (i) or a label that wraps.
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 24,
  },
  // Amounts keep their full size; a long label such as "Amount needed in 2045 (actual $)" wraps instead.
  heroMetaValue: {
    flexShrink: 0,
    textAlign: 'right',
  },
  tightHeader: {
    marginBottom: spacing.sm,
  },
  heroMetaLabel: {
    flexShrink: 1,
  },
  mixNote: {
    marginTop: spacing.xs,
  },
  basis: {
    marginBottom: spacing.sm,
  },
  listHeader: {
    paddingHorizontal: layout.cardPad,
    paddingTop: layout.cardPad,
    marginBottom: spacing.xs,
  },
  timeline: {
    paddingHorizontal: layout.cardPad,
    paddingBottom: layout.cardPad,
    paddingTop: spacing.xs,
  },
  event: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    width: 12,
    alignItems: 'center',
  },
  railDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  railLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    borderRadius: 1,
  },
  eventBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eventGap: {
    paddingBottom: spacing.lg,
  },
  eventMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eventValue: {
    flexShrink: 1,
  },
  chartNote: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  note: {
    marginBottom: spacing.md,
  },
  payLines: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  factList: {
    gap: spacing.sm,
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
  formula: {
    gap: 2,
  },
  // Side by side when both labels fit; stacked on narrow phones so "Review assets" never splits.
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  footerButton: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 170,
  },
});
