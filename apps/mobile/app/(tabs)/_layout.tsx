import { Tabs } from 'expo-router';

import { TabBar } from '@/components/navigation/TabBar';
import { useTheme } from '@/lib/theme';

/** The four fixed tabs; the custom bar draws the gold Add tile between them and owns the safe-area inset. */
export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      {/* Short on the bar so the four labels fit; screen readers still hear "Transactions". */}
      <Tabs.Screen name="transactions" options={{ title: 'Trans.', tabBarAccessibilityLabel: 'Transactions' }} />
      <Tabs.Screen name="categories" options={{ title: 'Categories' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
