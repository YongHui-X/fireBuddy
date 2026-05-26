export type UUID = string;

export interface Profile {
  id: UUID;
  email: string;
  createdAt: string;
}

export interface Category {
  id: UUID;
  userId: UUID | null;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Expense {
  id: UUID;
  userId: UUID;
  categoryId: UUID | null;
  description: string;
  amount: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  categoryId: UUID | null;
  description: string;
  amount: string;
  date: string;
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

export interface RagChatResponse {
  answer: string;
  sources: string[];
}
