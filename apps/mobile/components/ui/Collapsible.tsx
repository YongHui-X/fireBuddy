import { ChevronDown } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { layout, radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { Card } from './Card';
import { PressOverlay } from './PressOverlay';
import { AppText } from './Text';

export interface CollapsibleProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** A card whose body is hidden behind its title row, the phone stand-in for a `<details>` element. */
export function Collapsible({ title, subtitle, defaultOpen = false, children }: CollapsibleProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card padded={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.header}
      >
        {({ pressed }) => (
          <>
            <PressOverlay pressed={pressed} radius={radii.card} />
            <View style={styles.copy}>
              <AppText variant="cardTitle">{title}</AppText>
              {subtitle ? <AppText variant="caption" tone="ink2">{subtitle}</AppText> : null}
            </View>
            <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
              <ChevronDown size={20} color={theme.ink3} strokeWidth={2} />
            </View>
          </>
        )}
      </Pressable>
      {open ? <View style={[styles.body, { borderTopColor: theme.line }]}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.touch + 8,
    paddingHorizontal: layout.cardPad,
    paddingVertical: spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: layout.cardPad,
    gap: spacing.md,
  },
});
