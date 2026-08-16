import type { RagChatMessage } from '@firebuddy/shared';


export const MAX_ADVISOR_HISTORY_MESSAGES = 6;

/** Selects the recent normalized messages sent to the financial advisor. */
export function selectRecentChatHistory(
  messages: readonly RagChatMessage[],
): RagChatMessage[] {
  return messages
    .map((message) => ({
      ...message,
      content: message.content.replace(/\s+/g, ' ').trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_ADVISOR_HISTORY_MESSAGES);
}
