import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT, BackupError, base64ToBytes, bytesToBase64, decryptBackup,
  encryptBackup, getBackupFilename, parseBackupFile, validatePassphrase, type BackupPayload,
} from '@firebuddy/shared';

describe('shared encrypted backup', () => {
  it('encrypts and decrypts a payload', async () => {
    const payload: BackupPayload = { format: BACKUP_FORMAT, exportedAt: '2026-10-03T00:00:00Z', app: 'web', records: { accounts: [{ name: 'Cash' }] } };
    const file = await encryptBackup(payload, 'long passphrase', (length) => Uint8Array.from({ length }, (_, index) => index));
    expect(await decryptBackup(file, 'long passphrase')).toEqual(payload);
  });

  it('rejects a wrong passphrase with the passphrase reason', async () => {
    const payload: BackupPayload = { format: BACKUP_FORMAT, exportedAt: '2026-10-03T00:00:00Z', app: 'web', records: {} };
    const file = await encryptBackup(payload, 'correct passphrase', (length) => Uint8Array.from({ length }, (_, index) => index));
    await expect(decryptBackup(file, 'wrong passphrase')).rejects.toMatchObject({ name: 'BackupError', reason: 'passphrase' });
  });

  it.each(['not JSON', '{"format":"another-backup/1"}'])('rejects invalid file %s', (text) => {
    try {
      parseBackupFile(text);
      throw new Error('Expected a BackupError');
    } catch (error) {
      expect(error).toBeInstanceOf(BackupError);
      expect((error as BackupError).reason).toBe('format');
    }
  });

  it.each([0, 1, 2, 3, 4, 5])('round trips %i bytes through base64', (length) => {
    const bytes = Uint8Array.from({ length }, (_, index) => index + 1);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('formats the filename and validates short passphrases', () => {
    expect(getBackupFilename(new Date(2026, 9, 3))).toBe('firebuddy-backup-2026-10-03.fbbackup');
    expect(validatePassphrase('short')).toBeTruthy();
    expect(validatePassphrase('long enough')).toBeNull();
  });
});
