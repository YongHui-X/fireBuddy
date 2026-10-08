import { Moon, Sun } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/lib/theme';

import { IconButton } from '../ui/IconButton';

/**
 * The quick action that used to sit on the forest topbar, now on the greeting row of the forest
 * hero on Home: the theme toggle. DouDou lives in the shortcut row below, so the greeting keeps
 * the width. A compact target so it fits beside the title.
 */
export function HomeActions() {
  const { scheme, toggle } = useTheme();

  return (
    <View style={styles.row}>
      <IconButton
        icon={scheme === 'dark' ? Sun : Moon}
        tone="hero"
        size="compact"
        iconSize={19}
        accessibilityLabel={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        onPress={toggle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // The toolbar offsets trailing controls for 48px buttons; these are 44px, so nudge back
    // until the icons centre on the title line.
    marginTop: 2,
  },
});
