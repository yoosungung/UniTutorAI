import { describe, expect, it, vi } from 'vitest';
import { createGeminiClient } from './llm';

describe('createGeminiClient', () => {
  it('yields text chunks from Gemini SSE and does not leak the key in thrown errors', async () => {
    const sse =
      'data: {"candidates":[{"content":{"parts":[{"text":"한 "}]}}]}\n\n' +
      'data: {"candidates":[{"content":{"parts":[{"text":"문장?"}]}}]}\n\n';
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      expect(href).toContain('streamGenerateContent');
      expect(href).toContain('key=');
      return new Response(sse, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }) as unknown as typeof fetch;

    const client = createGeminiClient('secret-key-xyz', fetchImpl);
    const chunks: string[] = [];
    for await (const c of client.streamQuestion({
      courseId: 'c',
      sourceSpanId: 's',
      concept: 'Functions',
    })) {
      chunks.push(c.text);
    }
    expect(chunks.join('')).toBe('한 문장?');
  });
});
