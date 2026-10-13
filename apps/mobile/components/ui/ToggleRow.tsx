import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { InfoButton } from './InfoButton';
import { AppText } from './Text';

export interface ToggleRowProps {
  label: string;
  help?: string;
  /** Opens a tooltip beside the label instead of a line of help text. */
  info?: string | readonly string[];
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A form checkbox on a phone: label and one-line help on the left, a native switch on the right. */
export function ToggleRow({ label, help, info, value, onChange, disabled, style }: ToggleRowProps) {
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
        <View style={styles.labelRow}>
          <AppText variant="bodyMedium" style={styles.label}>{label}</AppText>
          {info ? <InfoButton title={label} body={info} /> : null}
        </View>
        {help ? <AppText variant="caption" tone="ink2">{help}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: theme.lineStrong, true: theme.primary }}
        thumbColor="#ffffff"
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    flexShrink: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});
