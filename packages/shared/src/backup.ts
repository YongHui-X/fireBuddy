import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils';
import { scryptAsync } from '@noble/hashes/scrypt';

/**
 * Passphrase-encrypted backup file shared by the phone and (later) the web app.
 *
 * The file is self-describing: key derivation parameters and the random salt and
 * nonce travel with the ciphertext, so a backup made today can be restored by a
 * future version. Losing the passphrase makes the file unreadable by design; there
 * is no server-side escrow.
 */

export const BACKUP_FORMAT = 'firebuddy-backup/1';
export const BACKUP_FILE_EXTENSION = 'fbbackup';

/** scrypt cost that stays under about a second of pure JavaScript on a mid-range phone. */
export const BACKUP_KDF = { name: 'scrypt', N: 2 ** 14, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 24;
export const MIN_PASSPHRASE_LENGTH = 8;

export interface EncryptedBackupFile {
  format: typeof BACKUP_FORMAT;
  createdAt: string;
  kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string };
  cipher: 'xchacha20poly1305';
  nonce: string;
  ciphertext: string;
}

/** Everything a device keeps for one person. Kept as a loose record so older files still parse. */
export interface BackupPayload {
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  app: 'mobile' | 'web';
  records: Record<string, unknown>;
}

export type RandomBytes = (length: number) => Uint8Array;

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Standard base64 without relying on `btoa`, which not every JavaScript engine provides. */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += BASE64[(triple >> 18) & 63] + BASE64[(triple >> 12) & 63]
      + (b === undefined ? '=' : BASE64[(triple >> 6) & 63])
      + (c === undefined ? '=' : BASE64[triple & 63]);
  }
  return out;
}

export function base64ToBytes(text: string): Uint8Array {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let position = 0;
  for (const char of clean) {
    buffer = (buffer << 6) | BASE64.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[position++] = (buffer >> bits) & 255;
    }
  }
  return out.subarray(0, position);
}

async function deriveKey(passphrase: string, salt: Uint8Array, kdf: EncryptedBackupFile['kdf'] | typeof BACKUP_KDF) {
  return scryptAsync(utf8ToBytes(passphrase.normalize('NFKC')), salt, { N: kdf.N, r: kdf.r, p: kdf.p, dkLen: KEY_LENGTH });
}

export function validatePassphrase(passphrase: string): string | null {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) return `Use at least ${MIN_PASSPHRASE_LENGTH} characters.`;
  return null;
}

/** Encrypt a payload with a passphrase. `randomBytes` must come from the platform's CSPRNG. */
export async function encryptBackup(payload: BackupPayload, passphrase: string, randomBytes: RandomBytes): Promise<EncryptedBackupFile> {
  const salt = randomBytes(SALT_LENGTH);
  const nonce = randomBytes(NONCE_LENGTH);
  const key = await deriveKey(passphrase, salt, BACKUP_KDF);
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(utf8ToBytes(JSON.stringify(payload)));
  return {
    format: BACKUP_FORMAT,
    createdAt: new Date().toISOString(),
    kdf: { ...BACKUP_KDF, salt: bytesToBase64(salt) },
    cipher: 'xchacha20poly1305',
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(ciphertext),
  };
}

export class BackupError extends Error {
  constructor(message: string, readonly reason: 'format' | 'passphrase') {
    super(message);
    this.name = 'BackupError';
  }
}

/** Parse a backup file's text. Throws `BackupError('format')` for anything that is not one of ours. */
export function parseBackupFile(text: string): EncryptedBackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('This is not a FireBuddy backup file.', 'format');
  }
  const file = parsed as Partial<EncryptedBackupFile>;
  if (
    !file || file.format !== BACKUP_FORMAT || file.cipher !== 'xchacha20poly1305'
    || !file.kdf || file.kdf.name !== 'scrypt' || typeof file.kdf.salt !== 'string'
    || typeof file.nonce !== 'string' || typeof file.ciphertext !== 'string'
  ) {
    throw new BackupError('This is not a FireBuddy backup file.', 'format');
  }
  return file as EncryptedBackupFile;
}

/** Decrypt a parsed file. A wrong passphrase fails authentication and throws `BackupError('passphrase')`. */
export async function decryptBackup(file: EncryptedBackupFile, passphrase: string): Promise<BackupPayload> {
  const key = await deriveKey(passphrase, base64ToBytes(file.kdf.salt), file.kdf);
  let plain: Uint8Array;
  try {
    plain = xchacha20poly1305(key, base64ToBytes(file.nonce)).decrypt(base64ToBytes(file.ciphertext));
  } catch {
    throw new BackupError('That passphrase did not open this backup.', 'passphrase');
  }
  const payload = JSON.parse(bytesToUtf8(plain)) as BackupPayload;
  if (payload.format !== BACKUP_FORMAT || typeof payload.records !== 'object' || payload.records === null) {
    throw new BackupError('This backup holds no FireBuddy records.', 'format');
  }
  return payload;
}

export function getBackupFilename(now = new Date()) {
  const stamp = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  return `firebuddy-backup-${stamp}.${BACKUP_FILE_EXTENSION}`;
}
