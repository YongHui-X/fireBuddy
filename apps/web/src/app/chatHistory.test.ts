import { describe, expect, it } from 'vitest';

import { MAX_ADVISOR_HISTORY_MESSAGES, selectRecentChatHistory } from './chatHistory';


describe('selectRecentChatHistory', () => {
  it('normalizes and returns the latest six nonblank messages without mutating input', () => {
    const messages = [
      { role: 'assistant' as const, content: ' oldest ' },
      { role: 'user' as const, content: '   ' },
      ...Array.from({ length: 7 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: ` message\n ${index + 1} `,
      })),
    ];

    const selected = selectRecentChatHistory(messages);

    expect(selected).toHaveLength(MAX_ADVISOR_HISTORY_MESSAGES);
    expect(selected[0].content).toBe('message 2');
    expect(selected[5].content).toBe('message 7');
    expect(messages[0].content).toBe(' oldest ');
    expect(messages).toHaveLength(9);
  });
});
