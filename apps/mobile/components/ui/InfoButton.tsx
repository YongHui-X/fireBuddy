import { Info } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { Button } from './Button';
import { Dialog } from './Dialog';
import { PressOverlay } from './PressOverlay';
import { AppText } from './Text';

export interface InfoButtonProps {
  /** Heading of the popup, usually the card or field it explains. */
  title: string;
  /** One paragraph per string. */
  body: string | readonly string[];
  /** `hero` for use inside a navy band. */
  tone?: 'ink' | 'hero';
}

/**
 * A small (i) beside a heading that opens its explanation in a popup, so information-heavy
 * screens keep their long descriptions one tap away instead of on screen (PRD 6.6.1). Warnings
 * and anything the person must act on never go behind it.
 */
export function InfoButton({ title, body, tone = 'ink' }: InfoButtonProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const paragraphs = typeof body === 'string' ? [body] : body;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`About ${title}`} hitSlop={{ top: 12, bottom: 4, left: 12, right: 12 }} onPress={() => setOpen(true)} style={styles.button}>
        {({ pressed }) => (
          <>
            <PressOverlay pressed={pressed} radius={radii.pill} />
            <Info size={16} color={tone === 'hero' ? theme.heroInkMuted : theme.ink3} strokeWidth={2.2} />
          </>
        )}
      </Pressable>
      <Dialog open={open} onClose={() => setOpen(false)} footer={<Button label="Got it" block onPress={() => setOpen(false)} />}>
        <View style={styles.body}>
          <AppText variant="cardTitle">{title}</AppText>
          {paragraphs.map((text) => <AppText key={text} variant="body" tone="ink2">{text}</AppText>)}
        </View>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  body: {
    gap: spacing.md,
  },
});
