import { getInitials } from '@firebuddy/shared';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Database, Landmark, LogOut, Mail, Moon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AscentMark } from '@/components/brand/BrandMarks';
import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SettingRow } from '@/components/ui/ListRow';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppText } from '@/components/ui/Text';
import { radii, spacing } from '@/constants/tokens';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme, type ThemePreference } from '@/lib/theme';

/** Identity, the implemented preferences, and the demo-data reset. Disabled settings are not advertised. */
export default function ProfileScreen() {
  const router = useRouter();
  const { theme, preference, setPreference } = useTheme();
  const { profile, clearDemoData, notify } = useFireBuddy();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [clearing, setClearing] = useState(false);

  const openComingSoon = (title: string, description: string) => router.push({ pathname: '/coming-soon', params: { title, description } });

  return (
    <Screen>
      <PageToolbar title="Profile" description="Manage your FireBuddy preferences and financial setup." />

      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: theme.railBg }]}>
          <AppText variant="cardTitle" tone="rail">{getInitials(profile.name)}</AppText>
        </View>
        <View style={styles.identityCopy}>
          <AppText variant="cardTitle">{profile.name}</AppText>
          <AppText variant="bodySmall" tone="ink2">Local demo mode</AppText>
        </View>
      </View>

      <Card padded={false}>
        <SettingRow icon={Mail} label={profile.email} detail="Demo account" first />
      </Card>

      <Card padded={false}>
        <SettingRow icon={Landmark} label="Wealth positions" value="Manage" chevron first onPress={() => openComingSoon('Wealth', 'Assets and liabilities, dated separately from payment accounts.')} />
        <SettingRow
          leading={(
            <View style={[styles.iconTile, { backgroundColor: theme.surface2 }]}>
              <AscentMark size={20} color={theme.ink2} />
            </View>
          )}
          label="FIRE Planner"
          value="Review"
          chevron
          onPress={() => openComingSoon('FIRE Planner', 'Your retirement timeline, from investing to drawing down.')}
        />
        <SettingRow icon={Moon} label="Appearance" detail={preference === 'system' ? 'Follows your device setting' : `${preference === 'dark' ? 'Dark' : 'Light'} mode`} />
        <View style={styles.appearance}>
          <SegmentedControl<ThemePreference>
            options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
            value={preference}
            onChange={setPreference}
            accessibilityLabel="Appearance"
          />
        </View>
      </Card>

      <Card padded={false}>
        <SettingRow icon={Database} label="Clear local demo data" tone="danger" first onPress={() => setConfirmClear(true)} />
        <SettingRow icon={LogOut} label="Log out" tone="danger" onPress={() => setConfirmLogout(true)} />
      </Card>

      <AppText variant="caption" tone="ink3" align="center">
        FireBuddy demo · v{Constants.expoConfig?.version ?? '1.0.0'}
      </AppText>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all local data?"
        message="This resets demo transactions, categories, accounts and tags to the starting dataset."
        confirmLabel="Clear"
        busy={clearing}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setClearing(true);
          clearDemoData().finally(() => {
            setClearing(false);
            setConfirmClear(false);
          });
        }}
      />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: {
    flex: 1,
    gap: 2,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearance: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
