import { buildTransactionCsv, getTransactionExportFilename, type Account, type Category, type Tag, type Transaction, type TransactionExportFilters } from '@firebuddy/shared';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Write the portable CSV to the cache directory and hand it to the system share sheet, the phone
 * equivalent of the web download. Returns false when the platform offers no share target.
 */
export async function shareTransactionsCsv(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  accounts: readonly Account[],
  tags: readonly Tag[],
  filters: TransactionExportFilters = {},
) {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, getTransactionExportFilename(filters));
  if (file.exists) file.delete();
  file.create();
  file.write(buildTransactionCsv(transactions, categories, accounts, tags));
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export transactions', UTI: 'public.comma-separated-values-text' });
  return true;
}
