import {
  apiRoutes,
  type Account,
  type Category,
  type CreateAccountInput,
  type CreateCategoryInput,
  type CreateExpenseInput,
  type CreateTransactionInput,
  type Expense,
  type ParseInputRequest,
  type ParseInputResponse,
  type RagChatRequest,
  type RagChatResponse,
  type RagChatSource,
  type RagStreamStatus,
  type Transaction,
  type UpdateCategoryInput,
  type UpdateAccountInput,
  type UpdateExpenseInput,
  type UpdateTransactionInput,
} from '@firebuddy/shared';
import { selectRecentChatHistory } from './app/chatHistory';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface RagStreamHandlers {
  onStatus: (status: RagStreamStatus, message: string) => void;
  onDelta: (text: string) => void;
  onSources: (sources: RagChatSource[]) => void;
  onDone?: () => void;
}

export class ApiRequestError extends Error {
  readonly status: number;

  /** Preserve the response status so feature UIs can offer precise recovery. */
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

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

    throw new ApiRequestError(errorMessage, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** Read one fetch error without leaking an opaque JSON response into the UI. */
async function readApiError(response: Response): Promise<ApiRequestError> {
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

  return new ApiRequestError(errorMessage, response.status);
}

export function getCategories(token: string) {
  return request<Category[]>(apiRoutes.categories, token);
}

export function getExpenses(token: string) {
  return request<Expense[]>(apiRoutes.expenses, token);
}

export function getTransactions(token: string) {
  return request<Transaction[]>(apiRoutes.transactions, token);
}

export function getAccounts(token: string) {
  return request<Account[]>(apiRoutes.accounts, token);
}

export function createAccount(token: string, input: CreateAccountInput) {
  return request<Account>(apiRoutes.accounts, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAccount(token: string, id: string, input: UpdateAccountInput) {
  return request<Account>(`${apiRoutes.accounts}/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteAccount(token: string, id: string) {
  return request<void>(`${apiRoutes.accounts}/${id}`, token, {
    method: 'DELETE',
  });
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

export function createTransaction(token: string, input: CreateTransactionInput) {
  return request<Transaction>(apiRoutes.transactions, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTransaction(token: string, id: string, input: UpdateTransactionInput) {
  return request<Transaction>(`${apiRoutes.transactions}/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteTransaction(token: string, id: string) {
  return request<void>(`${apiRoutes.transactions}/${id}`, token, {
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

export function askFinancialAdvisor(token: string, input: RagChatRequest) {
  return request<RagChatResponse>(apiRoutes.financialAdvisorChat, token, {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      history: selectRecentChatHistory(input.history),
    }),
  });
}

/** Read FireBuddy's fetch-based SSE response while retaining bearer-token authentication. */
export async function streamFinancialAdvisor(
  token: string,
  input: RagChatRequest,
  handlers: RagStreamHandlers,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${apiRoutes.financialAdvisorChatStream}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...input,
      history: selectRecentChatHistory(input.history),
    }),
  });
  const isEventStream = response.headers.get('content-type')?.includes('text/event-stream') ?? false;

  if (!response.body || !isEventStream) {
    if (!response.ok) {
      throw await readApiError(response);
    }
    throw new ApiRequestError('Ember returned an unreadable stream.', 503);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedDone = false;

  /** Dispatch one complete SSE block to the matching stream-state callback. */
  function dispatchEvent(block: string) {
    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length === 0) {
      return;
    }

    const data = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
    if (eventName === 'status' && (data.status === 'searching' || data.status === 'preparing')) {
      handlers.onStatus(data.status, typeof data.message === 'string' ? data.message : 'Working');
    } else if (eventName === 'delta' && typeof data.text === 'string') {
      handlers.onDelta(data.text);
    } else if (eventName === 'sources' && Array.isArray(data.sources)) {
      handlers.onSources(data.sources as RagChatSource[]);
    } else if (eventName === 'done') {
      receivedDone = true;
      handlers.onDone?.();
    } else if (eventName === 'error') {
      throw new ApiRequestError(
        typeof data.message === 'string' ? data.message : 'Ember could not complete the answer.',
        typeof data.status === 'number' ? data.status : response.status || 503,
      );
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? '';
    blocks.forEach(dispatchEvent);

    if (done) {
      if (buffer.trim()) {
        dispatchEvent(buffer);
      }
      break;
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(`Ember request failed with ${response.status}.`, response.status);
  }
  if (!receivedDone) {
    throw new ApiRequestError('Ember stopped before completing the answer.', 503);
  }
}

export function suggestExpenseCategory(token: string, input: ParseInputRequest) {
  return request<ParseInputResponse>(apiRoutes.parseInput, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
