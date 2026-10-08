import { accountTypeLabels, categoryColors, type Account, type AccountType, type CreateAccountInput } from '@firebuddy/shared';
import { Banknote, Building2, Check, CreditCard, Smartphone, Star, Trash2, WalletCards, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing, tint } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { AppText } from '../ui/Text';
import { TextField } from '../ui/TextField';

/** Icon per payment account type, shared by the sheet, the Accounts list and the ledger. */
export const accountTypeIcons: Record<AccountType, LucideIcon> = {
  bank: Building2,
  credit_card: CreditCard,
  debit_card: WalletCards,
  cash: Banknote,
  ewallet: Smartphone,
};

const accountTypes = Object.keys(accountTypeLabels) as AccountType[];

export interface AccountSheetProps {
  open: boolean;
  mode: 'add' | 'edit';
  initial?: Account | null;
  /** Why Delete is withheld, from `useAccountUsage`; null means the account may be deleted. */
  deleteBlockedReason?: string | null;
  onClose: () => void;
  onSave: (input: CreateAccountInput) => void;
  onDelete?: () => void;
  /** Offered in edit mode for an account that is not already the default. */
  onMakeDefault?: () => void;
}

/** Create or edit a payment account: type, name, optional last four digits and a colour. Balances are never stored. */
export function AccountSheet({ open, mode, initial, deleteBlockedReason = null, onClose, onSave, onDelete, onMakeDefault }: AccountSheetProps) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [color, setColor] = useState<string>(categoryColors[0]);
  const [lastFour, setLastFour] = useState('');
  const [errors, setErrors] = useState<{ name?: string; lastFour?: string }>({});

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setType(initial?.type ?? 'bank');
    setColor(initial?.color ?? categoryColors[0]);
    setLastFour(initial?.lastFour ?? '');
    setErrors({});
  }, [open, initial]);

  function save() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Give the account a name.';
    if (lastFour && !/^\d{4}$/.test(lastFour)) next.lastFour = 'Enter exactly four digits, or leave this empty.';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    onSave({ name: name.trim(), type, color, lastFour: lastFour || null });
  }

  const canDelete = mode === 'edit' && Boolean(onDelete) && !deleteBlockedReason;
  const deleteHint = mode === 'edit' ? deleteBlockedReason : null;
  const canMakeDefault = mode === 'edit' && Boolean(onMakeDefault) && initial && !initial.isDefault;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'New account' : 'Edit account'}
      description="A label for where money moves from. FireBuddy never stores balances or logs in to your bank."
      footer={(
        <View style={styles.footer}>
          <Button label={mode === 'add' ? 'Save account' : 'Save changes'} variant="primary" block onPress={save} />
          {canMakeDefault ? <Button label="Make default" icon={Star} variant="secondary" block onPress={onMakeDefault} /> : null}
          {canDelete ? <Button label="Delete account" icon={Trash2} variant="danger" block onPress={onDelete} /> : null}
        </View>
      )}
    >
      <View style={styles.body}>
        <View style={styles.field}>
          <AppText variant="label">Type</AppText>
          <View style={styles.typeGrid}>
            {accountTypes.map((option) => {
              const Icon = accountTypeIcons[option];
              const selected = type === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setType(option)}
                  style={[styles.typeChip, { backgroundColor: selected ? theme.accentSoft : theme.surface, borderColor: selected ? theme.accent : theme.lineStrong }]}
                >
                  <Icon size={16} color={selected ? theme.accentText : theme.ink2} strokeWidth={1.9} />
                  <AppText variant="captionMedium" tone={selected ? 'accentText' : 'ink2'}>{accountTypeLabels[option]}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <TextField
          label="Account name"
          value={name}
          onChangeText={(text) => { setName(text); setErrors((current) => ({ ...current, name: undefined })); }}
          placeholder="e.g. DBS Savings"
          autoCapitalize="words"
          error={errors.name}
          returnKeyType="next"
        />
        <TextField
          label="Last four digits"
          optional
          value={lastFour}
          onChangeText={(text) => { setLastFour(text.replace(/\D/g, '').slice(0, 4)); setErrors((current) => ({ ...current, lastFour: undefined })); }}
          placeholder="4521"
          keyboardType="number-pad"
          maxLength={4}
          error={errors.lastFour}
          help="Shown beside the name so similar accounts are easy to tell apart."
        />
        <View style={styles.field}>
          <AppText variant="label">Colour</AppText>
          <View style={styles.swatches}>
            {categoryColors.map((swatch) => {
              const selected = color === swatch;
              return (
                <Pressable
                  key={swatch}
                  accessibilityRole="radio"
                  accessibilityLabel={`Colour ${swatch}`}
                  accessibilityState={{ selected }}
                  onPress={() => setColor(swatch)}
                  style={[styles.swatch, { backgroundColor: swatch, borderColor: selected ? theme.ink : 'transparent' }]}
                >
                  {selected ? <Check size={16} color="#ffffff" strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={[styles.preview, { backgroundColor: theme.surface2 }]}>
          <View style={[styles.previewIcon, { backgroundColor: tint(color, 0.18) }]}>
            {(() => { const Icon = accountTypeIcons[type]; return <Icon size={20} color={color} strokeWidth={1.9} />; })()}
          </View>
          <View style={styles.previewCopy}>
            <AppText variant="bodySemibold" numberOfLines={1}>{name.trim() || 'Account name'}</AppText>
            <AppText variant="caption" tone="ink2">{accountTypeLabels[type]}{lastFour.length === 4 ? ` ···· ${lastFour}` : ''}</AppText>
          </View>
        </View>
        {deleteHint ? <AppText variant="caption" tone="ink2">{deleteHint}</AppText> : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
  },
  footer: {
    gap: spacing.sm,
  },
  field: {
    gap: spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.tile,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
