export type UUID = string;
export type TransactionType = 'expense' | 'income';
export type CategoryType = TransactionType;

export interface Profile {
  id: UUID;
  email: string;
  createdAt: string;
}

export interface Category {
  id: UUID;
  userId: UUID | null;
  name: string;
  icon: string;
  color: string;
  monthlyBudget: string;
  categoryType: CategoryType;
  isDefault: boolean;
  createdAt: string;
}

export interface Expense {
  id: UUID;
  userId: UUID;
  categoryId: UUID | null;
  accountId: UUID;
  description: string;
  amount: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  categoryId: UUID | null;
  accountId: UUID;
  description: string;
  amount: string;
  date: string;
}

export interface Transaction {
  id: UUID;
  userId: UUID;
  categoryId: UUID | null;
  accountId: UUID;
  description: string;
  amount: string;
  date: string;
  transactionType: TransactionType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionInput {
  categoryId: UUID | null;
  accountId: UUID;
  description: string;
  amount: string;
  date: string;
  transactionType: TransactionType;
}

export interface UpdateTransactionInput {
  categoryId?: UUID | null;
  accountId?: UUID;
  description?: string;
  amount?: string;
  date?: string;
  transactionType?: TransactionType;
}

export interface UpdateExpenseInput {
  categoryId?: UUID | null;
  accountId?: UUID;
  description?: string;
  amount?: string;
  date?: string;
}

export type AccountType = 'bank' | 'credit_card' | 'debit_card' | 'cash' | 'ewallet';

export interface Account {
  id: UUID;
  userId: UUID;
  name: string;
  type: AccountType;
  color: string;
  lastFour: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  color: string;
  lastFour?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  color?: string;
  lastFour?: string | null;
}

export interface ParseInputRequest {
  description: string;
}

export interface ParseInputResponse {
  categoryId: UUID | null;
  categoryName: string | null;
  confidence: 'low' | 'medium' | 'high';
  reason?: string | null;
}

export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
  monthlyBudget: string;
  categoryType: CategoryType;
}

export interface UpdateCategoryInput {
  name: string;
  icon: string;
  color: string;
  monthlyBudget: string;
  categoryType: CategoryType;
}

export type RagChatRole = 'user' | 'assistant';

export interface RagChatMessage {
  role: RagChatRole;
  content: string;
}

export interface RagChatRequest {
  question: string;
  history: RagChatMessage[];
}

export interface RagChatSource {
  title: string | null;
  url: string | null;
  path: string | null;
  headline: string | null;
}

export interface RagChatResponse {
  answer: string;
  sources: string[];
  sourceDetails?: RagChatSource[];
  source_details?: RagChatSource[];
}

export type RagStreamStatus = 'searching' | 'preparing';

export type RagStreamEvent =
  | { type: 'status'; status: RagStreamStatus; message: string }
  | { type: 'delta'; text: string }
  | { type: 'sources'; sources: RagChatSource[] }
  | { type: 'done' }
  | { type: 'error'; code: string; message: string; retryable: boolean; status?: number };
