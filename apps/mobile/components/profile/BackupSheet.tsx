import { MIN_PASSPHRASE_LENGTH } from '@firebuddy/shared';
import { KeyRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import type { BackupStep } from '@/hooks/use-backup';
import { useTheme } from '@/lib/theme';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { AppText } from '../ui/Text';
import { TextField } from '../ui/TextField';

export interface BackupSheetProps {
  mode: 'backup' | 'restore' | null;
  step: BackupStep;
  onClose: () => void;
  /** Resolves to an error message, or null on success. */
  onSubmit: (passphrase: string) => Promise<string | null>;
}

/** Collects the passphrase for an encrypted backup or restore. The passphrase is never stored. */
export function BackupSheet({ mode, step, onClose, onSubmit }: BackupSheetProps) {
  const { theme } = useTheme();
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const busy = step !== 'idle';

  useEffect(() => {
    if (!mode) return;
    setPassphrase('');
    setConfirm('');
    setError(null);
  }, [mode]);

  async function submit() {
    if (mode === 'backup' && passphrase !== confirm) {
      setError('The two passphrases do not match.');
      return;
    }
    setError(null);
    const problem = await onSubmit(passphrase);
    if (problem) {
      setError(problem);
      return;
    }
    onClose();
  }

  return (
    <BottomSheet
      open={mode !== null}
      onClose={onClose}
      dismissable={!busy}
      title={mode === 'restore' ? 'Restore from backup' : 'Back up to a file'}
      description={mode === 'restore'
        ? 'Enter the passphrase you chose when this backup was made.'
        : 'Your records are encrypted with this passphrase and saved wherever you choose. Nothing is uploaded by FireBuddy.'}
      footer={(
        <Button
          label={mode === 'restore' ? 'Restore' : 'Create backup'}
          variant="primary"
          block
          loading={busy}
          disabled={passphrase.length < MIN_PASSPHRASE_LENGTH || (mode === 'backup' && confirm.length < MIN_PASSPHRASE_LENGTH)}
          onPress={() => void submit()}
        />
      )}
    >
      <View style={styles.body}>
        <TextField
          label="Passphrase"
          value={passphrase}
          onChangeText={(text) => { setPassphrase(text); setError(null); }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          help={mode === 'backup' ? `At least ${MIN_PASSPHRASE_LENGTH} characters. There is no way to recover a forgotten passphrase.` : undefined}
          error={mode === 'restore' ? error : null}
          returnKeyType={mode === 'backup' ? 'next' : 'done'}
          onSubmitEditing={mode === 'restore' ? () => void submit() : undefined}
        />
        {mode === 'backup' ? (
          <TextField
            label="Confirm passphrase"
            value={confirm}
            onChangeText={(text) => { setConfirm(text); setError(null); }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
        ) : null}
        {mode === 'restore' ? (
          <View style={[styles.warning, { backgroundColor: theme.warningSoft }]}>
            <KeyRound size={16} color={theme.warning} strokeWidth={2} />
            <AppText variant="caption" tone="warning" style={styles.warningText}>{"Restoring replaces everything currently on this phone with the backup's records."}</AppText>
          </View>
        ) : null}
        {busy ? (
          <AppText variant="caption" tone="ink2">
            {step === 'encrypting' ? 'Encrypting…' : step === 'decrypting' ? 'Decrypting…' : step === 'sharing' ? 'Opening the share sheet…' : 'Working…'}
          </AppText>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
  },
  warningText: {
    flex: 1,
  },
});
