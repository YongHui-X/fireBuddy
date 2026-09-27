import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { layout, radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { PressOverlay } from './PressOverlay';
import { AppText } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'text';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: 'default' | 'compact';
  icon?: LucideIcon;
  /** Stretch to the container width; allowed on phones, avoided on desktop. */
  block?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The four web button roles. `primary` is the lime fill and stays reserved for one action per
 * screen; the tab bar's Add tile owns it on the four tab screens (the One Lime Rule).
 */
export function Button({ label, variant = 'secondary', size = 'default', icon: Icon, block = false, loading = false, style, disabled, onPress, ...rest }: ButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const fill = variant === 'primary' ? theme.primary : variant === 'danger' ? theme.dangerFill : 'transparent';
  const inkColor = variant === 'primary' ? theme.onPrimary : variant === 'danger' ? theme.onDanger : variant === 'text' ? theme.accentText : theme.ink;
  const border = variant === 'secondary' ? theme.lineStrong : 'transparent';
  const minHeight = size === 'compact' ? layout.touchCompact : layout.touch;

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={(event) => {
        if (variant === 'primary') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        { minHeight, backgroundColor: fill, borderColor: border },
        variant === 'text' ? styles.text : null,
        block ? styles.block : null,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled && variant !== 'primary' ? { transform: [{ translateY: 1 }] } : null,
        style,
      ]}
    >
      {({ pressed }) => (
        <View style={styles.content}>
          <PressOverlay pressed={pressed && !isDisabled} radius={radii.control} />
          {Icon ? <Icon size={size === 'compact' ? 15 : 17} color={inkColor} strokeWidth={2} /> : null}
          <AppText variant={size === 'compact' ? 'buttonCompact' : 'button'} style={{ color: inkColor }}>
            {loading ? `${label}…` : label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.control,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  text: {
    paddingHorizontal: spacing.sm,
    borderWidth: 0,
  },
  block: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});
