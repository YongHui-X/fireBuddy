import { ChevronDown, type LucideIcon } from 'lucide-react-native';
import { forwardRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { fonts, layout, radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { PressOverlay } from './PressOverlay';
import { AppText } from './Text';

interface FieldFrameProps {
  label?: string;
  optional?: boolean;
  help?: string;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Label above, control, then help or error copy beneath. */
export function FieldFrame({ label, optional, help, error, style, children }: FieldFrameProps) {
  return (
    <View style={[styles.frame, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <AppText variant="label">{label}</AppText>
          {optional ? <AppText variant="caption" tone="ink3">optional</AppText> : null}
        </View>
      ) : null}
      {children}
      {error ? <AppText variant="caption" tone="danger">{error}</AppText> : help ? <AppText variant="caption" tone="ink2">{help}</AppText> : null}
    </View>
  );
}

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  optional?: boolean;
  help?: string;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}

/** Standard 48px text input with the 16px font that keeps iOS from zooming on focus. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, optional, help, error, style, ...rest }, ref) {
  const { theme } = useTheme();
  return (
    <FieldFrame label={label} optional={optional} help={help} error={error} style={style}>
      <TextInput
        ref={ref}
        {...rest}
        // The visible label is a sibling view, so name the input explicitly for screen readers.
        accessibilityLabel={rest.accessibilityLabel ?? label}
        accessibilityHint={rest.accessibilityHint ?? (error ?? help ?? undefined)}
        placeholderTextColor={theme.ink3}
        style={[
          styles.input,
          { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.lineStrong, color: theme.ink },
          rest.multiline ? styles.multiline : null,
        ]}
      />
    </FieldFrame>
  );
});

export interface SelectFieldProps {
  label?: string;
  optional?: boolean;
  help?: string;
  error?: string | null;
  value: string;
  placeholder?: string;
  icon?: LucideIcon;
  leading?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** A field-shaped button that opens a picker sheet; native selects have no place in this design. */
export function SelectField({ label, optional, help, error, value, placeholder = 'Choose…', icon: Icon, leading, onPress, accessibilityLabel, style }: SelectFieldProps) {
  const { theme } = useTheme();
  return (
    <FieldFrame label={label} optional={optional} help={help} error={error} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityValue={{ text: value || placeholder }}
        onPress={onPress}
        style={[styles.input, styles.select, { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.lineStrong }]}
      >
        {({ pressed }) => (
          <>
            <PressOverlay pressed={pressed} radius={radii.control} />
            {leading ?? (Icon ? <Icon size={18} color={theme.ink2} strokeWidth={1.9} /> : null)}
            <AppText variant="body" tone={value ? 'ink' : 'ink3'} numberOfLines={1} style={styles.selectValue}>
              {value || placeholder}
            </AppText>
            <ChevronDown size={18} color={theme.ink3} strokeWidth={2} />
          </>
        )}
      </Pressable>
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  frame: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  input: {
    minHeight: layout.touch,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.control,
    borderWidth: 1,
    fontFamily: fonts.body.regular,
    fontSize: 16,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  selectValue: {
    flex: 1,
    minWidth: 0,
  },
});
