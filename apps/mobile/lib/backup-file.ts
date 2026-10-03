import { getBackupFilename, type EncryptedBackupFile } from '@firebuddy/shared';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
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
