import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/lib/theme';

/**
 * The press acknowledgement from the web mobile layer: an 8% ink wash over whatever background
 * the control already has. Render inside a Pressable's children when `pressed` is true.
 */
export function PressOverlay({ pressed, radius = 0, light = false }: { pressed: boolean; radius?: number; light?: boolean }) {
  const { theme } = useTheme();
  if (!pressed) return null;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: light ? 'rgba(255, 255, 255, 0.1)' : theme.pressOverlay }]}
    />
  );
}
