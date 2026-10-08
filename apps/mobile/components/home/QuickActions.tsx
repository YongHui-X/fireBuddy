import { useRouter } from 'expo-router';
import { ChartPie, Landmark, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { AscentMark, DoudouMark } from '../brand/BrandMarks';
import { useTourTarget } from '../tour/TourProvider';
import { PressOverlay } from '../ui/PressOverlay';
import { AppText } from '../ui/Text';

interface QuickAction {
  key: 'wealth' | 'planner' | 'insights' | 'ember';
  label: string;
  icon?: LucideIcon;
  mark?: 'ascent' | 'doudou';
}

// Static so the icon components are not recreated on every render.
const actions: readonly QuickAction[] = [
  { key: 'wealth', label: 'Wealth', icon: Landmark },
  { key: 'planner', label: 'Planner', mark: 'ascent' },
  { key: 'insights', label: 'Insights', icon: ChartPie },
  // Short label so it never truncates beside the others; the screen reader still hears "Ask DouDou".
  { key: 'ember', label: 'DouDou', mark: 'doudou' },
];

/**
 * The row of round shortcuts under the net worth headline, the wallet-app pattern of Top up /
 * Transfer / Receive adapted to FireBuddy's destinations. Translucent white tiles on the forest
 * hero rather than lime, so the tab bar's Add tile stays the one lime action on the screen.
 */
export function QuickActions() {
  const { theme } = useTheme();
  const router = useRouter();
  // Each shortcut's round tile is a stop on DouDou's tour, so the spotlight circles the icon.
  const targets = {
    wealth: useTourTarget('wealth'),
    planner: useTourTarget('planner'),
    insights: useTourTarget('insights'),
    ember: useTourTarget('doudou'),
  };
  const open = (key: QuickAction['key']) => {
    if (key === 'wealth') router.push('/wealth');
    else if (key === 'planner') router.push('/fire-planner');
    else if (key === 'insights') router.push('/insights');
    else router.push('/ember');
  };

  return (
    <View style={styles.row}>
      {actions.map(({ key, label, icon: Icon, mark }) => (
        <Pressable key={key} accessibilityRole="button" accessibilityLabel={key === 'ember' ? 'Ask DouDou' : label} onPress={() => open(key)} style={styles.action}>
          {({ pressed }) => (
            <>
              <View {...targets[key]} style={[styles.tile, { borderColor: theme.heroLine }]}>
                <PressOverlay pressed={pressed} radius={radii.pill} light />
                {Icon ? <Icon size={22} color={theme.heroInk} strokeWidth={1.9} /> : null}
                {mark === 'ascent' ? <AscentMark size={22} color={theme.heroInk} /> : null}
                {mark === 'doudou' ? <DoudouMark size={30} /> : null}
              </View>
              <AppText variant="captionMedium" tone="heroMuted" numberOfLines={1}>{label}</AppText>
            </>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 80,
  },
  tile: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
