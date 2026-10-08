import { isLegalDocumentId, LEGAL_CONTACT_EMAIL, LEGAL_DOCUMENTS, LEGAL_LAST_UPDATED } from '@firebuddy/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

/**
 * Terms of use or the privacy policy, chosen by `?doc=terms|privacy` (privacy by default). Opened
 * from the welcome, the updated-terms notice and Profile. The copy lives in `packages/shared`.
 */
export default function LegalScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const document = LEGAL_DOCUMENTS[isLegalDocumentId(doc) ? doc : 'privacy'];
  const other = LEGAL_DOCUMENTS[document.id === 'terms' ? 'privacy' : 'terms'];
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen>
      <PageToolbar title={document.title} description={`Last updated ${LEGAL_LAST_UPDATED}`} onBack={back} />

      <AppText variant="body" tone="ink2">{document.introduction}</AppText>

      <Card tone="muted" style={styles.highlights}>
        <AppText variant="overline" tone="ink2">At a glance</AppText>
        {document.highlights.map((line) => (
          <View key={line} style={styles.highlight}>
            <Check size={16} color={theme.accent} strokeWidth={2.5} style={styles.tick} />
            <AppText variant="bodySmall" style={styles.highlightText}>{line}</AppText>
          </View>
        ))}
      </Card>

      {document.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <AppText variant="cardTitle" accessibilityRole="header">{section.heading}</AppText>
          <AppText variant="body" tone="ink2">{section.body}</AppText>
        </View>
      ))}

      <View style={styles.actions}>
        <Button label={`Read the ${other.title.toLowerCase()}`} variant="secondary" block onPress={() => router.setParams({ doc: other.id })} />
        <Button label="Email us" variant="text" block onPress={() => { Linking.openURL(`mailto:${LEGAL_CONTACT_EMAIL}?subject=FireBuddy`).catch(() => undefined); }} />
        {/* Finished reading: return to where the document was opened (the welcome, the notice or Profile). */}
        <Button label="Back" variant="primary" block onPress={back} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  highlights: {
    gap: spacing.sm,
  },
  highlight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tick: {
    marginTop: 2,
  },
  highlightText: {
    flex: 1,
  },
  section: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
});
