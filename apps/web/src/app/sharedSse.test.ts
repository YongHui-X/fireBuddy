import { describe, expect, it } from 'vitest';
import { createSseParser, parseSseBlock } from '@firebuddy/shared';

describe('shared SSE parser', () => {
  it('dispatches a complete delta block', () => {
    const events: unknown[] = [];
    createSseParser((event) => events.push(event)).push('event: delta\ndata: {"text":"Hi"}\n\n');
    expect(events).toEqual([{ event: 'delta', data: { text: 'Hi' } }]);
  });

  it('waits for a terminator when a block is split across pushes', () => {
    const events: unknown[] = [];
    const parser = createSseParser((event) => events.push(event));
    parser.push('event: delta\ndata: {"te');
    parser.push('xt":"Hi"}\n');
    expect(events).toEqual([]);
    parser.push('\n');
    expect(events).toEqual([{ event: 'delta', data: { text: 'Hi' } }]);
  });

  it('supports CRLF line endings', () => {
    const events: unknown[] = [];
    createSseParser((event) => events.push(event)).push('event: delta\r\ndata: {"text":"Hi"}\r\n\r\n');
    expect(events).toEqual([{ event: 'delta', data: { text: 'Hi' } }]);
  });

  it('dispatches two blocks in order', () => {
    const events: unknown[] = [];
    createSseParser((event) => events.push(event)).push(
      'event: delta\ndata: {"text":"A"}\n\nevent: done\ndata: {"ok":true}\n\n',
    );
    expect(events).toEqual([
      { event: 'delta', data: { text: 'A' } },
      { event: 'done', data: { ok: true } },
    ]);
  });

  it('end flushes an unterminated block and ignores whitespace', () => {
    const events: unknown[] = [];
    const parser = createSseParser((event) => events.push(event));
    parser.push('event: delta\ndata: {"text":"Hi"}');
    expect(events).toEqual([]);
    parser.end();
    expect(events).toEqual([{ event: 'delta', data: { text: 'Hi' } }]);
    parser.push('  \n\t');
    parser.end();
    expect(events).toHaveLength(1);
  });

  it('ignores blocks without data and invalid JSON', () => {
    const events: unknown[] = [];
    const parser = createSseParser((event) => events.push(event));
    expect(() => parser.push('event: ping\n\n')).not.toThrow();
    expect(() => parser.push('event: delta\ndata: {invalid}\n\n')).not.toThrow();
    expect(events).toEqual([]);
  });

  it('defaults parseSseBlock event to message', () => {
    expect(parseSseBlock('data: {"text":"Hi"}')).toEqual({ event: 'message', data: { text: 'Hi' } });
  });
});
