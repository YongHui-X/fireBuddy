import { useRouter } from 'expo-router';
import { Bell, Moon, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { layout, radii } from '@/constants/tokens';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme } from '@/lib/theme';

import { EmberMark } from '../brand/BrandMarks';
import { IconButton } from '../ui/IconButton';
import { PressOverlay } from '../ui/PressOverlay';

/**
 * The quick actions that used to sit on the forest topbar, now on the greeting row of the forest
 * hero on Home: theme, notifications and Ask Ember. Compact targets so they fit beside the title.
 */
export function HomeActions() {
  const { theme, scheme, toggle } = useTheme();
  const { notify } = useFireBuddy();
  const router = useRouter();

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
      <IconButton icon={Bell} tone="hero" size="compact" iconSize={19} accessibilityLabel="Notifications" onPress={() => notify('Notifications are coming soon.')} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask Ember"
        hitSlop={4}
        onPress={() => router.push('/ember')}
        style={styles.ember}
      >
        {({ pressed }) => (
          <View style={styles.emberSquare}>
            <PressOverlay pressed={pressed} radius={radii.control} light />
            <EmberMark size={22} color={theme.heroInk} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // The toolbar offsets trailing controls for 48px buttons; these are 44px with a 38px
    // square inside, so nudge back until the icons centre on the title line and the last
    // square sits flush with the gutter.
    marginTop: 2,
    marginRight: 9,
  },
  ember: {
    width: layout.touchCompact,
    height: layout.touchCompact,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emberSquare: {
    width: 38,
    height: 38,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
