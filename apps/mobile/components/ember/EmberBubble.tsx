import { SNAPSHOT_SECTION_LABELS, type SnapshotSection } from '@firebuddy/shared';
import { ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { radii, spacing } from '@/constants/tokens';
import type { EmberMessage } from '@/hooks/use-ember';
import { useTheme } from '@/lib/theme';

import { DoudouMark } from '../brand/BrandMarks';
import { Doudou } from '../brand/Doudou';
import { Button } from '../ui/Button';
import { AppText } from '../ui/Text';

/**
 * One transcript turn. Questions sit right in forest; answers sit left on paper with their sources beneath.
 * `showDoudou` lets this turn carry the screen's one full DouDou while it thinks or after it fails.
 */
export function EmberBubble({ message, onRetry, showDoudou = false }: { message: EmberMessage; onRetry?: (id: string) => void; showDoudou?: boolean }) {
  const { theme } = useTheme();
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={[styles.bubble, styles.userBubble, { backgroundColor: theme.heroBg }]}>
          <AppText variant="body" tone="hero">{message.content}</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <View style={[styles.avatar, { backgroundColor: theme.surface2 }]}>
        <DoudouMark size={24} />
      </View>
      <View style={styles.assistantColumn}>
        <View style={[styles.bubble, styles.assistantBubble, message.status === 'pending' && styles.pendingBubble, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          {message.status === 'pending' ? <Thinking showDoudou={showDoudou} statusText={message.statusText} /> : null}
          {message.status === 'streaming' ? (
            <AppText variant="body">
              {message.content}
              <BlinkingCaret />
            </AppText>
          ) : null}
          {message.status === 'error' ? (
            <View style={styles.errorBody}>
              {showDoudou ? <Doudou pose="oops" size={52} /> : null}
              <AppText variant="body" tone="danger">{message.error ?? 'DouDou could not answer.'}</AppText>
              {message.retryable && onRetry ? <Button label="Try again" icon={RefreshCw} variant="secondary" size="compact" onPress={() => onRetry(message.id)} /> : null}
            </View>
          ) : null}
          {message.status === 'done' ? <AppText variant="body" selectable>{message.content}</AppText> : null}
        </View>
        {message.status === 'done' && message.usedSections ? (
          <View style={styles.shared}>
            <ShieldCheck size={13} color={theme.ink3} strokeWidth={2} />
            <AppText variant="caption" tone="ink3" style={styles.sharedText}>{sharedNote(message.usedSections)}</AppText>
          </View>
        ) : null}
        {message.status === 'done' && message.sources?.length ? (
          <View style={styles.sources}>
            <AppText variant="overline" tone="ink2">Sources</AppText>
            {message.sources.map((source, index) => {
              const label = source.title ?? source.path ?? source.url ?? `Source ${index + 1}`;
              const open = source.url ? () => Linking.openURL(source.url as string).catch(() => undefined) : undefined;
              return (
                <Pressable key={`${label}-${index}`} accessibilityRole={open ? 'link' : undefined} disabled={!open} onPress={open} style={styles.sourceRow}>
                  <AppText variant="caption" tone={open ? 'accentText' : 'ink2'} numberOfLines={2} style={styles.sourceText}>{label}</AppText>
                  {open ? <ExternalLink size={13} color={theme.accentText} strokeWidth={2} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Plain words for what left the phone with this question. */
function sharedNote(sections: readonly SnapshotSection[]) {
  if (sections.length === 0) return 'No personal figures were shared.';
  const labels = sections.map((section) => SNAPSHOT_SECTION_LABELS[section]);
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  return `Used your ${list}, as rough figures only.`;
}

/**
 * DouDou swaying while an answer is on its way, with what it is doing right now ("Searching
 * sources") and three bouncing dots, or just the words when another turn holds DouDou.
 */
function Thinking({ showDoudou, statusText }: { showDoudou: boolean; statusText?: string }) {
  const label = statusText ?? 'Thinking';
  return (
    <View style={styles.thinking} accessible accessibilityLabel={`DouDou: ${label}`} accessibilityLiveRegion="polite">
      {showDoudou ? <Doudou pose="think" size={56} motion="think" /> : null}
      <View style={styles.thinkingLine}>
        <AppText variant="bodySmall" tone="ink2" style={styles.thinkingLabel}>{label}</AppText>
        <TypingDots />
      </View>
    </View>
  );
}

/** Three dots that rise and fall in turn. Reanimated stops them when the phone asks for reduced motion. */
function TypingDots() {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((index) => <Dot key={index} delay={index * 140} />)}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const { theme } = useTheme();
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withDelay(delay, withRepeat(withSequence(withTiming(-3, { duration: 260 }), withTiming(0, { duration: 260 }), withTiming(0, { duration: 320 })), -1));
  }, [delay, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }], opacity: 0.5 + (-lift.value / 6) }));
  return <Animated.View style={[styles.dot, { backgroundColor: theme.ink2 }, style]} />;
}

/** A soft blinking block at the end of text that is still arriving. */
function BlinkingCaret() {
  const { theme } = useTheme();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.15, { duration: 420 }), withTiming(1, { duration: 420 })), -1);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.Text style={[{ color: theme.accentText }, style]}> ▍</Animated.Text>;
}

const styles = StyleSheet.create({
  thinkingLine: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  thinkingLabel: {
    flexShrink: 1,
  },
  // Tall enough for the 3px bounce, so the dots never rise past the box.
  dots: {
    height: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    paddingBottom: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  shared: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sharedText: {
    flex: 1,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingLeft: 48,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingRight: 28,
  },
  assistantColumn: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.card,
  },
  userBubble: {
    borderBottomRightRadius: 6,
    maxWidth: '100%',
  },
  assistantBubble: {
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 6,
    alignSelf: 'stretch',
  },
  pendingBubble: {
    paddingVertical: 12,
  },
  errorBody: {
    gap: spacing.sm,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  sources: {
    gap: 4,
    alignSelf: 'stretch',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
  },
  sourceText: {
    flexShrink: 1,
  },
});
