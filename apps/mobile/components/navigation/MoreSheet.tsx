import { useRouter } from 'expo-router';
import { ChevronRight, ClipboardList, Flag, Landmark, LogOut, TrendingUp, Wallet, type LucideIcon } from 'lucide-react-native';
import { useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme } from '@/lib/theme';

import { AscentMark, EmberMark } from '../brand/BrandMarks';
import { BottomSheet } from '../ui/BottomSheet';
import { Chip } from '../ui/Chip';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PressOverlay } from '../ui/PressOverlay';
import { AppText } from '../ui/Text';

interface MoreItem {
  title: string;
  description: string;
  icon: LucideIcon | ComponentType<{ size?: number; color?: string }>;
  indicator?: string;
}

/** Everything that is not one of the four tabs, in the same order as the web More sheet. */
const items: readonly MoreItem[] = [
  { title: 'Ask Ember', description: 'Ember, the Singapore finance guide, answers CPF, SRS and FIRE questions.', icon: EmberMark, indicator: 'AI' },
  { title: 'Insights', description: 'Spending trends by day, week, month and year.', icon: TrendingUp },
  { title: 'Accounts', description: 'Manage the payment accounts used by your transactions.', icon: Wallet },
  { title: 'Wealth', description: 'Assets and liabilities, dated separately from payment accounts.', icon: Landmark },
  { title: 'FIRE Planner', description: 'Your retirement timeline, from investing to drawing down.', icon: AscentMark },
  { title: 'Plan', description: 'Mark which categories count as essential spending.', icon: ClipboardList },
  { title: 'Goals', description: 'Savings goals are on the roadmap.', icon: Flag },
];

export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const { notify } = useFireBuddy();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="More" tone="forest" bodyStyle={styles.body}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                router.push({ pathname: '/coming-soon', params: { title: item.title, description: item.description } });
              }}
              style={styles.row}
            >
              {({ pressed }) => (
                <>
                  <PressOverlay pressed={pressed} />
                  <View style={styles.icon}>
                    <Icon size={20} color={theme.ink2} />
                  </View>
                  <AppText variant="bodyMedium" style={styles.label}>{item.title}</AppText>
                  {item.indicator ? <Chip label={item.indicator} tone="ai" /> : null}
                  <ChevronRight size={18} color={theme.ink3} strokeWidth={2} />
                </>
              )}
            </Pressable>
          );
        })}
        <View style={[styles.divider, { backgroundColor: theme.line }]} />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onClose();
            setConfirmLogout(true);
          }}
          style={styles.row}
        >
          {({ pressed }) => (
            <>
              <PressOverlay pressed={pressed} />
              <View style={styles.icon}>
                <LogOut size={20} color={theme.danger} strokeWidth={1.9} />
              </View>
              <AppText variant="bodyMedium" tone="danger" style={styles.label}>Log out</AppText>
            </>
          )}
        </Pressable>
      </BottomSheet>
      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        message="You are using local demo data. Sign-in arrives with the Supabase connection, so there is no account to log out of yet."
        confirmLabel="Got it"
        tone="primary"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          notify('Demo mode has no account to sign out of.');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingHorizontal: spacing.lg + 2,
  },
  icon: {
    width: 24,
    alignItems: 'center',
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg + 2,
  },
});
