/**
 * Incremental parser for DouDou's server-sent events. Text arrives in arbitrary chunks, so a
 * block is only dispatched once its blank-line terminator has arrived; `end()` flushes the last
 * block if the stream closed without one. Shared so the phone and tests use the same rules as the
 * web's reader in apps/web/src/api.ts.
 */

export interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

export interface SseParser {
  /** Feed the next decoded chunk of the response body. */
  push(chunk: string): void;
  /** The body has ended; dispatch anything left in the buffer. */
  end(): void;
}

/** Parse one complete block; null when it carries no data line or its data is not JSON. */
export function parseSseBlock(block: string): SseEvent | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  try {
    const data = JSON.parse(dataLines.join('\n')) as unknown;
    return data && typeof data === 'object' ? { event, data: data as Record<string, unknown> } : null;
  } catch {
    return null;
  }
}

export function createSseParser(onEvent: (event: SseEvent) => void): SseParser {
  let buffer = '';
  return {
    push(chunk) {
      buffer += chunk;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        const parsed = parseSseBlock(block);
        if (parsed) onEvent(parsed);
      }
    },
    end() {
      if (buffer.trim()) {
        const parsed = parseSseBlock(buffer);
        if (parsed) onEvent(parsed);
      }
      buffer = '';
    },
  };
}
