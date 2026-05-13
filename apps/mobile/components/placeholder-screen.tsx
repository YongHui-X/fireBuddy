import { StyleSheet, Text, View } from 'react-native';
import { FirebuddyPalette } from '@/constants/theme';

export function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: FirebuddyPalette.background,
    padding: 20,
  },
  card: {
    marginTop: 28,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: FirebuddyPalette.border,
    backgroundColor: FirebuddyPalette.shell,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: FirebuddyPalette.text,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: FirebuddyPalette.muted,
  },
});
