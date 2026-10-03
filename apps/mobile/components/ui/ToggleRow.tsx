import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AppText } from './Text';

export interface ToggleRowProps {
  label: string;
  help?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A form checkbox on a phone: label and one-line help on the left, a native switch on the right. */
export function ToggleRow({ label, help, value, onChange, disabled, style }: ToggleRowProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.row, { backgroundColor: theme.surface2 }, disabled ? styles.disabled : null, style]}
    >
      <View style={styles.copy}>
        <AppText variant="bodyMedium">{label}</AppText>
        {help ? <AppText variant="caption" tone="ink2">{help}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: theme.lineStrong, true: theme.accent }}
        thumbColor={theme.surface}
        ios_backgroundColor={theme.lineStrong}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.tile,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
