import { useRouter } from 'expo-router';
import { Bell, Menu, Moon, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radii, spacing } from '@/constants/tokens';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme } from '@/lib/theme';

import { FireBuddyMark } from '../brand/BrandMarks';
import { IconButton } from '../ui/IconButton';
import { PressOverlay } from '../ui/PressOverlay';
import { AppText } from '../ui/Text';
import { MoreSheet } from './MoreSheet';

/**
 * The forest strip at the top of every tab screen. Its top padding is the status-bar inset, so
 * the brand row sits below the clock and the notch on both platforms while the forest colour
 * runs edge to edge behind them.
 */
export function AppTopbar() {
  const { theme, scheme, toggle } = useTheme();
  const { notify } = useFireBuddy();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <View style={[styles.bar, { backgroundColor: theme.railBg, borderBottomColor: theme.railLine, paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Pressable accessibilityRole="link" accessibilityLabel="FireBuddy home" onPress={() => router.navigate('/')} style={styles.brand}>
          <FireBuddyMark size={30} />
          <AppText variant="cardTitle" tone="rail" style={styles.brandName}>FireBuddy</AppText>
        </Pressable>
        <View style={styles.actions}>
          <IconButton
            icon={scheme === 'dark' ? Sun : Moon}
            tone="rail"
            iconSize={19}
            accessibilityLabel={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onPress={toggle}
          />
          <IconButton icon={Bell} tone="rail" iconSize={19} accessibilityLabel="Notifications" onPress={() => notify('Notifications are not available in the demo yet.')} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More"
            accessibilityState={{ expanded: moreOpen }}
            onPress={() => setMoreOpen(true)}
            style={[styles.more, { borderColor: theme.railLine }]}
          >
            {({ pressed }) => (
              <>
                <PressOverlay pressed={pressed} radius={radii.control} light />
                <Menu size={18} color={theme.railInk} strokeWidth={2} />
                <AppText variant="label" tone="rail">More</AppText>
              </>
            )}
          </Pressable>
        </View>
      </View>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
  },
  row: {
    height: layout.topbar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: layout.gutter,
    paddingRight: spacing.md,
    gap: spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: layout.touch,
  },
  brandName: {
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: layout.touchCompact,
    paddingHorizontal: 12,
    marginLeft: 4,
    borderWidth: 1,
    borderRadius: radii.control,
    overflow: 'hidden',
  },
});
