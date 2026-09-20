/**
 * Render Ember answers as plain paragraphs and bullet points.
 *
 * The backend asks the model for plain bullets, but models still emit
 * Markdown from time to time. This parser keeps the safe subset (headings,
 * bullets, paragraphs), strips inline emphasis markers instead of rendering
 * them, treats numbered items as plain bullets, and keeps list items that
 * are separated by blank lines in one list so numbering never restarts.
 * Raw HTML is rendered as text, never evaluated.
 */

export type RichTextBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

const HEADING = /^(#{1,3})\s+(.+)$/;
const BULLET_ITEM = /^(?:[-*•]|\d+[.)])\s+(.+)$/;

/** Remove bold, italic, and code markers while keeping their text. */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1$2')
    .replace(/(^|[^_\w])_(?!\s)([^_]+?)_(?!\w)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*/g, '')
    .trim();
}

/** Parse a small, safe subset of answer formatting without evaluating HTML. */
export function parseRichText(content: string): RichTextBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: RichTextBlock[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', text: stripInlineMarkdown(paragraphLines.join(' ')) });
      paragraphLines = [];
    }
  }

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      index += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', level: heading[1].length, text: stripInlineMarkdown(heading[2]) });
      index += 1;
      continue;
    }

    if (BULLET_ITEM.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        if (!current) {
          // A single blank line between items keeps the same list together.
          const next = lines[index + 1]?.trim() ?? '';
          if (BULLET_ITEM.test(next)) {
            index += 1;
            continue;
          }
          break;
        }
        const match = BULLET_ITEM.exec(current);
        if (!match) {
          // A wrapped continuation line belongs to the previous item.
          if (items.length > 0 && !HEADING.test(current)) {
            items[items.length - 1] = `${items[items.length - 1]} ${stripInlineMarkdown(current)}`;
            index += 1;
            continue;
          }
          break;
        }
        items.push(stripInlineMarkdown(match[1]));
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    paragraphLines.push(line);
    index += 1;
  }

  flushParagraph();
  return blocks;
}

/** Render headings, paragraphs, and bullet lists as React text nodes so raw HTML stays inert. */
export function EmberRichText({ content }: { content: string }) {
  return (
    <div className="ember-rich-text">
      {parseRichText(content).map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          const Heading = `h${Math.min(block.level + 2, 5)}` as 'h3' | 'h4' | 'h5';
          return <Heading key={key}>{block.text}</Heading>;
        }
        if (block.type === 'list') {
          return <ul key={key}>{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul>;
        }
        return <p key={key}>{block.text}</p>;
      })}
    </div>
  );
}
