import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { PressOverlay } from './PressOverlay';
import { AppText } from './Text';

export interface SettingRowProps {
  icon?: LucideIcon;
  /** A custom leading element instead of the icon tile. */
  leading?: ReactNode;
  label: string;
  detail?: string;
  /** Right-hand state text ("Manage", "On"). */
  value?: string;
  /** Renders in place of `value`, e.g. a segmented control. */
  trailing?: ReactNode;
  chevron?: boolean;
  tone?: 'default' | 'danger';
  onPress?: () => void;
  first?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Profile and More rows: icon tile, label, and a trailing state or chevron, 56px tall with hairline dividers. */
export function SettingRow({ icon: Icon, leading, label, detail, value, trailing, chevron, tone = 'default', onPress, first = false, style }: SettingRowProps) {
  const { theme } = useTheme();
  const ink = tone === 'danger' ? theme.danger : theme.ink;
  const interactive = Boolean(onPress);
  const divider = !first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null;

  const body = (pressed: boolean) => (
    <>
      <PressOverlay pressed={pressed && interactive} />
      {leading ?? (Icon ? (
        <View style={[styles.iconTile, { backgroundColor: tone === 'danger' ? theme.expenseSoft : theme.surface2 }]}>
          <Icon size={19} color={tone === 'danger' ? theme.danger : theme.ink2} strokeWidth={1.9} />
        </View>
      ) : null)}
      <View style={styles.copy}>
        <AppText variant="bodySemibold" style={{ color: ink }} numberOfLines={1}>{label}</AppText>
        {detail ? <AppText variant="caption" tone="ink2" numberOfLines={2}>{detail}</AppText> : null}
      </View>
      {trailing ?? (value ? <AppText variant="captionMedium" tone="ink2">{value}</AppText> : null)}
      {chevron ? <ChevronRight size={18} color={theme.ink3} strokeWidth={2} /> : null}
    </>
  );

  // A static row is a plain View so no press or focus state can ever tint it.
  if (!interactive) {
    return <View style={[styles.row, divider, style]}>{body(false)}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, divider, style]}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
