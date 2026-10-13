import { LEGAL_LAST_UPDATED, needsLegalNotice, type LegalDocumentId } from '@firebuddy/shared';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Doudou } from '@/components/brand/Doudou';
import { useTour } from '@/components/tour/TourProvider';
import { spacing } from '@/constants/tokens';
import { useUserProfile } from '@/lib/user-profile';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { CheckboxRow } from '../ui/CheckboxRow';
import { AppText } from '../ui/Text';

/** Whether the updated-terms notice is waiting, so other first-run prompts can hold back. */
export function useLegalNoticePending() {
  const { welcomedAt, legalAcceptedVersion } = useUserProfile();
  return needsLegalNotice({ welcomedAt, acceptedVersion: legalAcceptedVersion });
}

/**
 * Tells a phone that finished the welcome before the current terms that they have changed, the
 * usual "we've updated our terms" notice. As on the welcome, Continue stays off until both tick
 * boxes are ticked, then records agreement; reading either document hides the notice until the
 * person comes back. New installs agree on the welcome instead.
 */
export function LegalNotice({ hidden }: { hidden: boolean }) {
  const pending = useLegalNoticePending();
  const { acceptLegal } = useUserProfile();
  const { active: touring } = useTour();
  const pathname = usePathname();
  const router = useRouter();
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const open = pending && !hidden && !touring && pathname !== '/legal' && pathname !== '/welcome';

  const read = (doc: LegalDocumentId) => router.push({ pathname: '/legal', params: { doc } });

  return (
    <BottomSheet open={open} onClose={() => undefined} dismissable={false}>
      <View style={styles.body}>
        <Doudou pose="hello" size={88} motion="idle" />
        <AppText variant="cardTitle" align="center">We’ve updated our terms</AppText>
        <AppText variant="body" tone="ink2" align="center">
          {`Our Terms of use and Privacy policy were updated on ${LEGAL_LAST_UPDATED}. Your records still stay on this phone.`}
        </AppText>
        <View style={styles.agreements}>
          <CheckboxRow checked={agreedTerms} onChange={setAgreedTerms} accessibilityLabel="I agree to the updated Terms of use">
            {'I agree to the updated '}
            <AppText variant="bodyMedium" tone="accentText" accessibilityRole="link" onPress={() => read('terms')} suppressHighlighting style={{ textDecorationLine: 'underline' }}>Terms of use</AppText>
          </CheckboxRow>
          <CheckboxRow checked={agreedPrivacy} onChange={setAgreedPrivacy} accessibilityLabel="I have read the updated Privacy policy">
            {"I've read the updated "}
            <AppText variant="bodyMedium" tone="accentText" accessibilityRole="link" onPress={() => read('privacy')} suppressHighlighting style={{ textDecorationLine: 'underline' }}>Privacy policy</AppText>
          </CheckboxRow>
        </View>
        <Button label="Continue" variant="primary" block disabled={!agreedTerms || !agreedPrivacy} onPress={acceptLegal} style={styles.continue} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: spacing.md,
  },
  agreements: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  continue: {
    alignSelf: 'stretch',
  },
});
