import type { Category } from '@firebuddy/shared';
import { createElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, tint } from '@/constants/tokens';
import { getCategoryIcon } from '@/lib/category-icons';
import { useTheme } from '@/lib/theme';

export interface CategoryAvatarProps {
  category?: Pick<Category, 'icon' | 'color'> | null;
  /** 21 for ledger rows, 30 for category cards, as on the web. */
  size?: 'row' | 'card' | 'sheet';
  style?: StyleProp<ViewStyle>;
}

const dims = {
  row: { box: 38, icon: 19 },
  card: { box: 52, icon: 28 },
  sheet: { box: 44, icon: 22 },
} as const;

/** Category icon on a tile tinted with the category colour. Unknown categories get the forest tint. */
export function CategoryAvatar({ category, size = 'row', style }: CategoryAvatarProps) {
  const { theme } = useTheme();
  const color = category?.color ?? theme.accent;
  const { box, icon } = dims[size];
  return (
    <View style={[styles.tile, { width: box, height: box, borderRadius: size === 'row' ? radii.pill : radii.tile, backgroundColor: tint(color, 0.16) }, style]}>
      {/* The glyph is a fixed module-level lucide component looked up by id, never one created here. */}
      {createElement(getCategoryIcon(category), { size: icon, color, strokeWidth: 1.9 })}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
