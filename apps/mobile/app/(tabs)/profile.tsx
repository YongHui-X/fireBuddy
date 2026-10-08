import AsyncStorage from '@react-native-async-storage/async-storage';
import { findCountry, getInitials, LEGAL_CONTACT_EMAIL, NICKNAME_MAX_LENGTH, normaliseNickname } from '@firebuddy/shared';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Bell, ClipboardList, Database, Eraser, FileDown, FileText, FileUp, Globe, Landmark, Mail, Moon, Pencil, ShieldCheck, Sparkles, Sprout, TrendingUp, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AscentMark, DoudouMark } from '@/components/brand/BrandMarks';
import { Screen } from '@/components/layout/Screen';
import { DoudouConsentDialog } from '@/components/ember/DoudouConsent';
import { BackupSheet } from '@/components/profile/BackupSheet';
import { RegionSheet } from '@/components/profile/RegionSheet';
import { useTour } from '@/components/tour/TourProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { SettingRow } from '@/components/ui/ListRow';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PressOverlay } from '@/components/ui/PressOverlay';
import { AppText } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { radii, spacing } from '@/constants/tokens';
import { useBackup } from '@/hooks/use-backup';
import { EMBER_CONVERSATIONS_KEY, EMBER_TRANSCRIPT_KEY } from '@/hooks/use-ember';
import { clearBackupCache } from '@/lib/backup-file';
import { useAiPreference } from '@/lib/ai-preference';
import { remindersSupported, requestReminderPermission } from '@/lib/daily-reminder';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { useRegion, useUserProfile } from '@/lib/user-profile';

/**
 * Identity, the money tools that are not one of the four tabs, preferences, and the data reset.
 * This is where the old topbar "More" menu now lives, so every secondary destination has a home.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { theme, preference, setPreference } = useTheme();
  const { clearDemoData, startFresh, isFreshDataset, notify } = useFireBuddy();
  const { nickname, setNickname, resetTour, resetProfile, setRegion, reminderOn, setReminderOn } = useUserProfile();
  const region = useRegion();
  const [regionOpen, setRegionOpen] = useState(false);
  const { startTour } = useTour();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const doudou = useAiPreference();
  const backup = useBackup();
  const [backupMode, setBackupMode] = useState<'backup' | 'restore' | null>(null);
  const [restoreText, setRestoreText] = useState<string | null>(null);
  // Which reset is being confirmed: an empty start for a new user, or the demo dataset back.
  const [confirmReset, setConfirmReset] = useState<'fresh' | 'demo' | null>(null);
  // The last kind asked for, so the dialog keeps its wording while it slides away.
  const [resetKind, setResetKind] = useState<'fresh' | 'demo'>('fresh');
  const askReset = (kind: 'fresh' | 'demo') => { setResetKind(kind); setConfirmReset(kind); };
  const [consentOpen, setConsentOpen] = useState(false);
  const [confirmDoudouOff, setConfirmDoudouOff] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Turning on asks the system first; a refusal leaves the switch off and says where to fix it.
  const toggleReminder = async (next: boolean) => {
    if (!next) {
      setReminderOn(false);
      return;
    }
    const granted = await requestReminderPermission().catch(() => false);
    setReminderOn(granted);
    if (!granted) notify('Notifications are blocked. Allow them for FireBuddy in your phone settings.');
  };

  return (
    <Screen>
      <PageToolbar title="Profile" description="Manage your FireBuddy preferences and financial setup." />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nickname ? `Name, ${nickname}. Change` : 'Add your name'}
        onPress={() => setNameDraft(nickname ?? '')}
        style={styles.identity}
      >
        {({ pressed }) => (
          <>
            <PressOverlay pressed={pressed} radius={radii.card} />
            <View style={[styles.avatar, { backgroundColor: theme.railBg }]}>
              {nickname ? <AppText variant="cardTitle" tone="rail">{getInitials(nickname)}</AppText> : <DoudouMark size={44} />}
            </View>
            <View style={styles.identityCopy}>
              <AppText variant="cardTitle" numberOfLines={1}>{nickname ?? 'Add your name'}</AppText>
            </View>
            <Pencil size={18} color={theme.ink3} />
          </>
        )}
      </Pressable>

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
          <SettingRow icon={ClipboardList} label="Budgets" detail="Mark essential spending categories" chevron onPress={() => router.push('/plan')} />
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
          <SettingRow
            icon={Globe}
            label="Country and currency"
            detail={`${findCountry(region.country)?.name ?? 'Singapore'} · ${region.currency}`}
            chevron
            onPress={() => setRegionOpen(true)}
          />
          <SettingRow
            icon={Sparkles}
            label="DouDou"
            detail={doudou.enabled ? 'On. Only the figures a question needs are shared, as rough ranges.' : 'Off. Nothing leaves this phone.'}
            onPress={() => (doudou.enabled ? setConfirmDoudouOff(true) : setConsentOpen(true))}
            trailing={(
              <Switch
                accessibilityLabel="DouDou"
                value={doudou.enabled}
                disabled={doudou.status === 'working'}
                onValueChange={(next) => (next ? setConsentOpen(true) : setConfirmDoudouOff(true))}
                trackColor={{ false: theme.lineStrong, true: theme.accent }}
                thumbColor={theme.surface}
                ios_backgroundColor={theme.lineStrong}
              />
            )}
          />
          {remindersSupported ? (
            <SettingRow
              icon={Bell}
              label="Daily reminder"
              detail={reminderOn ? 'DouDou nudges you at 9pm if today is empty' : 'Off'}
              onPress={() => void toggleReminder(!reminderOn)}
              trailing={(
                <Switch
                  accessibilityLabel="Daily reminder"
                  value={reminderOn === true}
                  onValueChange={(next) => void toggleReminder(next)}
                  trackColor={{ false: theme.lineStrong, true: theme.accent }}
                  thumbColor={theme.surface}
                  ios_backgroundColor={theme.lineStrong}
                />
              )}
            />
          ) : null}
          <SettingRow
            icon={Sprout}
            label="Replay Tutorial"
            detail="A quick look at what each part of the app does"
            chevron
            onPress={() => {
              resetTour();
              startTour();
            }}
          />
          {doudou.enabled && doudou.consentedAt ? (
            <View style={styles.appearance}>
              <AppText variant="caption" tone="ink3">
                {`Turned on ${new Date(doudou.consentedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}. No name or email is attached.`}
              </AppText>
            </View>
          ) : null}
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
          {/* The demo tools are for testing; a real install only offers to delete everything. */}
          {__DEV__ ? (
            <>
              <SettingRow icon={Eraser} label="Start fresh" detail="Empty FireBuddy, as a new user sees it" tone="danger" first onPress={() => askReset('fresh')} />
              <SettingRow icon={Database} label="Load demo data" detail={isFreshDataset ? 'Explore with sample figures' : 'Showing sample figures now'} onPress={() => askReset('demo')} />
            </>
          ) : (
            <SettingRow icon={Eraser} label="Delete all my data" detail="Erase everything FireBuddy keeps on this phone" tone="danger" first onPress={() => askReset('fresh')} />
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <AppText variant="overline" tone="ink2" style={styles.sectionTitle}>About</AppText>
        <Card padded={false}>
          <SettingRow icon={ShieldCheck} label="Privacy policy" detail="What stays on this phone and what can leave it" chevron first onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })} />
          <SettingRow icon={FileText} label="Terms of use" detail="The rules for using FireBuddy" chevron onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })} />
          <SettingRow
            icon={Mail}
            label="Contact us"
            detail={LEGAL_CONTACT_EMAIL}
            chevron
            onPress={() => { Linking.openURL(`mailto:${LEGAL_CONTACT_EMAIL}?subject=FireBuddy`).catch(() => notify(`Email us at ${LEGAL_CONTACT_EMAIL}`)); }}
          />
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
        open={confirmReset !== null}
        title={resetKind === 'fresh' ? (__DEV__ ? 'Start fresh?' : 'Delete all your data?') : 'Load demo data?'}
        message={resetKind === 'fresh'
          ? 'Everything on this phone is cleared: transactions, accounts, wealth, your plan, your name and DouDou chats. DouDou turns off and the welcome plays again. This cannot be undone, so make a backup first if you want to keep anything.'
          : `Your transactions, accounts, wealth and plan are replaced with sample figures.${doudou.enabled ? ' DouDou turns off.' : ''} Make a backup first if you want to keep anything.`}
        confirmLabel={resetKind === 'fresh' ? (__DEV__ ? 'Start fresh' : 'Delete everything') : 'Load demo data'}
        busy={clearing}
        onCancel={() => setConfirmReset(null)}
        onConfirm={() => {
          const kind = confirmReset;
          setClearing(true);
          const offDoudou = doudou.enabled ? doudou.turnOff() : Promise.resolve();
          // Start fresh always removes DouDou's pass: a turn-on that failed halfway can leave one
          // behind while DouDou still shows as off. With no pass this makes no network call.
          const forgetDoudou = kind === 'fresh' && !doudou.enabled ? doudou.turnOff() : offDoudou;
          const reset = kind === 'fresh'
            // Clearing the name re-opens the welcome from the root layout's first-run check.
            ? Promise.all([
              startFresh(),
              forgetDoudou,
              // Both chat stores: the current one and the single transcript older builds kept.
              AsyncStorage.multiRemove([EMBER_CONVERSATIONS_KEY, EMBER_TRANSCRIPT_KEY]).catch(() => undefined),
            ]).then(() => {
              clearBackupCache();
              resetProfile();
            })
            : Promise.all([clearDemoData(), offDoudou]);
          void reset.finally(() => {
            setClearing(false);
            setConfirmReset(null);
          });
        }}
      />
      <ConfirmDialog
        open={confirmDoudouOff}
        title="Turn off DouDou?"
        message="DouDou stops at once, and FireBuddy deletes the anonymous pass for this phone. Your records stay on this phone."
        confirmLabel="Turn off"
        onCancel={() => setConfirmDoudouOff(false)}
        onConfirm={() => {
          setConfirmDoudouOff(false);
          void doudou.turnOff().then(() => notify('DouDou is off. Nothing leaves this phone.'));
        }}
      />
      {regionOpen ? (
        <RegionSheet
          initial={{ country: region.country, currency: region.currency }}
          onClose={() => setRegionOpen(false)}
          onSave={(choice) => {
            setRegion(choice.country, choice.currency);
            setRegionOpen(false);
            notify(`Showing amounts in ${choice.currency}.`);
          }}
        />
      ) : null}
      <Dialog
        open={nameDraft !== null}
        onClose={() => setNameDraft(null)}
        footer={(
          <View style={styles.dialogActions}>
            <Button label="Cancel" variant="secondary" style={styles.dialogButton} onPress={() => setNameDraft(null)} />
            <Button
              label="Save"
              variant="primary"
              style={styles.dialogButton}
              onPress={() => {
                setNickname(nameDraft);
                setNameDraft(null);
                notify(normaliseNickname(nameDraft) ? 'Name saved.' : 'Name removed.');
              }}
            />
          </View>
        )}
      >
        <View style={styles.dialogBody}>
          <AppText variant="sheetTitle">How should we address you?</AppText>
          <TextField
            label="Your name"
            placeholder="e.g. Jo"
            help="Leave empty to be greeted without a name. Only kept on this phone."
            value={nameDraft ?? ''}
            onChangeText={setNameDraft}
            autoFocus
            autoCapitalize="words"
            maxLength={NICKNAME_MAX_LENGTH + 8}
            returnKeyType="done"
          />
        </View>
      </Dialog>
      <DoudouConsentDialog
        open={consentOpen}
        onAccept={() => {
          void doudou.turnOn().then((on) => {
            if (!on) return;
            setConsentOpen(false);
            notify('DouDou is on.');
          });
        }}
        onDecline={() => setConsentOpen(false)}
        working={doudou.status === 'working'}
        error={doudou.error}
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
    paddingRight: spacing.sm,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  dialogBody: {
    gap: spacing.lg,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dialogButton: {
    flex: 1,
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
});
