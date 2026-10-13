import { formatMoney, type DoudouPose } from '@firebuddy/shared';
import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { DOUDOU_CONSENT, type DoudouConsentStepKey } from '@/lib/ai-preference';
import { useTheme } from '@/lib/theme';
import { useRegion } from '@/lib/user-profile';

import { Doudou } from '../brand/Doudou';
import { Button } from '../ui/Button';
import { StepDialog, type DialogStep } from '../ui/StepDialog';
import { AppText } from '../ui/Text';

export interface DoudouConsentDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  working?: boolean;
  error?: string | null;
}

/**
 * DouDou's pose on each page: waving hello, pointing at the phone, thinking, smiling, then
 * celebrating the choice. The `shh` pose was dropped from page 2: its leaf over the mouth read badly.
 */
const POSES: Record<DoudouConsentStepKey, DoudouPose> = {
  meet: 'hello',
  stays: 'point',
  ranges: 'think',
  answers: 'hello',
  control: 'yay',
};

/** The "rough ranges" page shows what DouDou sees: an exact figure turning into a band. Example numbers only. */
function RangeExample() {
  const { theme } = useTheme();
  const { currency } = useRegion();
  const exact = formatMoney(38240, currency, 0);
  return (
    <View style={styles.example} accessible accessibilityLabel={`For example, ${exact} becomes the range 25k to 50k`}>
      <View style={[styles.chip, { borderColor: theme.lineStrong }]}>
        <AppText variant="amount" tone="ink3" style={styles.struck}>{exact}</AppText>
      </View>
      <ArrowRight size={18} color={theme.ink3} strokeWidth={2} />
      <View style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
        <AppText variant="amount" tone="accentText">25k–50k</AppText>
      </View>
    </View>
  );
}

/**
 * DouDou's consent as a short series of pages read with Next, ending on Decline and Agree side by
 * side. Presentation only; the caller runs `turnOn`. Back and backdrop count as Decline unless a
 * turn-on is in flight. The words live in `DOUDOU_CONSENT`.
 */
export function DoudouConsentDialog({ open, onAccept, onDecline, working = false, error }: DoudouConsentDialogProps) {
  // The turn-on error lives in the shared preference state and outlasts the popup, so show it only
  // after Agree is tapped in this opening; otherwise an old failure greets the person on the last page.
  const [tried, setTried] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTried(false);
  }
  const accept = () => {
    setTried(true);
    onAccept();
  };

  const steps: DialogStep[] = DOUDOU_CONSENT.steps.map((step) => ({
    ...step,
    art: <Doudou pose={POSES[step.key]} size={112} motion={step.key === 'control' ? 'celebrate' : 'idle'} />,
    extra: step.key === 'ranges' ? <RangeExample /> : undefined,
  }));

  return (
    <StepDialog
      open={open}
      steps={steps}
      onClose={working ? undefined : onDecline}
      allowSkip
      locked={working}
      labels={{ next: DOUDOU_CONSENT.next, back: DOUDOU_CONSENT.back, skip: DOUDOU_CONSENT.skip }}
      finalFooter={(
        <View style={styles.footer}>
          {tried && error ? <AppText variant="bodySmall" tone="danger" align="center" accessibilityLiveRegion="polite">{error}</AppText> : null}
          <View style={styles.actions}>
            <Button label={DOUDOU_CONSENT.decline} variant="tonal" onPress={onDecline} disabled={working} style={styles.action} />
            <Button label={DOUDOU_CONSENT.accept} variant="primary" loading={working} onPress={accept} style={styles.action} />
          </View>
          <AppText variant="caption" tone="ink3" align="center">{DOUDOU_CONSENT.footnote}</AppText>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  footer: {
    gap: spacing.sm,
  },
  // Two buttons of equal width and weight, side by side.
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    alignSelf: 'stretch',
  },
});
