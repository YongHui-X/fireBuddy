import { Tabs, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeftRight, Grid2X2, Home, Plus, User, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radii } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { useTourTarget } from '../tour/TourProvider';
import { PressOverlay } from '../ui/PressOverlay';
import { AppText } from '../ui/Text';

type ExpoTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const tabIcons: Record<string, LucideIcon> = {
  index: Home,
  transactions: ArrowLeftRight,
  categories: Grid2X2,
  profile: User,
};

/** How far the docked Add button rises above the bar's top edge. */
const FAB_LIFT = 22;
/** Surface-coloured ring so the circle reads as cut into the bar edge without an SVG notch. */
const FAB_RING = 3;

/**
 * The phone shell's bottom bar: the four fixed tabs with a circular lime Add button docked in the
 * centre, half above the bar edge like a Material docked FAB. Painted in normal layout flow with
 * the bottom inset inside it, so the Android navigation bar and the iOS home indicator never cover
 * a tab and screens never scroll underneath.
 */
export function TabBar({ state, descriptors, navigation }: ExpoTabBarProps) {
  const { theme, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const addTarget = useTourTarget('add');
  const tabTargets: Record<string, ReturnType<typeof useTourTarget>> = {
    transactions: useTourTarget('transactions'),
    categories: useTourTarget('categories'),
    profile: useTourTarget('profile'),
  };

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
            {/* The tour circles just the icon and label, not the whole slot, which is wide on big screens. */}
            <View {...tabTargets[route.name]} style={styles.tabContent}>
              <Icon size={20} color={focused ? theme.accentText : theme.ink3} strokeWidth={focused ? 2.2 : 1.6} />
              <AppText variant="tabLabel" tone={focused ? 'accentText' : 'ink3'} numberOfLines={1}>
                {label}
              </AppText>
            </View>
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
            {...addTarget}
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            hitSlop={6}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              router.push('/add-transaction');
            }}
            style={({ pressed }) => [
              styles.fab,
              shadows.limeGlow,
              { backgroundColor: theme.primary, borderColor: theme.surface },
              pressed ? { transform: [{ translateY: 1 }] } : null,
            ]}
          >
            {({ pressed }) => (
              <>
                <PressOverlay pressed={pressed} radius={radii.addTile} />
                <Plus size={26} color={theme.onPrimary} strokeWidth={2.5} />
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
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: layout.tabBar,
    overflow: 'visible',
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
    overflow: 'hidden',
  },
  tabContent: {
    alignItems: 'center',
    gap: 4,
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
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  fab: {
    width: layout.addTile.size + FAB_RING * 2,
    height: layout.addTile.size + FAB_RING * 2,
    borderRadius: radii.addTile + FAB_RING,
    borderWidth: FAB_RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -FAB_LIFT,
    overflow: 'visible',
  },
});
