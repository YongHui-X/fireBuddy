import { getSafeExternalUrl, type EmberTopic } from './emberState';

export const EMBER_EDUCATIONAL_NOTICE =
  'Educational information only. Verify important decisions with official sources or a qualified financial professional.';

function escapeMarkdownLabel(value: string): string {
  return value.replace(/([\\[\]])/g, '\\$1');
}

function formatLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Format the complete, usable parts of one topic as portable Markdown. */
export function formatEmberConversationMarkdown(topic: EmberTopic, exportedAt = new Date()): string {
  const sections = topic.messages.flatMap((message) => {
    if (message.error || message.status !== 'complete' || !message.content.trim()) {
      return [];
    }

    const sourceLines = message.role === 'assistant'
      ? message.sources.flatMap((source) => {
          const safeUrl = getSafeExternalUrl(source.url);
          return safeUrl
            ? [`- [${escapeMarkdownLabel(source.title)}](${safeUrl})`]
            : [`- ${source.title}`];
        })
      : [];
    const sources = sourceLines.length > 0 ? `\n\nSources:\n${sourceLines.join('\n')}` : '';
    return [`## ${message.role === 'user' ? 'You' : 'Ember'}\n\n${message.content.trim()}${sources}`];
  });

  return [
    `# ${topic.title}`,
    `Exported from FireBuddy Ember on ${formatLocalDate(exportedAt)}.`,
    ...sections,
    `> ${EMBER_EDUCATIONAL_NOTICE}`,
    '',
  ].join('\n\n');
}

/** Build a filesystem-safe, predictable Markdown export name. */
export function getEmberExportFilename(topicTitle: string, exportedAt = new Date()): string {
  const slug = topicTitle
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-SG')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '') || 'conversation';
  return `firebuddy-ember-${slug}-${formatLocalDate(exportedAt)}.md`;
}
