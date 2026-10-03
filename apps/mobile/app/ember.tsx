import { useRouter } from 'expo-router';
import { ArrowUp, Eraser, PlugZap, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { EmberMark } from '@/components/brand/BrandMarks';
import { EmberBubble } from '@/components/ember/EmberBubble';
import { Screen, useScreenInsets } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { PressOverlay } from '@/components/ui/PressOverlay';
import { AppText } from '@/components/ui/Text';
import { fonts, layout, radii, spacing } from '@/constants/tokens';
import { useEmber } from '@/hooks/use-ember';
import { AI_LEVEL_COPY } from '@/lib/ai-preference';
import { MAX_EMBER_QUESTION_LENGTH } from '@/lib/ember-api';
import { useTheme } from '@/lib/theme';

/**
 * Ember, the Singapore finance guide, as a phone chat: transcript above, composer pinned to the
 * keyboard. Starter cards fill the composer and nothing is sent until the person taps Send.
 * Answers come from the FastAPI RAG route and need a signed-in session; see `lib/ember-api.ts`.
 */
export default function EmberScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useScreenInsets();
  const ember = useEmber();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const canSend = !ember.aiOff && ember.availability.available && ember.draft.trim().length > 0 && !ember.busy;

  // Keep the newest turn in view as answers arrive.
  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [ember.messages]);

  const fill = (question: string) => {
    ember.setDraft(question);
    inputRef.current?.focus();
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.transcript} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          <PageToolbar
            title="Ask Ember"
            description="Grounded answers on CPF, SRS, savings and FIRE, with sources."
            onBack={() => router.back()}
            trailing={ember.messages.length ? <IconButton icon={Eraser} accessibilityLabel="Clear conversation" onPress={() => setConfirmClear(true)} /> : undefined}
          />

          {ember.aiOff ? (
            <Card style={styles.consent}>
              <View style={styles.intro}>
                <View style={[styles.introMark, { backgroundColor: theme.surface2 }]}>
                  <EmberMark size={26} />
                </View>
                <View style={styles.introCopy}>
                  <AppText variant="cardTitle">Turn on Ember</AppText>
                  <AppText variant="bodySmall" tone="ink2">Ember uses a third-party AI provider hosted outside Singapore. You choose how much it may see, and you can change this any time in Profile.</AppText>
                </View>
              </View>
              {(['guide', 'personalised'] as const).map((level) => (
                <View key={level} style={[styles.consentOption, { backgroundColor: theme.surface2 }]}>
                  <AppText variant="bodySemibold">{AI_LEVEL_COPY[level].title}</AppText>
                  <AppText variant="caption" tone="ink2">{AI_LEVEL_COPY[level].summary}</AppText>
                  <Button label={`Use ${AI_LEVEL_COPY[level].title}`} variant={level === 'personalised' ? 'primary' : 'secondary'} onPress={() => ember.setAiPreference(level)} style={styles.consentButton} />
                </View>
              ))}
              <View style={styles.consentFootnote}>
                <ShieldCheck size={14} color={theme.ink3} strokeWidth={2} />
                <AppText variant="caption" tone="ink3" style={styles.consentFootnoteText}>{"Requests are not used to train the provider's models. Exact figures and transactions never leave FireBuddy."}</AppText>
              </View>
            </Card>
          ) : null}

          {!ember.aiOff && !ember.availability.available ? (
            <Card tone="muted" style={styles.notice}>
              <View style={[styles.noticeIcon, { backgroundColor: theme.surface }]}>
                <PlugZap size={20} color={theme.ink2} strokeWidth={1.9} />
              </View>
              <View style={styles.noticeCopy}>
                <AppText variant="bodySemibold">Ember is not connected on this phone yet</AppText>
                <AppText variant="bodySmall" tone="ink2">
                  {ember.availability.reason === 'no-api'
                    ? 'Answers come from the FireBuddy API with a signed-in account. Sign-in is next for mobile; until then Ember is available in the web app.'
                    : 'The API is configured but there is no signed-in session. Sign-in is next for mobile; until then Ember is available in the web app.'}
                </AppText>
              </View>
            </Card>
          ) : null}

          {ember.aiOff ? null : ember.messages.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.intro}>
                <View style={[styles.introMark, { backgroundColor: theme.surface2 }]}>
                  <EmberMark size={30} />
                </View>
                <View style={styles.introCopy}>
                  <AppText variant="cardTitle">Ask about Singapore money matters</AppText>
                  <AppText variant="bodySmall" tone="ink2">Ember explains CPF, SRS, Savings Bonds and your own FireBuddy figures, and cites where each answer comes from. It never changes your records or gives regulated advice.</AppText>
                </View>
              </View>
              <AppText variant="overline" tone="ink2">Not sure where to start? Try a guided question</AppText>
              <View style={styles.starterGrid}>
                {ember.starters.map((starter) => (
                  <Pressable key={starter.title} accessibilityRole="button" accessibilityLabel={`Use question: ${starter.question}`} onPress={() => fill(starter.question)} style={[styles.starter, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                    {({ pressed }) => (
                      <>
                        <PressOverlay pressed={pressed} radius={radii.card} />
                        <AppText variant="bodySemibold">{starter.title}</AppText>
                        <AppText variant="caption" tone="ink2">{starter.description}</AppText>
                      </>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.messages}>
              {ember.messages.map((message) => <EmberBubble key={message.id} message={message} onRetry={ember.retry} />)}
              {!ember.busy && ember.followUps.length ? (
                <View style={styles.followUps}>
                  <AppText variant="caption" tone="ink2">You could also ask</AppText>
                  <View style={styles.followUpChips}>
                    {ember.followUps.map((starter) => (
                      <Pressable key={starter.title} accessibilityRole="button" onPress={() => fill(starter.question)} style={[styles.followUp, { borderColor: theme.lineStrong, backgroundColor: theme.surface }]}>
                        <AppText variant="captionMedium" tone="accentText">{starter.title}</AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.md), borderTopColor: theme.line, backgroundColor: theme.bg }]}>
          <View style={[styles.inputWell, { backgroundColor: theme.surface, borderColor: theme.lineStrong }]}>
            <TextInput
              ref={inputRef}
              accessibilityLabel="Your question for Ember"
              value={ember.draft}
              onChangeText={(text) => ember.setDraft(text.slice(0, MAX_EMBER_QUESTION_LENGTH))}
              placeholder={ember.aiOff ? 'Turn on Ember above to ask a question' : ember.availability.available ? 'Ask about CPF, SRS, savings or FIRE…' : 'Ember needs a signed-in account'}
              placeholderTextColor={theme.ink3}
              editable={!ember.aiOff && ember.availability.available}
              multiline
              maxLength={MAX_EMBER_QUESTION_LENGTH}
              returnKeyType="default"
              style={[styles.input, { color: theme.ink }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send question"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={() => void ember.send(ember.draft)}
              style={[styles.send, { backgroundColor: canSend ? theme.primary : theme.surface3 }]}
            >
              <ArrowUp size={20} color={canSend ? theme.onPrimary : theme.ink3} strokeWidth={2.4} />
            </Pressable>
          </View>
          <AppText variant="caption" tone="ink3" align="center">Educational guidance with sources, not regulated financial advice.</AppText>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        open={confirmClear}
        title="Clear this conversation?"
        message="The transcript on this phone is removed. Ember keeps no copy of it."
        confirmLabel="Clear"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => { ember.clear(); setConfirmClear(false); }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  transcript: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  consent: {
    gap: spacing.md,
  },
  consentOption: {
    padding: 14,
    borderRadius: radii.tile,
    gap: 6,
  },
  consentButton: {
    marginTop: spacing.xs,
  },
  consentFootnote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  consentFootnoteText: {
    flex: 1,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  empty: {
    gap: spacing.md,
  },
  intro: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  introMark: {
    width: 52,
    height: 52,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  starterGrid: {
    gap: spacing.sm,
  },
  starter: {
    padding: 14,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
    overflow: 'hidden',
  },
  messages: {
    gap: spacing.md,
  },
  followUps: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  followUpChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  followUp: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  composer: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  inputWell: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body.regular,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: 8,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
