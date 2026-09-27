import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { Button } from './Button';
import { AppText } from './Text';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Centred prompt for an empty card or route, with one secondary action. */
export function EmptyState({ icon: Icon, title, message, actionLabel, onAction, style }: EmptyStateProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      {Icon ? (
        <View style={[styles.iconTile, { backgroundColor: theme.surface2 }]}>
          <Icon size={22} color={theme.ink2} strokeWidth={1.8} />
        </View>
      ) : null}
      <AppText variant="cardTitle" align="center">{title}</AppText>
      {message ? <AppText variant="bodySmall" tone="ink2" align="center" style={styles.message}>{message}</AppText> : null}
      {actionLabel && onAction ? <Button label={actionLabel} variant="secondary" onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    maxWidth: 300,
  },
  action: {
    marginTop: spacing.sm,
  },
});
