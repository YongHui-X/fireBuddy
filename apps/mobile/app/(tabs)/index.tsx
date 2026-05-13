import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FirebuddyPalette } from '@/constants/theme';
import { useAddExpenseDemo } from '@/lib/add-expense-demo';
import {
  expenseAccounts,
  expenseCategories,
  formatExpenseAmountDisplay,
  getAccountById,
  getCategoryById,
} from '@firebuddy/shared';

export default function HomeScreen() {
  const router = useRouter();
  const { recentExpenses } = useAddExpenseDemo();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>FireBuddy</Text>
        <Text style={styles.title}>Capture today&apos;s spending</Text>
        <Text style={styles.subtitle}>
          Web and mobile now share the same Add Expense flow, defaults, and validation rules.
        </Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Current focus</Text>
          <Text style={styles.heroTitle}>Add expense first</Text>
          <Text style={styles.heroCopy}>
            This mobile shell stays lightweight for now and opens the same account-backed draft
            flow as the rebuilt web screen.
          </Text>
          <Pressable style={styles.inlineButton} onPress={() => router.push('/add-expense')}>
            <Text style={styles.inlineButtonText}>Open Add Expense</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recent local saves</Text>
          <View style={styles.listCard}>
            {recentExpenses.length === 0 ? (
              <Text style={styles.emptyCopy}>
                No local entries yet. Save one from the Add Expense modal to verify the shared flow.
              </Text>
            ) : (
              recentExpenses.map((expense) => {
                const account = getAccountById(expense.accountId, expenseAccounts);
                const category = getCategoryById(expense.categoryId, expenseCategories);

                return (
                  <View key={expense.id} style={styles.expenseRow}>
                    <View style={styles.expenseCopy}>
                      <Text style={styles.expenseTitle}>{expense.displayDescription}</Text>
                      <Text style={styles.expenseMeta}>
                        {category?.name ?? 'Category'} · {account?.name ?? 'Account'}
                      </Text>
                    </View>
                    <Text style={styles.expenseAmount}>
                      {formatExpenseAmountDisplay(expense.amount)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push('/add-expense')}>
        <MaterialIcons color="#F5F8F4" name="add" size={28} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: FirebuddyPalette.background,
  },
  content: {
    padding: 22,
    paddingBottom: 120,
  },
  eyebrow: {
    fontSize: 12,
    color: FirebuddyPalette.muted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '600',
    color: FirebuddyPalette.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: FirebuddyPalette.muted,
    marginBottom: 22,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: FirebuddyPalette.border,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  heroLabel: {
    fontSize: 12,
    color: FirebuddyPalette.accentSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: FirebuddyPalette.text,
  },
  heroCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: FirebuddyPalette.muted,
  },
  inlineButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: FirebuddyPalette.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inlineButtonText: {
    color: '#F5F8F4',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    color: FirebuddyPalette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  listCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: FirebuddyPalette.border,
    backgroundColor: '#FFFFFF',
    gap: 14,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: FirebuddyPalette.muted,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
  },
  expenseCopy: {
    flex: 1,
    gap: 4,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: FirebuddyPalette.text,
  },
  expenseMeta: {
    fontSize: 12,
    color: FirebuddyPalette.muted,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: FirebuddyPalette.accentDeep,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: FirebuddyPalette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
