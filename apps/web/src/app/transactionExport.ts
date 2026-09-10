import type { TransactionExportFilters } from '@firebuddy/shared';

import type { Account, Category, Tag, Transaction } from './FireBuddyProvider';

export const transactionCsvColumns = [
  'Transaction ID', 'Date', 'Type', 'Description', 'Amount (SGD)',
  'Category', 'Category ID', 'Account', 'Account ID', 'Tags', 'Tag IDs',
  'Created At', 'Updated At',
];

/** Prefix spreadsheet formula markers while leaving ordinary CSV text unchanged. */
function protectSpreadsheetText(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCsv(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Apply the backend export semantics to local demo transactions. */
export function filterLocalExportTransactions(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  filters: TransactionExportFilters,
) {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const search = filters.search?.trim().toLocaleLowerCase() ?? '';
  return transactions.filter((transaction) => {
    if (filters.startDate && transaction.date < filters.startDate) return false;
    if (filters.endDate && transaction.date > filters.endDate) return false;
    if (filters.transactionType && transaction.transactionType !== filters.transactionType) return false;
    if (filters.categoryId && transaction.category !== filters.categoryId) return false;
    if (filters.accountId && transaction.account !== filters.accountId) return false;
    if (filters.tagId && !(transaction.tagIds ?? []).includes(filters.tagId)) return false;
    if (search && ![
      transaction.description,
      categoryNames.get(transaction.category) ?? 'Uncategorised',
      accountNames.get(transaction.account) ?? 'Unknown account',
    ].some((value) => value.toLocaleLowerCase().includes(search))) return false;
    return true;
  });
}

/** Build the same portable CSV shape used by the authenticated backend export. */
export function buildTransactionCsv(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  tags: Tag[],
) {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const tagsById = new Map(tags.map((tag) => [tag.id, tag.name]));
  const rows = [...transactions]
    .sort((left, right) => left.date.localeCompare(right.date) || (left.createdAt ?? '').localeCompare(right.createdAt ?? '') || left.id.localeCompare(right.id))
    .map((transaction) => {
      const orderedTags = (transaction.tagIds ?? [])
        .filter((tagId) => tagsById.has(tagId))
        .map((tagId) => ({ id: tagId, name: tagsById.get(tagId) ?? '' }))
        .sort((left, right) => left.name.localeCompare(right.name, 'en-SG', { sensitivity: 'base' }) || left.id.localeCompare(right.id));
      return [
        transaction.id,
        transaction.date,
        transaction.transactionType,
        transaction.description,
        (transaction.transactionType === 'income' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount)).toFixed(2),
        categoryNames.get(transaction.category) ?? 'Uncategorised',
        transaction.category || '',
        accountNames.get(transaction.account) ?? 'Unknown account',
        transaction.account,
        orderedTags.map((tag) => tag.name).join(' | '),
        orderedTags.map((tag) => tag.id).join(' | '),
        transaction.createdAt ?? '',
        transaction.updatedAt ?? '',
      ];
    });
  return `\uFEFF${[transactionCsvColumns, ...rows]
    .map((row) => row.map((value, index) => escapeCsv(index === 4 ? value : protectSpreadsheetText(value))).join(','))
    .join('\r\n')}\r\n`;
}

export function getTransactionExportFilename(filters: TransactionExportFilters = {}, now = new Date()) {
  const exportedDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const range = filters.startDate || filters.endDate
    ? `-${filters.startDate ?? 'start'}-to-${filters.endDate ?? 'present'}`
    : '';
  return `firebuddy-transactions${range}-${exportedDate}.csv`;
}

/** Trigger a browser download and release its temporary object URL. */
export function downloadCsvBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
