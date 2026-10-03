import { BACKUP_FORMAT, BackupError, decryptBackup, encryptBackup, parseBackupFile, validatePassphrase, type BackupPayload } from '@firebuddy/shared';
import * as Crypto from 'expo-crypto';
import { useCallback, useState } from 'react';

import { pickBackupFileText, shareBackupFile } from '@/lib/backup-file';
import { isStoredRecords, useFireBuddy } from '@/lib/fire-buddy-store';

export type BackupStep = 'idle' | 'encrypting' | 'sharing' | 'picking' | 'decrypting';

/**
 * Encrypted backup and restore of everything on this phone. The passphrase never leaves the
 * device and is not stored; a lost passphrase means a lost backup by design.
 */
export function useBackup() {
  const { exportRecords, replaceRecords, notify } = useFireBuddy();
  const [step, setStep] = useState<BackupStep>('idle');

  const createBackup = useCallback(async (passphrase: string): Promise<string | null> => {
    const problem = validatePassphrase(passphrase);
    if (problem) return problem;
    setStep('encrypting');
    try {
      const payload: BackupPayload = { format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), app: 'mobile', records: { ...exportRecords() } };
      const encrypted = await encryptBackup(payload, passphrase, (length) => Crypto.getRandomValues(new Uint8Array(length)));
      setStep('sharing');
      const shared = await shareBackupFile(encrypted);
      if (!shared) return 'Sharing is not available on this device.';
      notify('Backup saved. Keep the passphrase somewhere safe.');
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to create the backup.';
    } finally {
      setStep('idle');
    }
  }, [exportRecords, notify]);

  /** Opens the picker first; returns the file text for the passphrase step, or null when cancelled. */
  const pickBackup = useCallback(async (): Promise<{ text: string } | { error: string } | null> => {
    setStep('picking');
    try {
      const text = await pickBackupFileText();
      if (text === null) return null;
      parseBackupFile(text);
      return { text };
    } catch (error) {
      return { error: error instanceof BackupError ? error.message : 'Unable to read that file.' };
    } finally {
      setStep('idle');
    }
  }, []);

  const restoreBackup = useCallback(async (fileText: string, passphrase: string): Promise<string | null> => {
    setStep('decrypting');
    try {
      const payload = await decryptBackup(parseBackupFile(fileText), passphrase);
      if (!isStoredRecords(payload.records)) return 'This backup holds no FireBuddy records.';
      await replaceRecords(payload.records);
      notify('Backup restored.');
      return null;
    } catch (error) {
      return error instanceof BackupError ? error.message : 'Unable to restore the backup.';
    } finally {
      setStep('idle');
    }
  }, [replaceRecords, notify]);

  return { step, createBackup, pickBackup, restoreBackup };
}
