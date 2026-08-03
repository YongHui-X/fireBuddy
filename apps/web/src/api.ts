import {
  apiRoutes,
  type Category,
  type CreateCategoryInput,
  type CreateExpenseInput,
  type Expense,
  type UpdateCategoryInput,
  type UpdateExpenseInput,
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
    let errorMessage = message || `Request failed with ${response.status}`;

    try {
      const parsed = JSON.parse(message) as { detail?: unknown };
      if (typeof parsed.detail === 'string') {
        errorMessage = parsed.detail;
      }
    } catch {
      // Keep the raw message when the response is not JSON.
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
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

export function updateExpense(token: string, id: string, input: UpdateExpenseInput) {
  return request<Expense>(`${apiRoutes.expenses}/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteExpense(token: string, id: string) {
  return request<void>(`${apiRoutes.expenses}/${id}`, token, {
    method: 'DELETE',
  });
}

export function createCategory(token: string, input: CreateCategoryInput) {
  return request<Category>(apiRoutes.categories, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCategory(token: string, id: string, input: UpdateCategoryInput) {
  return request<Category>(`${apiRoutes.categories}/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteCategory(token: string, id: string) {
  return request<void>(`${apiRoutes.categories}/${id}`, token, {
    method: 'DELETE',
  });
}
