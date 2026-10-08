import { LEGAL_LAST_UPDATED, needsLegalNotice, type LegalDocumentId } from '@firebuddy/shared';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Doudou } from '@/components/brand/Doudou';
import { useTour } from '@/components/tour/TourProvider';
import { spacing } from '@/constants/tokens';
import { useUserProfile } from '@/lib/user-profile';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { AppText } from '../ui/Text';

/** Whether the updated-terms notice is waiting, so other first-run prompts can hold back. */
export function useLegalNoticePending() {
  const { welcomedAt, legalAcceptedVersion } = useUserProfile();
  return needsLegalNotice({ welcomedAt, acceptedVersion: legalAcceptedVersion });
}

/**
 * Tells a phone that finished the welcome before the current terms that they have changed, the
 * usual "we've updated our terms" notice. Continue records agreement; reading either document
 * hides the notice until the person comes back. New installs agree on the welcome instead.
 */
export function LegalNotice({ hidden }: { hidden: boolean }) {
  const pending = useLegalNoticePending();
  const { acceptLegal } = useUserProfile();
  const { active: touring } = useTour();
  const pathname = usePathname();
  const router = useRouter();
  const open = pending && !hidden && !touring && pathname !== '/legal' && pathname !== '/welcome';

  const read = (doc: LegalDocumentId) => router.push({ pathname: '/legal', params: { doc } });

  return (
    <BottomSheet open={open} onClose={() => undefined} dismissable={false}>
      <View style={styles.body}>
        <Doudou pose="hello" size={88} motion="idle" />
        <AppText variant="cardTitle" align="center">We’ve updated our terms</AppText>
        <AppText variant="body" tone="ink2" align="center">
          {`Our Terms of use and Privacy policy were updated on ${LEGAL_LAST_UPDATED}. Your records still stay on this phone. By tapping Continue, you agree to the updated terms.`}
        </AppText>
        <View style={styles.links}>
          <Button label="Terms of use" variant="text" size="compact" onPress={() => read('terms')} />
          <Button label="Privacy policy" variant="text" size="compact" onPress={() => read('privacy')} />
        </View>
        <Button label="Continue" variant="primary" block onPress={acceptLegal} style={styles.continue} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: spacing.md,
  },
  links: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  continue: {
    alignSelf: 'stretch',
  },
});
