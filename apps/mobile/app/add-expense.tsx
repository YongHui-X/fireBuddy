import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  accountTypeBadges,
  accountTypeLabels,
  createInitialAddExpenseDraft,
  createLocalExpenseRecord,
  expenseAccounts,
  expenseCategories,
  formatExpenseAmountDisplay,
  isPositiveAmount,
  type AddExpenseDraft,
  type AddExpenseErrors,
  type AddExpenseFieldName,
  validateAddExpenseDraft,
} from '@firebuddy/shared';

import { FirebuddyPalette } from '@/constants/theme';
import { useAddExpenseDemo } from '@/lib/add-expense-demo';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { addExpense } = useAddExpenseDemo();
  const [values, setValues] = useState<AddExpenseDraft>(() => createInitialAddExpenseDraft());
  const [errors, setErrors] = useState<AddExpenseErrors>({});

  function handleFieldChange(field: AddExpenseFieldName, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function handleSubmit() {
    const nextErrors = validateAddExpenseDraft(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    addExpense(createLocalExpenseRecord(values));
    router.back();
  }

  const displayAmount = formatExpenseAmountDisplay(values.amount);
  const canSubmitAmount = isPositiveAmount(values.amount);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <MaterialIcons color={FirebuddyPalette.muted} name="arrow-back-ios-new" size={18} />
          </Pressable>
          <Text style={styles.headerTitle}>Add expense</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.form}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.amountSection}>
              <Text style={styles.sectionTitle}>Amount spent</Text>
              <View style={styles.amountWrap}>
                <Text
                  style={[
                    styles.amountDisplay,
                    values.amount.trim() ? styles.amountDisplayFilled : styles.amountDisplayEmpty,
                  ]}
                >
                  {displayAmount}
                </Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={values.amount}
                  onChangeText={(value) => handleFieldChange('amount', value)}
                  placeholder="0"
                  style={styles.amountInput}
                />
              </View>
              {errors.amount ? <Text style={styles.centeredError}>{errors.amount}</Text> : null}
            </View>

            <View style={styles.body}>
              <View style={styles.section}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  value={values.date}
                  onChangeText={(value) => handleFieldChange('date', value)}
                  placeholder="YYYY-MM-DD"
                  style={[styles.textField, errors.date ? styles.textFieldError : null]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={10}
                />
                {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Account</Text>
                <View style={styles.accountGrid}>
                  {expenseAccounts.map((account) => {
                    const isSelected = values.accountId === account.id;

                    return (
                      <Pressable
                        key={account.id}
                        onPress={() => handleFieldChange('accountId', account.id)}
                        style={[
                          styles.accountCard,
                          isSelected ? styles.accountCardActive : null,
                        ]}
                      >
                        <View
                          style={[
                            styles.accountBadge,
                            { backgroundColor: `${account.color}22` },
                          ]}
                        >
                          <Text style={[styles.accountBadgeText, { color: account.color }]}>
                            {accountTypeBadges[account.type]}
                          </Text>
                        </View>
                        <View style={styles.accountCopy}>
                          <Text style={styles.accountName}>{account.name}</Text>
                          <Text style={styles.accountMeta}>
                            {accountTypeLabels[account.type]}
                            {account.lastFour ? ` · ···· ${account.lastFour}` : ''}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.accountId ? <Text style={styles.errorText}>{errors.accountId}</Text> : null}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                  {expenseCategories.map((category) => {
                    const isSelected = values.categoryId === category.id;

                    return (
                      <Pressable
                        key={category.id}
                        onPress={() => handleFieldChange('categoryId', category.id)}
                        style={[
                          styles.categoryCard,
                          isSelected ? styles.categoryCardActive : null,
                        ]}
                      >
                        <View
                          style={[
                            styles.categoryEmoji,
                            { backgroundColor: `${category.color}1F` },
                          ]}
                        >
                          <Text style={styles.categoryEmojiText}>{category.emoji}</Text>
                        </View>
                        <Text style={styles.categoryName}>{category.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.categoryId ? <Text style={styles.errorText}>{errors.categoryId}</Text> : null}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>
                  Description <Text style={styles.optionalCopy}>optional</Text>
                </Text>
                <TextInput
                  value={values.description}
                  onChangeText={(value) => handleFieldChange('description', value)}
                  placeholder="e.g. Hawker Centre lunch"
                  style={styles.textField}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerCopy}>
              Frontend-only for now. This mirrors the future account-backed flow.
            </Text>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmitAmount}
              style={[styles.submitButton, !canSubmitAmount ? styles.submitButtonDisabled : null]}
            >
              <Text
                style={[
                  styles.submitButtonText,
                  !canSubmitAmount ? styles.submitButtonTextDisabled : null,
                ]}
              >
                Save expense
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: FirebuddyPalette.paper,
  },
  screen: {
    flex: 1,
    backgroundColor: FirebuddyPalette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: FirebuddyPalette.text,
  },
  headerSpacer: {
    width: 28,
    height: 28,
  },
  form: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 18,
  },
  amountSection: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: FirebuddyPalette.border,
  },
  sectionTitle: {
    fontSize: 12,
    color: FirebuddyPalette.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  amountWrap: {
    minWidth: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountDisplay: {
    fontSize: 44,
    fontWeight: '500',
    letterSpacing: -1.2,
  },
  amountDisplayFilled: {
    color: FirebuddyPalette.text,
  },
  amountDisplayEmpty: {
    color: FirebuddyPalette.border,
  },
  amountInput: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    color: 'transparent',
  },
  centeredError: {
    marginTop: 8,
    fontSize: 12,
    color: FirebuddyPalette.danger,
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  section: {
    marginBottom: 22,
  },
  label: {
    fontSize: 11,
    color: FirebuddyPalette.accentSoft,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  optionalCopy: {
    color: '#B0C4B8',
    textTransform: 'none',
    letterSpacing: 0,
  },
  textField: {
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FirebuddyPalette.border,
    backgroundColor: '#FFFFFF',
    color: FirebuddyPalette.text,
  },
  textFieldError: {
    borderColor: FirebuddyPalette.danger,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: FirebuddyPalette.danger,
  },
  accountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  accountCard: {
    width: '48.8%',
    minHeight: 58,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FirebuddyPalette.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  accountCardActive: {
    backgroundColor: '#F1F8F4',
  },
  accountBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  accountCopy: {
    flex: 1,
  },
  accountName: {
    fontSize: 12,
    fontWeight: '600',
    color: FirebuddyPalette.text,
    marginBottom: 2,
  },
  accountMeta: {
    fontSize: 10,
    color: FirebuddyPalette.muted,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '31.8%',
    minHeight: 110,
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FirebuddyPalette.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  categoryCardActive: {
    backgroundColor: '#F1F8F4',
  },
  categoryEmoji: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmojiText: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: FirebuddyPalette.muted,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: FirebuddyPalette.border,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 28,
    backgroundColor: FirebuddyPalette.background,
  },
  footerCopy: {
    minHeight: 18,
    marginBottom: 12,
    fontSize: 12,
    color: FirebuddyPalette.muted,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: FirebuddyPalette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: FirebuddyPalette.border,
  },
  submitButtonText: {
    color: '#F5F8F4',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: FirebuddyPalette.muted,
  },
});
