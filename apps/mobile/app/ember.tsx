import { useRouter } from 'expo-router';
import { ArrowUp, History, PlugZap, SquarePen } from 'lucide-react-native';
import { selectDoudouMessageId } from '@firebuddy/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Doudou } from '@/components/brand/Doudou';
import { DoudouConsentDialog } from '@/components/ember/DoudouConsent';
import { EmberBubble } from '@/components/ember/EmberBubble';
import { EmberHistorySheet } from '@/components/ember/EmberHistorySheet';
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
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { useAiPreference } from '@/lib/ai-preference';
import { MAX_EMBER_QUESTION_LENGTH } from '@/lib/ember-api';
import { useTheme } from '@/lib/theme';
import { useRegion } from '@/lib/user-profile';

/**
 * DouDou, the Singapore finance guide, as a phone chat: transcript above, composer pinned to the
 * keyboard. Starter cards fill the composer and nothing is sent until the person taps Send.
 * While DouDou is off the consent popup opens on arrival and nothing leaves the phone.
 * Answers come from the FastAPI RAG route over the anonymous session; see `lib/ember-session.ts`.
 */
export default function EmberScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useScreenInsets();
  const ember = useEmber();
  const consent = useAiPreference();
  const { isSingapore } = useRegion();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const keyboardInset = useKeyboardInset();
  // While DouDou is off the consent popup greets the person on arrival; "Not now" leaves the screen.
  const [consentOpen, setConsentOpen] = useState(true);
  const doudouMessageId = useMemo(
    () => selectDoudouMessageId(ember.messages, (message) => message.status === 'pending', (message) => message.status === 'error'),
    [ember.messages],
  );
  const canSend = !ember.aiOff && ember.availability.available && ember.draft.trim().length > 0 && !ember.busy;

  // Keep the newest turn in view as answers arrive.
  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [ember.messages]);

  // Fills the composer only; the keyboard stays down so the person can read it and tap Send.
  const fill = (question: string) => ember.setDraft(question);
  const deleting = ember.conversations.find((chat) => chat.id === deletingId);

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.transcript} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          <PageToolbar
            title="Ask DouDou"
            description={isSingapore ? 'Grounded answers on CPF, SRS, savings and FIRE, with sources.' : 'Answers on budgeting, saving and FIRE, with sources.'}
            onBack={() => router.back()}
            trailing={ember.aiOff ? undefined : (
              <View style={styles.toolbarActions}>
                {ember.conversations.length ? <IconButton icon={History} accessibilityLabel="Past chats" onPress={() => setHistoryOpen(true)} /> : null}
                {ember.messages.length ? <IconButton icon={SquarePen} accessibilityLabel="New chat" onPress={ember.newChat} /> : null}
              </View>
            )}
          />

          {ember.aiOff && consent.hydrated ? (
            <Card tone="muted" style={styles.notice}>
              <Doudou pose="sleep" size={56} />
              <View style={styles.noticeCopy}>
                <AppText variant="bodySemibold">DouDou is off</AppText>
                <AppText variant="bodySmall" tone="ink2">Nothing leaves this phone while DouDou is off.</AppText>
                <Button label="Turn on DouDou" variant="secondary" size="compact" onPress={() => setConsentOpen(true)} style={styles.noticeAction} />
              </View>
            </Card>
          ) : null}

          {!ember.aiOff && !ember.availability.available ? (
            <Card tone="muted" style={styles.notice}>
              <View style={[styles.noticeIcon, { backgroundColor: theme.surface }]}>
                <PlugZap size={20} color={theme.ink2} strokeWidth={1.9} />
              </View>
              <View style={styles.noticeCopy}>
                <AppText variant="bodySemibold">DouDou is not set up in this version</AppText>
                <AppText variant="bodySmall" tone="ink2">This build has no connection details for DouDou. Everything else in FireBuddy works as normal.</AppText>
              </View>
            </Card>
          ) : null}

          {ember.aiOff ? null : ember.messages.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.intro}>
                <Doudou pose="hello" size={80} motion="idle" />
                <View style={styles.introCopy}>
                  <AppText variant="cardTitle">Hi, I&apos;m DouDou!</AppText>
                  <AppText variant="bodySmall" tone="ink2">{isSingapore
                    ? 'I explain CPF, SRS, Savings Bonds and your own FireBuddy figures, and show where each answer comes from. I never change your records or give regulated advice.'
                    : 'I explain budgeting, saving, investing basics, FIRE and your own FireBuddy figures. My sources are Singapore-focused, so I keep advice general for you. I never change your records or give regulated advice.'}</AppText>
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
              {ember.messages.map((message) => <EmberBubble key={message.id} message={message} onRetry={ember.retry} showDoudou={message.id === doudouMessageId} />)}
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

        {/* Clear of the navigation bar when the keyboard is down; lifted above the keyboard when it is up. */}
        <View style={[styles.composer, { paddingBottom: keyboardInset > 0 ? keyboardInset + spacing.sm : insets.bottom + spacing.lg, borderTopColor: theme.line, backgroundColor: theme.bg }]}>
          <View style={[styles.inputWell, { backgroundColor: theme.surface, borderColor: theme.lineStrong }]}>
            <TextInput
              ref={inputRef}
              accessibilityLabel="Your question for DouDou"
              value={ember.draft}
              onChangeText={(text) => ember.setDraft(text.slice(0, MAX_EMBER_QUESTION_LENGTH))}
              placeholder={ember.aiOff ? 'Turn on DouDou above to ask a question' : ember.availability.available ? (isSingapore ? 'Ask about CPF, SRS, savings or FIRE…' : 'Ask about budgeting, saving or FIRE…') : 'DouDou is not set up in this version'}
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

      <DoudouConsentDialog
        open={ember.aiOff && consent.hydrated && consentOpen}
        onAccept={() => void consent.turnOn()}
        onDecline={() => {
          setConsentOpen(false);
          router.back();
        }}
        working={consent.status === 'working'}
        error={consent.error}
      />
      <EmberHistorySheet
        open={historyOpen}
        conversations={ember.conversations}
        activeId={ember.activeId}
        onClose={() => setHistoryOpen(false)}
        onOpen={(id) => { ember.openChat(id); setHistoryOpen(false); }}
        onNewChat={() => { ember.newChat(); setHistoryOpen(false); }}
        onDelete={setDeletingId}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this chat?"
        message={deleting ? `“${deleting.title}” is removed from this phone. DouDou keeps no copy of it.` : ''}
        confirmLabel="Delete"
        onCancel={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) ember.deleteChat(deletingId); setDeletingId(null); }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbarActions: {
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
  },
  transcript: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
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
  noticeAction: {
    marginTop: spacing.xs,
  },
  empty: {
    gap: spacing.md,
  },
  intro: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
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
