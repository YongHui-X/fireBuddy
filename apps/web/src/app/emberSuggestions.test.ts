import { describe, expect, it } from 'vitest';

import { createEmberMessage } from './emberState';
import { EMBER_STARTER_QUESTIONS, getEmberSuggestedQuestions } from './emberSuggestions';

describe('Ember suggested questions', () => {
  it('matches the current topic and returns no more than three questions', () => {
    const suggestions = getEmberSuggestedQuestions({
      question: 'How do CPF contribution rates work by age?',
      history: [],
      sources: [],
    });

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toContain('allocated');
    expect(suggestions[1]).toContain('contribution limits');
  });

  it('uses citation metadata when the question itself has no topic keywords', () => {
    const suggestions = getEmberSuggestedQuestions({
      question: 'What should I know next?',
      history: [],
      sources: [{ title: 'CPF LIFE and retirement sums', headline: 'Choosing BRS, FRS, or ERS' }],
    });

    expect(suggestions[0]).toContain('CPF LIFE payouts');
  });

  it('filters questions already asked in the topic', () => {
    const asked = 'How do SSB interest steps and early redemption work?';
    const suggestions = getEmberSuggestedQuestions({
      question: 'Explain Singapore Savings Bonds',
      history: [createEmberMessage('user', asked)],
      sources: [],
    });

    expect(suggestions).not.toContain(asked);
    expect(suggestions[0]).toContain('fixed deposits');
  });

  it('falls back to starter prompts for an unmatched topic', () => {
    const suggestions = getEmberSuggestedQuestions({ question: 'Where should I begin?', history: [], sources: [] });

    expect(suggestions).toEqual(EMBER_STARTER_QUESTIONS.slice(0, 3));
  });
});
