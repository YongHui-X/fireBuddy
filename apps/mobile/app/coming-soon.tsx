import { useLocalSearchParams, useRouter } from 'expo-router';
import { Construction } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageToolbar } from '@/components/ui/PageToolbar';

/** Destination for the More sheet's secondary routes until they are ported from the web app. */
export default function ComingSoonScreen() {
  const router = useRouter();
  const { title, description } = useLocalSearchParams<{ title?: string; description?: string }>();
  const heading = typeof title === 'string' && title ? title : 'Coming soon';

  return (
    <Screen topbar>
      <PageToolbar title={heading} description={typeof description === 'string' ? description : undefined} onBack={() => router.back()} />
      <Card style={styles.card}>
        <EmptyState
          icon={Construction}
          title="Coming to mobile"
          message={`${heading} is available in the FireBuddy web app today and is next in line for the phone.`}
          actionLabel="Back to Home"
          onAction={() => router.navigate('/')}
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
