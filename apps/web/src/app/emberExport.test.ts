import { describe, expect, it } from 'vitest';

import { formatEmberConversationMarkdown, getEmberExportFilename } from './emberExport';
import { createEmberMessage, type EmberTopic } from './emberState';

describe('Ember Markdown export', () => {
  it('includes ordered messages and safe citations while excluding errors and incomplete answers', () => {
    const topic: EmberTopic = {
      id: 'topic',
      title: 'CPF / FIRE plan',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      messages: [
        createEmberMessage('user', 'How does CPF support FIRE?'),
        createEmberMessage('assistant', 'CPF can support later retirement income.', {
          sources: [
            { title: 'CPF guide', url: 'https://cpf.gov.sg/guide' },
            { title: 'Unsafe source', url: 'javascript:alert(1)' },
          ],
          suggestedQuestions: ['Unused prompt'],
        }),
        createEmberMessage('assistant', 'Partial answer', { status: 'streaming' }),
        createEmberMessage('assistant', '', {
          error: { kind: 'unavailable', message: 'Error copy', retryable: true, retryOfMessageId: 'question' },
        }),
      ],
    };

    const markdown = formatEmberConversationMarkdown(topic, new Date('2026-09-03T08:00:00.000Z'));

    expect(markdown).toContain('# CPF / FIRE plan');
    expect(markdown.indexOf('## You')).toBeLessThan(markdown.indexOf('## Ember'));
    expect(markdown).toContain('[CPF guide](https://cpf.gov.sg/guide)');
    expect(markdown).toContain('- Unsafe source');
    expect(markdown).not.toContain('javascript:');
    expect(markdown).not.toContain('Partial answer');
    expect(markdown).not.toContain('Error copy');
    expect(markdown).not.toContain('Unused prompt');
    expect(markdown).toContain('Educational information only');
  });

  it('sanitizes the topic title in the dated filename', () => {
    expect(getEmberExportFilename('CPF / FIRE: 55%?', new Date('2026-09-03T00:00:00.000Z')))
      .toBe('firebuddy-ember-cpf-fire-55-2026-09-03.md');
  });
});
