import { describe, expect, it } from 'vitest';
import { avoidOrphan } from '@firebuddy/shared';

describe('avoidOrphan', () => {
  it('joins the last two words of a normal sentence with a no-break space', () => {
    expect(avoidOrphan('We can carry on as we go.')).toBe('We can carry on as we\u00a0go.');
  });

  it('leaves text under three words unchanged', () => {
    expect(avoidOrphan('Hello world')).toBe('Hello world');
  });

  it('leaves an empty string unchanged', () => {
    expect(avoidOrphan('')).toBe('');
  });

  it('leaves a final pair longer than 18 characters unchanged', () => {
    const text = 'Keep this extraordinarilylongword';
    expect(avoidOrphan(text)).toBe(text);
  });

  it('only changes the last line of multi-line text', () => {
    expect(avoidOrphan('First line stays exactly\nthen we go.')).toBe('First line stays exactly\nthen we\u00a0go.');
  });

  it('keeps trailing punctuation on the final word', () => {
    expect(avoidOrphan('Ready set go!')).toBe('Ready set\u00a0go!');
  });

  it('handles multiple spaces before the last word', () => {
    expect(avoidOrphan('Keep these words   together.')).toBe('Keep these words\u00a0together.');
  });

  it('changes nothing except the final word separator', () => {
    const text = 'Keep  every other   part exactly as we go.';
    expect(avoidOrphan(text)).toBe('Keep  every other   part exactly as we\u00a0go.');
  });
});
