import { NICKNAME_MAX_LENGTH, normaliseNickname, type LegalDocumentId } from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Doudou } from '@/components/brand/Doudou';
import { RegionPicker, type RegionChoice } from '@/components/profile/RegionPicker';
import { useTour } from '@/components/tour/TourProvider';
import { Button } from '@/components/ui/Button';
import { CheckboxRow } from '@/components/ui/CheckboxRow';
import { AppText } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { layout, spacing } from '@/constants/tokens';
import { useUserProfile } from '@/lib/user-profile';
import { useTheme } from '@/lib/theme';

/**
 * First-run welcome, shown once after the launch intro. DouDou asks what to call the user, then
 * where they live (Singapore gets the full app, elsewhere the general mode), then offers the
 * spotlight tour. The name is stored only on this phone. Leaving by either last button
 * marks the welcome done, so it never shows again; "Maybe later" also marks the tour done, which
 * Profile can replay.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { completeWelcome, completeTour, setRegion } = useUserProfile();
  const { startTour } = useTour();
  const input = useRef<TextInput>(null);
  const [draft, setDraft] = useState('');
  const [stage, setStage] = useState<'ask' | 'country' | 'greet'>('ask');
  const [nickname, setNickname] = useState<string | null>(null);
  const [region, setRegionChoice] = useState<RegionChoice>({ country: 'SG', currency: 'SGD' });
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const agreed = agreedTerms && agreedPrivacy;
  const cleaned = normaliseNickname(draft);

  // Android back must not slip past the welcome unanswered: each stage returns to the one before.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stage === 'greet') setStage('country');
      else if (stage === 'country') setStage('ask');
      return true;
    });
    return () => subscription.remove();
  }, [stage]);

  const submit = (value: string | null) => {
    input.current?.blur();
    setNickname(value);
    setStage('country');
  };

  const chooseRegion = () => {
    setRegion(region.country, region.currency);
    setStage('greet');
  };

  const openLegal = (doc: LegalDocumentId) => {
    input.current?.blur();
    router.push({ pathname: '/legal', params: { doc } });
  };

  const leave = (tour: boolean) => {
    completeWelcome(nickname);
    if (router.canGoBack()) router.back();
    else router.replace('/');
    if (tour) {
      // The spotlight keeps re-measuring while Home settles behind the closing welcome, so no wait is needed.
      startTour();
    } else {
      completeTour();
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: theme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + spacing.xl }]}
      >
        {stage === 'ask' ? (
          <Animated.View key="ask" exiting={FadeOut.duration(160)} style={styles.stage}>
            <View style={styles.hero}>
              <Doudou pose="hello" size={148} motion="idle" />
              <AppText variant="overline" tone="ink2" align="center">Welcome to FireBuddy</AppText>
              <AppText variant="pageTitle" align="center" accessibilityRole="header">
                {"Hi, I'm DouDou!\nHow should we address you?"}
              </AppText>
            </View>
            <TextField
              ref={input}
              label="Your name"
              placeholder="e.g. Jo"
              help="Only kept on this phone. You can change it in Profile."
              value={draft}
              onChangeText={setDraft}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              maxLength={NICKNAME_MAX_LENGTH + 8}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (cleaned && agreed) submit(cleaned);
              }}
            />
            {/* Sign-up agreement: both boxes must be ticked to go on; finishing the welcome records this version (see completeWelcome). */}
            <View style={styles.agreements}>
              <CheckboxRow checked={agreedTerms} onChange={setAgreedTerms} accessibilityLabel="I agree to the Terms of use">
                {'I agree to the '}
                <AppText variant="bodyMedium" tone="accentText" accessibilityRole="link" onPress={() => openLegal('terms')} suppressHighlighting>Terms of use</AppText>
              </CheckboxRow>
              <CheckboxRow checked={agreedPrivacy} onChange={setAgreedPrivacy} accessibilityLabel="I have read the Privacy policy">
                {"I've read the "}
                <AppText variant="bodyMedium" tone="accentText" accessibilityRole="link" onPress={() => openLegal('privacy')} suppressHighlighting>Privacy policy</AppText>
              </CheckboxRow>
              <AppText variant="caption" tone="ink3">FireBuddy is for information only, not financial advice.</AppText>
            </View>
            <View style={styles.actions}>
              <Button label="Continue" variant="primary" block disabled={!cleaned || !agreed} onPress={() => submit(cleaned)} />
              <Button label="Skip for now" variant="text" block disabled={!agreed} onPress={() => submit(null)} />
            </View>
          </Animated.View>
        ) : stage === 'country' ? (
          <Animated.View key="country" entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={styles.stage}>
            <View style={styles.hero}>
              <Doudou pose="point" size={112} motion="idle" />
              <AppText variant="pageTitle" align="center" accessibilityRole="header">Where do you live?</AppText>
              <AppText variant="body" tone="ink2" align="center">
                So I only show what fits you. CPF and SRS tools are for Singapore; elsewhere I keep things general.
              </AppText>
            </View>
            <RegionPicker value={region} onChange={setRegionChoice} />
            <View style={styles.actions}>
              <Button label="Continue" variant="primary" block onPress={chooseRegion} />
              <Button label="Back" variant="text" block onPress={() => setStage('ask')} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="greet" entering={FadeIn.duration(260)} style={styles.stage}>
            <View style={styles.hero}>
              <Doudou pose="yay" size={148} motion="celebrate" />
              <AppText variant="pageTitle" align="center" accessibilityRole="header">
                {nickname ? `Nice to meet you, ${nickname}!` : 'Nice to meet you!'}
              </AppText>
              <AppText variant="body" tone="ink2" align="center">
                Want a quick look around? It takes under a minute, and I will point at each thing as we go.
              </AppText>
            </View>
            <View style={styles.actions}>
              <Button label="Show me around" variant="primary" block onPress={() => leave(true)} />
              <Button label="Maybe later" variant="text" block onPress={() => leave(false)} />
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    justifyContent: 'center',
  },
  stage: {
    gap: spacing.xxl,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  agreements: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
});
