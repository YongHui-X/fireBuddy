import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeftRight, Grid2X2, Home, Plus, User, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radii } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { PressOverlay } from '../ui/PressOverlay';
import { AppText } from '../ui/Text';

const tabIcons: Record<string, LucideIcon> = {
  index: Home,
  transactions: ArrowLeftRight,
  categories: Grid2X2,
  profile: User,
};

/**
 * The phone shell's bottom bar: the four fixed tabs with the lime Add tile centred between them.
 * Painted in normal layout flow with the bottom inset inside it, so the Android navigation bar
 * and the iOS home indicator never cover a tab and screens never scroll underneath.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const renderTab = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    if (!route) return null;
    const { options } = descriptors[route.key];
    const focused = state.index === routeIndex;
    const label = typeof options.title === 'string' ? options.title : route.name;
    const Icon = tabIcons[route.name] ?? Home;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        Haptics.selectionAsync().catch(() => undefined);
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
        onPress={onPress}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={styles.tab}
      >
        {({ pressed }) => (
          <>
            <PressOverlay pressed={pressed} />
            {focused ? <View style={[styles.indicator, { backgroundColor: theme.accentText }]} /> : null}
            <Icon size={20} color={focused ? theme.accentText : theme.ink3} strokeWidth={focused ? 2.2 : 1.6} />
            <AppText variant="tabLabel" tone={focused ? 'accentText' : 'ink3'} numberOfLines={1}>
              {label}
            </AppText>
          </>
        )}
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, shadows.barUp, { backgroundColor: theme.surface, borderTopColor: theme.line, paddingBottom: insets.bottom }]}
    >
      <View style={styles.row}>
        <View style={styles.group}>{[0, 1].map(renderTab)}</View>
        <View style={styles.addSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              router.push('/add-transaction');
            }}
            style={({ pressed }) => [
              styles.addTile,
              shadows.limeGlow,
              { backgroundColor: theme.primary },
              pressed ? { transform: [{ translateY: 1 }] } : null,
            ]}
          >
            {({ pressed }) => (
              <>
                <PressOverlay pressed={pressed} radius={radii.addTile} />
                <Plus size={22} color={theme.onPrimary} strokeWidth={2.4} />
                <AppText variant="tabLabel" tone="onPrimary">Add</AppText>
              </>
            )}
          </Pressable>
        </View>
        <View style={styles.group}>{[2, 3].map(renderTab)}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: layout.tabBar,
  },
  group: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    minHeight: layout.touch,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderBottomLeftRadius: radii.chip,
    borderBottomRightRadius: radii.chip,
  },
  addSlot: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: layout.addTile.width,
    height: layout.addTile.height,
    borderRadius: radii.addTile,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    marginTop: -14,
    overflow: 'visible',
  },
});
