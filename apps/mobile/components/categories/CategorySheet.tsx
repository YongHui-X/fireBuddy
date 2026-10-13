import { categoryColors, categoryIconOptions, sanitizeAmountInput, type Category, type CreateCategoryInput, type TransactionType } from '@firebuddy/shared';
import { Check, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing, tint } from '@/constants/tokens';
import { getIconById } from '@/lib/category-icons';
import { useTheme } from '@/lib/theme';
import { useResetWhen } from '@/hooks/use-reset-when';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { AppText } from '../ui/Text';
import { TextField } from '../ui/TextField';

export interface CategorySheetProps {
  open: boolean;
  mode: 'add' | 'edit';
  categoryType: TransactionType;
  initial?: Category | null;
  onClose: () => void;
  onSave: (input: CreateCategoryInput) => void;
  onDelete?: () => void;
}

const iconChoices = categoryIconOptions.filter((option) => option.id !== 'shapes');

/**
 * Create or edit a custom category: name, type, icon, colour and (for expenses) a monthly budget.
 * System categories keep their name, type, icon and colour, but their budget can still be set,
 * since a new install has only system categories.
 */
export function CategorySheet({ open, mode, categoryType, initial, onClose, onSave, onDelete }: CategorySheetProps) {
  const { theme } = useTheme();
  const readOnly = Boolean(initial?.isDefault);
  const budgetOnly = readOnly && initial?.categoryType === 'expense';
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(categoryType);
  const [icon, setIcon] = useState<string>('others');
  const [color, setColor] = useState<string>(categoryColors[0]);
  const [budget, setBudget] = useState('');
  const [error, setError] = useState<string | null>(null);

  useResetWhen(open, () => {
    setName(initial?.name ?? '');
    setType(initial?.categoryType ?? categoryType);
    setIcon(initial?.icon ?? (categoryType === 'income' ? 'income' : 'others'));
    setColor(initial?.color ?? categoryColors[0]);
    setBudget(initial && Number(initial.monthlyBudget) > 0 ? String(Number(initial.monthlyBudget)) : '');
    setError(null);
  });

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the category a name.');
      return;
    }
    onSave({
      name: trimmed,
      icon,
      color,
      monthlyBudget: type === 'expense' && budget ? Number(budget).toFixed(2) : '0.00',
      categoryType: type,
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={readOnly ? initial?.name ?? 'Category' : mode === 'add' ? 'Add category' : 'Edit category'}
      description={budgetOnly ? 'Built-in categories keep their name and icon, but you can set a monthly budget.' : readOnly ? 'Built-in categories cannot be edited.' : undefined}
      footer={budgetOnly ? (
        <Button label="Save budget" variant="primary" block onPress={save} />
      ) : readOnly ? (
        <Button label="Close" variant="secondary" block onPress={onClose} />
      ) : (
        <View style={styles.footer}>
          <Button label={mode === 'add' ? 'Save category' : 'Save changes'} variant="primary" block onPress={save} />
          {mode === 'edit' && onDelete ? <Button label="Delete category" icon={Trash2} variant="danger" block onPress={onDelete} /> : null}
        </View>
      )}
    >
      <View style={styles.body}>
        <TextField label="Name" value={name} onChangeText={(text) => { setName(text); setError(null); }} placeholder="e.g. Coffee" editable={!readOnly} error={error} autoCapitalize="sentences" />
        <View style={styles.field}>
          <AppText variant="label">Type</AppText>
          <SegmentedControl<TransactionType>
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
            value={type}
            onChange={readOnly ? () => undefined : setType}
          />
        </View>
        <View style={styles.field}>
          <AppText variant="label">Icon</AppText>
          <View style={styles.grid}>
            {iconChoices.map((option) => {
              const Icon = getIconById(option.id);
              const selected = icon === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                  disabled={readOnly}
                  onPress={() => setIcon(option.id)}
                  style={[styles.iconTile, { backgroundColor: selected ? tint(color, 0.18) : theme.surface2, borderColor: selected ? color : 'transparent' }]}
                >
                  <Icon size={20} color={selected ? color : theme.ink2} strokeWidth={1.9} />
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.field}>
          <AppText variant="label">Colour</AppText>
          <View style={styles.grid}>
            {categoryColors.map((swatch) => {
              const selected = color === swatch;
              return (
                <Pressable
                  key={swatch}
                  accessibilityRole="radio"
                  accessibilityLabel={`Colour ${swatch}`}
                  accessibilityState={{ selected }}
                  disabled={readOnly}
                  onPress={() => setColor(swatch)}
                  style={[styles.swatch, { backgroundColor: swatch, borderColor: selected ? theme.ink : 'transparent' }]}
                >
                  {selected ? <Check size={16} color="#ffffff" strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
        {type === 'expense' ? (
          <TextField
            label="Monthly budget"
            optional
            value={budget}
            onChangeText={(text) => setBudget(sanitizeAmountInput(text))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            help="Used for the budget bars on Home and Categories."
          />
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radii.tile,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: spacing.sm,
  },
});
