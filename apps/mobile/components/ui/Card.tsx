import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { layout, radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AppText } from './Text';

export interface CardProps extends ViewProps {
  /** `hero` paints the forest region used for the net worth headline. */
  tone?: 'paper' | 'hero' | 'muted';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** White paper card with one soft shadow, radius 16, the same container the web uses for every panel. */
export function Card({ tone = 'paper', padded = true, style, children, ...rest }: CardProps) {
  const { theme, shadows } = useTheme();
  const background = tone === 'hero' ? theme.heroBg : tone === 'muted' ? theme.surface2 : theme.surface;
  return (
    <View
      {...rest}
      style={[
        styles.card,
        shadows.card,
        { backgroundColor: background, borderColor: tone === 'hero' ? theme.heroLine : theme.line },
        tone === 'muted' ? styles.flat : null,
        padded ? styles.padded : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Title row with an optional secondary subtitle and a trailing action, matching `.section-title-row`. */
export function CardHeader({ title, subtitle, action, style }: CardHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerCopy}>
        <AppText variant="cardTitle">{title}</AppText>
        {subtitle ? <AppText variant="caption" tone="ink2" style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flat: {
    shadowOpacity: 0,
    elevation: 0,
  },
  padded: {
    padding: layout.cardPad,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerAction: {
    flexShrink: 0,
    marginTop: -6,
    marginRight: -6,
  },
  subtitle: {
    marginTop: 3,
  },
});
