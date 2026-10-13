import { avoidOrphan } from '@firebuddy/shared';
import { Platform, Text, type TextProps } from 'react-native';

import { type, type Theme } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

export type TextVariant = keyof typeof type;
export type TextTone =
  | 'ink'
  | 'ink2'
  | 'ink3'
  | 'hero'
  | 'heroMuted'
  | 'rail'
  | 'railMuted'
  | 'income'
  | 'expense'
  | 'accentText'
  | 'danger'
  | 'warning'
  | 'onPrimary'
  | 'inherit';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
}

function toneColor(theme: Theme, tone: TextTone) {
  switch (tone) {
    case 'ink2': return theme.ink2;
    case 'ink3': return theme.ink3;
    case 'hero': return theme.heroInk;
    case 'heroMuted': return theme.heroInkMuted;
    case 'rail': return theme.railInk;
    case 'railMuted': return theme.railInkMuted;
    case 'income': return theme.income;
    case 'expense': return theme.expense;
    case 'accentText': return theme.accentText;
    case 'danger': return theme.danger;
    case 'warning': return theme.warning;
    case 'onPrimary': return theme.onPrimary;
    case 'inherit': return undefined;
    default: return theme.ink;
  }
}

/**
 * Every piece of text goes through here so the exact font family is always set (Android cannot fake
 * weights). Wrapping text never leaves one word alone on its last line (owner, 10 Oct 2026): plain
 * string children keep their last two words together, and the platform's balanced line breaking
 * evens out the lines. One-line text is left as it is.
 */
export function AppText({ variant = 'body', tone = 'ink', align, style, children, ...rest }: AppTextProps) {
  const { theme } = useTheme();
  const color = toneColor(theme, tone);
  const wraps = rest.numberOfLines !== 1;
  return (
    <Text
      textBreakStrategy={wraps && Platform.OS === 'android' ? 'balanced' : undefined}
      lineBreakStrategyIOS={wraps && Platform.OS === 'ios' ? 'push-out' : undefined}
      {...rest}
      style={[type[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
    >
      {wraps && typeof children === 'string' ? avoidOrphan(children) : children}
    </Text>
  );
}
