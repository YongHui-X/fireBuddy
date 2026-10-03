import type { Account, Category, Tag, Transaction, TransactionExportFilters } from './types';

/** Column order of the portable CSV, identical to the authenticated backend export. */
export const transactionCsvColumns = [
  'Transaction ID', 'Date', 'Type', 'Description', 'Amount (SGD)',
  'Category', 'Category ID', 'Account', 'Account ID', 'Tags', 'Tag IDs',
  'Created At', 'Updated At',
] as const;

/** Prefix spreadsheet formula markers while leaving ordinary CSV text unchanged. */
function protectSpreadsheetText(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCsv(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Build the same CSV shape the backend export produces, from local typed transactions. */
export function buildTransactionCsv(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  accounts: readonly Account[],
  tags: readonly Tag[] = [],
) {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const tagsById = new Map(tags.map((tag) => [tag.id, tag.name]));
  const rows = [...transactions]
    .sort((left, right) => left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    .map((transaction) => {
      const orderedTags = transaction.tagIds
        .filter((tagId) => tagsById.has(tagId))
        .map((tagId) => ({ id: tagId, name: tagsById.get(tagId) ?? '' }))
        .sort((left, right) => left.name.localeCompare(right.name, 'en-SG', { sensitivity: 'base' }) || left.id.localeCompare(right.id));
      const magnitude = Math.abs(Number(transaction.amount)) || 0;
      return [
        transaction.id,
        transaction.date,
        transaction.transactionType,
        transaction.description,
        (transaction.transactionType === 'income' ? magnitude : -magnitude).toFixed(2),
        transaction.categoryId ? categoryNames.get(transaction.categoryId) ?? 'Uncategorised' : 'Uncategorised',
        transaction.categoryId ?? '',
        accountNames.get(transaction.accountId) ?? 'Unknown account',
        transaction.accountId,
        orderedTags.map((tag) => tag.name).join(' | '),
        orderedTags.map((tag) => tag.id).join(' | '),
        transaction.createdAt,
        transaction.updatedAt,
      ];
    });
  return `﻿${[[...transactionCsvColumns], ...rows]
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
