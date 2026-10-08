import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { remindersSupported, requestReminderPermission } from '@/lib/daily-reminder';
import { useUserProfile } from '@/lib/user-profile';

import { Doudou } from '../brand/Doudou';
import { useTour } from '../tour/TourProvider';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { AppText } from '../ui/Text';

/**
 * Asked once, after the welcome and the tutorial are behind the user: would they like DouDou's 9pm
 * nudge? Only "Yes" leads to the system permission prompt, so nobody gets a cold OS dialog.
 */
export function ReminderPrompt({ hidden }: { hidden: boolean }) {
  const { welcomedAt, tourDoneAt, reminderOn, setReminderOn } = useUserProfile();
  const { active: touring } = useTour();
  const [busy, setBusy] = useState(false);
  const open = remindersSupported && !hidden && !touring && Boolean(welcomedAt && tourDoneAt) && reminderOn === null;

  const answer = async (yes: boolean) => {
    if (!yes) {
      setReminderOn(false);
      return;
    }
    setBusy(true);
    const granted = await requestReminderPermission().catch(() => false);
    setBusy(false);
    setReminderOn(granted);
  };

  return (
    <BottomSheet open={open} onClose={() => void answer(false)} dismissable={!busy}>
      <View style={styles.body}>
        <Doudou pose="hello" size={96} motion="idle" />
        <AppText variant="cardTitle" align="center">Want a nudge at 9pm?</AppText>
        <AppText variant="body" tone="ink2" align="center">
          If nothing is logged by then, I will pop up and ask about today. Never any amounts, and you can turn it off in Profile.
        </AppText>
        <View style={styles.actions}>
          <Button label="Yes, remind me" variant="primary" block loading={busy} onPress={() => void answer(true)} />
          <Button label="No thanks" variant="text" block disabled={busy} onPress={() => void answer(false)} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: spacing.md,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
});
