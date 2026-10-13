import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { layout, radii } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AppText } from './Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  /** `hero` for a switcher inside a navy hero: a translucent track and light unselected labels. */
  tone?: 'canvas' | 'hero';
  style?: StyleProp<ViewStyle>;
}

/**
 * The Expense | Income toggle and its siblings: a muted track whose selected segment is solid gold
 * with black text (gold means selected, DESIGN.md Gold Standard).
 */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, tone = 'canvas', style }: SegmentedControlProps<T>) {
  const { theme } = useTheme();
  const hero = tone === 'hero';
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={[styles.track, { backgroundColor: hero ? theme.heroChipBg : theme.surface2 }, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync().catch(() => undefined);
              onChange(option.value);
            }}
            style={[styles.segment, selected ? [styles.selected, { backgroundColor: theme.primary }] : null]}
          >
            <AppText variant="label" style={{ color: selected ? theme.onPrimary : hero ? theme.heroChipInk : theme.ink2 }}>{option.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.control,
    minHeight: layout.touchCompact,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control - 2,
    paddingHorizontal: 8,
  },
  selected: {
    elevation: 1,
  },
});
