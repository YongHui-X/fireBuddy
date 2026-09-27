import { Search, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { fonts, layout, radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

export interface SearchFieldProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

/** Ledger search: leading glyph, 48px field, a clear button once there is text. */
export function SearchField({ value, onChangeText, placeholder = 'Search transactions…', style, ...rest }: SearchFieldProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.lineStrong }, style]}>
      <Search size={18} color={theme.ink3} strokeWidth={2} />
      <TextInput
        {...rest}
        accessibilityLabel={rest.accessibilityLabel ?? 'Search transactions'}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.ink3}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="never"
        style={[styles.input, { color: theme.ink }]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => onChangeText('')} style={styles.clear}>
          <X size={16} color={theme.ink2} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.touch,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: radii.control,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: layout.touch - 2,
    fontFamily: fonts.body.regular,
    fontSize: 16,
    paddingVertical: 0,
  },
  clear: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
