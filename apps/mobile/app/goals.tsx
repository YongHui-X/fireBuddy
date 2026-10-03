import { useRouter } from 'expo-router';
import { Flag } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageToolbar } from '@/components/ui/PageToolbar';

/** Life Goals is an approved later milestone on web and mobile alike, so it stays navigable without pretending to be shipped. */
export default function GoalsScreen() {
  const router = useRouter();
  return (
    <Screen>
      <PageToolbar title="Life Goals" description="This area is planned but not available yet." onBack={() => router.back()} />
      <Card style={styles.card}>
        <EmptyState
          icon={Flag}
          title="Goal tracking follows the dashboard foundation"
          message="Saved goals, target dates, goal contributions and progress statuses are not implemented yet. Your FIRE plan already tracks the biggest goal."
          actionLabel="Review FIRE plan"
          onAction={() => router.push('/fire-planner')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 28,
  },
});
