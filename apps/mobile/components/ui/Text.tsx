import { Text, type TextProps } from 'react-native';

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

/** Every piece of text goes through here so the exact font family is always set (Android cannot fake weights). */
export function AppText({ variant = 'body', tone = 'ink', align, style, ...rest }: AppTextProps) {
  const { theme } = useTheme();
  const color = toneColor(theme, tone);
  return (
    <Text
      {...rest}
      style={[type[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
    />
  );
}
