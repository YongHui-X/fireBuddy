import { BACKUP_FILE_EXTENSION, getBackupFilename, type EncryptedBackupFile } from '@firebuddy/shared';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Where an encrypted backup goes and comes from on the phone: the system share sheet (so the
 * person chooses iCloud Drive, Google Drive, Files or a message to themselves) and the document
 * picker. FireBuddy never uploads the file anywhere itself.
 */

export async function shareBackupFile(encrypted: EncryptedBackupFile) {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, getBackupFilename());
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(encrypted));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your FireBuddy backup', UTI: 'public.json' });
  return true;
}

/** Let the person pick a backup file; returns its text, or null when they cancel. */
export async function pickBackupFileText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.[0]) return null;
  const file = new File(result.assets[0].uri);
  return file.text();
}

/**
 * Delete the backup copies FireBuddy left in its own temporary folder: the file made for the
 * share sheet, and files the document picker copied in for a restore. Copies the person saved
 * elsewhere (Drive, Files, a message) are theirs and are not touched. Used by "Start fresh".
 */
export function clearBackupCache() {
  const isBackup = (name: string) => name.startsWith('firebuddy-backup') || name.endsWith(`.${BACKUP_FILE_EXTENSION}`);
  const sweep = (directory: Directory, depth: number) => {
    for (const entry of directory.list()) {
      if (entry instanceof File) {
        if (isBackup(entry.name)) entry.delete();
      } else if (depth > 0) {
        sweep(entry, depth - 1);
      }
    }
  };
  try {
    // The picker copies into a subfolder of the cache, so look one level down as well.
    sweep(new Directory(Paths.cache), 2);
  } catch {
    // Nothing to clear, or the cache is unavailable (for example in the web preview).
  }
}
