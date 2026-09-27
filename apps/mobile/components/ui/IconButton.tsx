import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { layout, radii } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { PressOverlay } from './PressOverlay';

export interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  icon: LucideIcon;
  /** Required: icon buttons carry no visible text. */
  accessibilityLabel: string;
  /** `rail` sits on the forest topbar; `quiet` on the canvas; `bordered` gets the outlined 38px square. */
  tone?: 'quiet' | 'rail' | 'bordered' | 'hero';
  size?: 'default' | 'compact';
  iconSize?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** A 48px hit target (44 compact) around a 38px visual square. */
export function IconButton({ icon: Icon, tone = 'quiet', size = 'default', iconSize = 20, color, style, disabled, ...rest }: IconButtonProps) {
  const { theme } = useTheme();
  const target = size === 'compact' ? layout.touchCompact : layout.touch;
  const iconColor = color ?? (tone === 'rail' ? theme.railInkMuted : tone === 'hero' ? theme.heroInk : theme.ink2);
  const light = tone === 'rail' || tone === 'hero';

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={4}
      style={[styles.target, { width: target, height: target }, disabled ? styles.disabled : null, style]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.square,
            tone === 'bordered' ? { borderWidth: 1, borderColor: theme.lineStrong, backgroundColor: theme.surface } : null,
          ]}
        >
          <PressOverlay pressed={pressed && !disabled} radius={radii.control} light={light} />
          <Icon size={iconSize} color={iconColor} strokeWidth={1.9} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: {
    width: 38,
    height: 38,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.45,
  },
});
