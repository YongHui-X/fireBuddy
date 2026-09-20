import { describe, expect, it } from 'vitest';

import { parseRichText, stripInlineMarkdown } from './emberRichText';

describe('Ember rich text parsing', () => {
  it('strips bold, italic, and code markers but keeps the words', () => {
    expect(stripInlineMarkdown('**Housing**: At S$1,650.00, this is your *largest* expense `now`.'))
      .toBe('Housing: At S$1,650.00, this is your largest expense now.');
    expect(stripInlineMarkdown('2 * 3 = 6')).toBe('2 * 3 = 6');
  });

  it('keeps numbered items separated by blank lines in one bullet list', () => {
    const blocks = parseRichText([
      '1. **Housing**: At S$1,650.00, this is your largest expense.',
      '',
      '2. **Food & Drink**: You are spending S$605.75.',
      '',
      '3. **Bills & Utilities**: With S$178.60 spent, review your bills.',
      '',
      'Consider the recommended action.',
    ].join('\n'));

    expect(blocks).toEqual([
      {
        type: 'list',
        items: [
          'Housing: At S$1,650.00, this is your largest expense.',
          'Food & Drink: You are spending S$605.75.',
          'Bills & Utilities: With S$178.60 spent, review your bills.',
        ],
      },
      { type: 'paragraph', text: 'Consider the recommended action.' },
    ]);
  });

  it('attaches wrapped continuation lines to the previous bullet', () => {
    const blocks = parseRichText('- First point\n  continues here\n- Second point');

    expect(blocks).toEqual([{ type: 'list', items: ['First point continues here', 'Second point'] }]);
  });

  it('keeps headings and treats raw HTML as text', () => {
    const blocks = parseRichText('# CPF overview\n\n<script>unsafe()</script>');

    expect(blocks).toEqual([
      { type: 'heading', level: 1, text: 'CPF overview' },
      { type: 'paragraph', text: '<script>unsafe()</script>' },
    ]);
  });
});
