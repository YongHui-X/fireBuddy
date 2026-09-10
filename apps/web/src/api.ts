import {
  apiRoutes,
  type Account,
  type Category,
  type CreateAccountInput,
  type CreateCategoryInput,
  type CreateTransactionInput,
  type CreateWealthContributionInput,
  type CreateWealthPositionInput,
  type CreateWealthSnapshotInput,
  type FinancialSummary,
  type FireCalculationResult,
  type FireProfile,
  type FireScenarioRequest,
  type ParseInputRequest,
  type ParseInputResponse,
  type RagChatRequest,
  type RagChatResponse,
  type RagChatSource,
  type RagAnswerMode,
  type RagDataEvidence,
  type RagStreamStatus,
  type Transaction,
  type Tag,
  type CreateTagInput,
  type UpdateTagInput,
  type TransactionExportFilters,
  type UpdateCategoryInput,
  type UpdateAccountInput,
  type UpdateTransactionInput,
  type UpdateFireProfileInput,
  type UpdateWealthContributionInput,
  type UpdateWealthPositionInput,
  type UpdateWealthSnapshotInput,
  type WealthContribution,
  type WealthPosition,
  type WealthPositionSnapshot,
} from '@firebuddy/shared';
import { selectRecentChatHistory } from './app/chatHistory';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface RagStreamHandlers {
  onStatus: (status: RagStreamStatus, message: string) => void;
  onDelta: (text: string) => void;
  onSources: (sources: RagChatSource[]) => void;
  onEvidence?: (mode: RagAnswerMode, evidence: RagDataEvidence) => void;
  onDone?: () => void;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  /** Preserve the response status so feature UIs can offer precise recovery. */
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
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

export function getTransactions(token: string) {
  return request<Transaction[]>(apiRoutes.transactions, token);
}

export function getTags(token: string) {
  return request<Tag[]>(apiRoutes.tags, token);
}

export function createTag(token: string, input: CreateTagInput) {
  return request<Tag>(apiRoutes.tags, token, { method: 'POST', body: JSON.stringify(input) });
}

export function updateTag(token: string, id: string, input: UpdateTagInput) {
  return request<Tag>(`${apiRoutes.tags}/${id}`, token, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteTag(token: string, id: string) {
  return request<void>(`${apiRoutes.tags}/${id}?confirm=true`, token, { method: 'DELETE' });
}

/** Download an authenticated export while preserving the backend filename. */
export async function exportTransactions(token: string, filters: TransactionExportFilters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, String(value));
  });
  const response = await fetch(`${API_BASE_URL}${apiRoutes.transactionExport}${query.size ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/csv' },
  });
  if (!response.ok) throw await readApiError(response);
  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? 'firebuddy-transactions.csv';
  return { blob: await response.blob(), filename };
}

export function getAccounts(token: string) {
  return request<Account[]>(apiRoutes.accounts, token);
}

export function getWealthPositions(token: string) {
  return request<WealthPosition[]>(apiRoutes.wealthPositions, token);
}

export function createWealthPosition(token: string, input: CreateWealthPositionInput) {
  return request<WealthPosition>(apiRoutes.wealthPositions, token, { method: 'POST', body: JSON.stringify(input) });
}

export function updateWealthPosition(token: string, id: string, input: UpdateWealthPositionInput) {
  return request<WealthPosition>(`${apiRoutes.wealthPositions}/${id}`, token, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteWealthPosition(token: string, id: string) {
  return request<void>(`${apiRoutes.wealthPositions}/${id}`, token, { method: 'DELETE' });
}

export function getWealthSnapshots(token: string, positionId: string) {
  return request<WealthPositionSnapshot[]>(`${apiRoutes.wealthPositions}/${positionId}/snapshots`, token);
}

export function createWealthSnapshot(token: string, positionId: string, input: CreateWealthSnapshotInput) {
  return request<WealthPositionSnapshot>(`${apiRoutes.wealthPositions}/${positionId}/snapshots`, token, { method: 'POST', body: JSON.stringify(input) });
}

export function updateWealthSnapshot(token: string, positionId: string, snapshotId: string, input: UpdateWealthSnapshotInput) {
  return request<WealthPositionSnapshot>(`${apiRoutes.wealthPositions}/${positionId}/snapshots/${snapshotId}`, token, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteWealthSnapshot(token: string, positionId: string, snapshotId: string) {
  return request<void>(`${apiRoutes.wealthPositions}/${positionId}/snapshots/${snapshotId}`, token, { method: 'DELETE' });
}

export function getWealthContributions(token: string) {
  return request<WealthContribution[]>(apiRoutes.wealthContributions, token);
}

export function createWealthContribution(token: string, input: CreateWealthContributionInput) {
  return request<WealthContribution>(apiRoutes.wealthContributions, token, { method: 'POST', body: JSON.stringify(input) });
}

export function updateWealthContribution(token: string, id: string, input: UpdateWealthContributionInput) {
  return request<WealthContribution>(`${apiRoutes.wealthContributions}/${id}`, token, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteWealthContribution(token: string, id: string) {
  return request<void>(`${apiRoutes.wealthContributions}/${id}`, token, { method: 'DELETE' });
}

export function getFinancialSummary(token: string, asOf?: string) {
  const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : '';
  return request<FinancialSummary>(`${apiRoutes.financialSummary}${query}`, token);
}

export function getFireProfile(token: string) {
  return request<{ configured: boolean; profile: FireProfile | null }>(apiRoutes.fireProfile, token);
}

export function saveFireProfile(token: string, input: UpdateFireProfileInput) {
  return request<FireProfile>(apiRoutes.fireProfile, token, { method: 'PUT', body: JSON.stringify(input) });
}

export function getEssentialCategories(token: string) {
  return request<{ categoryIds: string[] }>(apiRoutes.fireEssentialCategories, token);
}

export function saveEssentialCategories(token: string, categoryIds: string[]) {
  return request<{ categoryIds: string[] }>(apiRoutes.fireEssentialCategories, token, { method: 'PUT', body: JSON.stringify({ categoryIds }) });
}

export function calculateFireScenario(token: string, input: FireScenarioRequest) {
  return request<FireCalculationResult>(apiRoutes.fireScenario, token, { method: 'POST', body: JSON.stringify(input) });
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
    } else if (eventName === 'evidence' && typeof data.mode === 'string' && data.dataEvidence) {
      handlers.onEvidence?.(data.mode as RagAnswerMode, data.dataEvidence as RagDataEvidence);
    } else if (eventName === 'sources' && Array.isArray(data.sources)) {
      handlers.onSources(data.sources as RagChatSource[]);
    } else if (eventName === 'done') {
      receivedDone = true;
      handlers.onDone?.();
    } else if (eventName === 'error') {
      throw new ApiRequestError(
        typeof data.message === 'string' ? data.message : 'Ember could not complete the answer.',
        typeof data.status === 'number' ? data.status : response.status || 503,
        typeof data.code === 'string' ? data.code : undefined,
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
