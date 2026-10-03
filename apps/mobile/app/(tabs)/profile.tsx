import { getInitials, type AiPreference } from '@firebuddy/shared';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ClipboardList, Database, FileDown, FileUp, Flag, Landmark, LogOut, Moon, Sparkles, TrendingUp, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AscentMark } from '@/components/brand/BrandMarks';
import { Screen } from '@/components/layout/Screen';
import { BackupSheet } from '@/components/profile/BackupSheet';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SettingRow } from '@/components/ui/ListRow';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppText } from '@/components/ui/Text';
import { radii, spacing } from '@/constants/tokens';
import { useBackup } from '@/hooks/use-backup';
import { AI_LEVEL_COPY, useAiPreference } from '@/lib/ai-preference';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme, type ThemePreference } from '@/lib/theme';

/**
 * Identity, the money tools that are not one of the four tabs, preferences, and the data reset.
 * This is where the old topbar "More" menu now lives, so every secondary destination has a home.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { theme, preference, setPreference } = useTheme();
  const { profile, clearDemoData, notify } = useFireBuddy();
  const { preference: aiPreference, consentedAt, setPreference: setAiPreference } = useAiPreference();
  const backup = useBackup();
  const [backupMode, setBackupMode] = useState<'backup' | 'restore' | null>(null);
  const [restoreText, setRestoreText] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [clearing, setClearing] = useState(false);

  return (
    <Screen>
      <PageToolbar title="Profile" description="Manage your FireBuddy preferences and financial setup." />

      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: theme.railBg }]}>
          <AppText variant="cardTitle" tone="rail">{getInitials(profile.name)}</AppText>
        </View>
        <View style={styles.identityCopy}>
          <AppText variant="cardTitle">{profile.name}</AppText>
          <AppText variant="bodySmall" tone="ink2" numberOfLines={1}>{profile.email}</AppText>
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="overline" tone="ink2" style={styles.sectionTitle}>Money tools</AppText>
        <Card padded={false}>
          <SettingRow icon={Landmark} label="Wealth" detail="Assets and liabilities" chevron first onPress={() => router.push('/wealth')} />
          <SettingRow
            leading={(
              <View style={[styles.iconTile, { backgroundColor: theme.surface2 }]}>
                <AscentMark size={20} color={theme.ink2} />
              </View>
            )}
            label="FIRE Planner"
            detail="Your retirement timeline"
            chevron
            onPress={() => router.push('/fire-planner')}
          />
          <SettingRow icon={TrendingUp} label="Insights" detail="Spending trends over time" chevron onPress={() => router.push('/insights')} />
          <SettingRow icon={Wallet} label="Accounts" detail="Payment accounts used by transactions" chevron onPress={() => router.push('/accounts')} />
          <SettingRow icon={ClipboardList} label="Plan" detail="Mark essential spending categories" chevron onPress={() => router.push('/plan')} />
          <SettingRow icon={Flag} label="Goals" detail="Savings goals, planned" chevron onPress={() => router.push('/goals')} />
        </Card>
      </View>

      <View style={styles.section}>
        <AppText variant="overline" tone="ink2" style={styles.sectionTitle}>Preferences</AppText>
        <Card padded={false}>
          <SettingRow icon={Moon} label="Appearance" detail={preference === 'system' ? 'Follows your device setting' : `${preference === 'dark' ? 'Dark' : 'Light'} mode`} first />
          <View style={styles.appearance}>
            <SegmentedControl<ThemePreference>
              options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
              value={preference}
              onChange={setPreference}
              accessibilityLabel="Appearance"
            />
          </View>
          <SettingRow icon={Sparkles} label="Ember and AI" detail="Choose how much the AI guide may see. Off until you decide." value={AI_LEVEL_COPY[aiPreference].title} />
          <View style={styles.appearance}>
            <SegmentedControl<AiPreference>
              options={[{ value: 'off', label: 'Off' }, { value: 'guide', label: 'Guide' }, { value: 'personalised', label: 'Personalised' }]}
              value={aiPreference}
              onChange={(level) => { setAiPreference(level); notify(level === 'off' ? 'AI features switched off.' : `Ember set to ${AI_LEVEL_COPY[level].title}.`); }}
              accessibilityLabel="AI level"
            />
            <AppText variant="caption" tone="ink2" style={styles.aiSummary}>{AI_LEVEL_COPY[aiPreference].summary}</AppText>
            <AppText variant="caption" tone="ink3">
              {consentedAt ? `Consent recorded ${new Date(consentedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}, stored on this phone.` : 'No consent recorded.'}
            </AppText>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <AppText variant="overline" tone="ink2" style={styles.sectionTitle}>Your data</AppText>
        <Card padded={false}>
          <SettingRow icon={FileDown} label="Back up to a file" detail="Encrypted with a passphrase. Save it to iCloud Drive, Google Drive or Files." chevron first onPress={() => setBackupMode('backup')} />
          <SettingRow
            icon={FileUp}
            label="Restore from a file"
            detail="Replaces everything on this phone with a backup."
            chevron
            onPress={() => {
              void backup.pickBackup().then((picked) => {
                if (!picked) return;
                if ('error' in picked) {
                  notify(picked.error);
                  return;
                }
                setRestoreText(picked.text);
                setBackupMode('restore');
              });
            }}
          />
        </Card>
        <AppText variant="caption" tone="ink3" style={styles.sectionTitle}>Your records live only on this phone. A backup is the only copy if the phone is lost.</AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="overline" tone="ink2" style={styles.sectionTitle}>Account</AppText>
        <Card padded={false}>
          <SettingRow icon={Database} label="Reset data" tone="danger" first onPress={() => setConfirmClear(true)} />
          <SettingRow icon={LogOut} label="Log out" tone="danger" onPress={() => setConfirmLogout(true)} />
        </Card>
      </View>

      <AppText variant="caption" tone="ink3" align="center">
        FireBuddy v{Constants.expoConfig?.version ?? '1.0.0'}
      </AppText>

      <BackupSheet
        mode={backupMode}
        step={backup.step}
        onClose={() => { setBackupMode(null); setRestoreText(null); }}
        onSubmit={(passphrase) => (backupMode === 'restore' && restoreText !== null
          ? backup.restoreBackup(restoreText, passphrase)
          : backup.createBackup(passphrase))}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Reset all data?"
        message="This resets transactions, categories, accounts and tags to the starting dataset."
        confirmLabel="Reset"
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
        message="Sign-in is not connected yet, so there is no account to log out of."
        confirmLabel="Got it"
        tone="primary"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          notify('No account to sign out of yet.');
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
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    paddingHorizontal: spacing.xs,
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
    gap: spacing.sm,
  },
  aiSummary: {
    marginTop: spacing.xs,
  },
});
