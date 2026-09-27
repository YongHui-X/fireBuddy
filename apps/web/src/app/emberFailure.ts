import { ApiRequestError } from '../api';
import type { EmberMessageError } from './emberState';

/** Turn API and session failures into concise Ember-facing recovery guidance. */
export function classifyEmberFailure(error: unknown): Pick<EmberMessageError, 'kind' | 'message' | 'retryable'> {
  if (error instanceof ApiRequestError && error.code === 'knowledge_base_unavailable') {
    return { kind: 'unavailable', message: 'Ember’s curated sources are temporarily unavailable. Please try again later.', retryable: true };
  }
  if (error instanceof ApiRequestError && error.status === 401) {
    return { kind: 'authentication', message: 'Your session is no longer available. Sign in again, then retry this question.', retryable: true };
  }
  if (error instanceof ApiRequestError && error.status === 429) {
    return { kind: 'rate_limit', message: 'Ember has reached the request limit. Wait a moment, then try again.', retryable: true };
  }
  if (error instanceof ApiRequestError && error.status === 503) {
    return { kind: 'unavailable', message: 'Ember is temporarily unavailable. Your question is saved here so you can retry.', retryable: true };
  }
  if (error instanceof ApiRequestError && error.status === 204) {
    return { kind: 'empty_response', message: 'Ember returned an empty answer. Please retry this question.', retryable: true };
  }
  if (error instanceof ApiRequestError && error.status === 502) {
    return { kind: 'retrieval', message: 'Ember could not search the curated sources. Please retry this question.', retryable: true };
  }

  return { kind: 'unknown', message: 'Ember could not answer right now. Your question is saved here so you can retry.', retryable: true };
}
