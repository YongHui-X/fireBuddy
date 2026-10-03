import { ExternalLink, RefreshCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import type { EmberMessage } from '@/hooks/use-ember';
import { useTheme } from '@/lib/theme';

import { EmberMark } from '../brand/BrandMarks';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { AppText } from '../ui/Text';

const modeLabels = {
  knowledge: 'From Singapore finance sources',
  data: 'Calculated from your FireBuddy data',
  hybrid: 'Your data plus Singapore finance sources',
  clarification: 'Ember needs more detail',
  unsupported: 'Outside what Ember covers',
} as const;

/** One transcript turn. Questions sit right in forest; answers sit left on paper with their sources beneath. */
export function EmberBubble({ message, onRetry }: { message: EmberMessage; onRetry?: (id: string) => void }) {
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
        <EmberMark size={18} />
      </View>
      <View style={styles.assistantColumn}>
        <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          {message.status === 'pending' ? <Thinking /> : null}
          {message.status === 'error' ? (
            <View style={styles.errorBody}>
              <AppText variant="body" tone="danger">{message.error ?? 'Ember could not answer.'}</AppText>
              {message.retryable && onRetry ? <Button label="Try again" icon={RefreshCw} variant="secondary" size="compact" onPress={() => onRetry(message.id)} /> : null}
            </View>
          ) : null}
          {message.status === 'done' ? <AppText variant="body" selectable>{message.content}</AppText> : null}
        </View>
        {message.status === 'done' && message.mode ? <Chip label={modeLabels[message.mode]} tone={message.mode === 'knowledge' ? 'info' : 'accent'} /> : null}
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

/** Three pulsing dots while an answer is on its way. */
function Thinking() {
  const { theme } = useTheme();
  // Created once; held in state rather than a ref so render never reads `.current`.
  const [pulse] = useState(() => new Animated.Value(0.3));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.3, duration: 500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.thinking} accessibilityLabel="Ember is thinking" accessibilityLiveRegion="polite">
      {[0, 1, 2].map((index) => <Animated.View key={index} style={[styles.dot, { backgroundColor: theme.ink3, opacity: pulse, transform: [{ scale: pulse }] }]} />)}
    </View>
  );
}

const styles = StyleSheet.create({
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
  errorBody: {
    gap: spacing.sm,
  },
  thinking: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
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
