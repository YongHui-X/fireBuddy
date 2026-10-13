import type { DoudouPose } from '@firebuddy/shared';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { Doudou } from '../brand/Doudou';
import { Button } from './Button';
import { AppText } from './Text';

export interface EmptyStateProps {
  icon?: LucideIcon;
  /** Show DouDou in this pose instead of the icon. Use on at most one empty state per screen. */
  doudou?: DoudouPose;
  title: string;
  message?: string;
  /** A short bold line under the title, for something the person should not miss. */
  note?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Centred prompt for an empty card or route, with one secondary action. */
export function EmptyState({ icon: Icon, doudou, title, message, note, actionLabel, onAction, style }: EmptyStateProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      {doudou ? <Doudou pose={doudou} size={88} style={styles.doudou} /> : Icon ? (
        <View style={[styles.iconTile, { backgroundColor: theme.surface2 }]}>
          <Icon size={22} color={theme.ink2} strokeWidth={1.8} />
        </View>
      ) : null}
      <AppText variant="cardTitle" align="center">{title}</AppText>
      {note ? <AppText variant="label" align="center" style={styles.message}>{note}</AppText> : null}
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
  doudou: {
    marginBottom: spacing.xs,
  },
  message: {
    maxWidth: 300,
  },
  // Button sets alignSelf: 'flex-start' by default, which beats the column's centring.
  action: {
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
});
