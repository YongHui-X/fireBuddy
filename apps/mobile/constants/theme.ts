import { Platform } from 'react-native';

export const FirebuddyPalette = {
  background: '#F5F8F4',
  shell: '#FFFFFF',
  accent: '#3C8A61',
  accentDeep: '#25543D',
  accentSoft: '#67B47C',
  text: '#1F3D2E',
  muted: '#6B8577',
  border: '#D7E3D8',
  gold: '#E5B24A',
  paper: '#D8D3C8',
  danger: '#B24949',
};

export const Colors = {
  light: {
    text: FirebuddyPalette.text,
    background: FirebuddyPalette.background,
    tint: FirebuddyPalette.accent,
    icon: FirebuddyPalette.muted,
    tabIconDefault: FirebuddyPalette.muted,
    tabIconSelected: FirebuddyPalette.accent,
  },
  dark: {
    text: FirebuddyPalette.text,
    background: FirebuddyPalette.background,
    tint: FirebuddyPalette.accent,
    icon: FirebuddyPalette.muted,
    tabIconDefault: FirebuddyPalette.muted,
    tabIconSelected: FirebuddyPalette.accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
