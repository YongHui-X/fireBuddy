import {
  apiRoutes,
  type Category,
  type CreateExpenseInput,
  type Expense,
} from '@firebuddy/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getCategories(token: string) {
  return request<Category[]>(apiRoutes.categories, token);
}

export function getExpenses(token: string) {
  return request<Expense[]>(apiRoutes.expenses, token);
}

export function createExpense(token: string, input: CreateExpenseInput) {
  return request<Expense>(apiRoutes.expenses, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
