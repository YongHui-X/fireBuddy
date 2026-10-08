import { accountTypeLabel, type Account } from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { ChevronRight, Plus, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AccountDeleteSheet } from '@/components/accounts/AccountDeleteSheet';
import { AccountSheet, accountTypeIcons } from '@/components/accounts/AccountSheet';
import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { PressOverlay } from '@/components/ui/PressOverlay';
import { AppText } from '@/components/ui/Text';
import { radii, spacing, tint } from '@/constants/tokens';
import { useAccountUsage } from '@/hooks/use-accounts';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme } from '@/lib/theme';

/** Payment accounts used by transactions. Labels only: no balances, no bank connections. */
export default function AccountsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { accounts, transactions, recurringRules, addAccount, updateAccount, deleteAccount, setDefaultAccount, notify } = useFireBuddy();
  const { usage, deleteBlockedReason } = useAccountUsage();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  // Held apart from `editing` so the edit sheet closes before the delete sheet opens (one modal at a time).
  const [deleting, setDeleting] = useState<Account | null>(null);

  return (
    <Screen>
      <PageToolbar
        title="Accounts"
        description="Manage the payment accounts used by your transactions."
        onBack={() => router.back()}
        trailing={<IconButton icon={Plus} tone="bordered" accessibilityLabel="Add account" onPress={() => setAdding(true)} />}
      />

      <Card padded={false}>
        {accounts.length ? accounts.map((account, index) => {
          const Icon = accountTypeIcons[account.type];
          const count = usage.get(account.id) ?? 0;
          return (
            <Pressable
              key={account.id}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${account.name}`}
              onPress={() => setEditing(account)}
              style={[styles.row, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null]}
            >
              {({ pressed }) => (
                <>
                  <PressOverlay pressed={pressed} />
                  <View style={[styles.icon, { backgroundColor: tint(account.color, 0.18) }]}>
                    <Icon size={20} color={account.color} strokeWidth={1.9} />
                  </View>
                  <View style={styles.copy}>
                    <View style={styles.nameRow}>
                      <AppText variant="bodySemibold" numberOfLines={1} style={styles.name}>{account.name}</AppText>
                      {account.isDefault ? <Chip label="Default" tone="accent" /> : null}
                    </View>
                    <AppText variant="caption" tone="ink2" numberOfLines={1}>
                      {accountTypeLabel(account.type)}{account.lastFour ? ` ···· ${account.lastFour}` : ''} · {count} transaction{count === 1 ? '' : 's'}
                    </AppText>
                  </View>
                  <ChevronRight size={18} color={theme.ink3} strokeWidth={2} />
                </>
              )}
            </Pressable>
          );
        }) : (
          <EmptyState icon={Wallet} title="No accounts yet" message="Add the bank account, card or wallet your transactions come from." actionLabel="Add account" onAction={() => setAdding(true)} style={styles.empty} />
        )}
      </Card>

      <AppText variant="caption" tone="ink3" style={styles.footnote}>
        Accounts are labels for where money moved. Balances live in Wealth, and FireBuddy never connects to a bank.
      </AppText>

      <AccountSheet
        open={adding}
        mode="add"
        onClose={() => setAdding(false)}
        onSave={(input) => {
          addAccount(input);
          setAdding(false);
          notify(`${input.name} added.`);
        }}
      />
      <AccountSheet
        open={Boolean(editing)}
        mode="edit"
        initial={editing}
        deleteBlockedReason={deleteBlockedReason(editing)}
        onClose={() => setEditing(null)}
        onSave={(input) => {
          if (editing) {
            updateAccount(editing.id, input);
            notify(`${input.name} updated.`);
          }
          setEditing(null);
        }}
        onDelete={() => {
          setDeleting(editing);
          setEditing(null);
        }}
        onMakeDefault={() => {
          if (editing) {
            setDefaultAccount(editing.id);
            notify(`${editing.name} is now your default account.`);
          }
          setEditing(null);
        }}
      />
      <AccountDeleteSheet
        account={deleting}
        accounts={accounts}
        transactions={transactions}
        ruleAccountIds={recurringRules.map((rule) => rule.template.accountId)}
        onCancel={() => setDeleting(null)}
        onConfirm={(moveTo) => {
          if (deleting) {
            const target = moveTo ? accounts.find((account) => account.id === moveTo) : null;
            const deleted = deleteAccount(deleting.id, moveTo);
            notify(!deleted ? `${deleting.name} was kept.` : target ? `${deleting.name} deleted. Its transactions moved to ${target.name}.` : `${deleting.name} deleted.`);
          }
          setDeleting(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
  empty: {
    paddingVertical: spacing.xxl,
  },
  footnote: {
    paddingHorizontal: spacing.xs,
  },
});
