import { describe, expect, it } from 'vitest';
import { createApp } from './index';
import type { LlmClient } from './services/llm';
import { assertValidTutorTurn } from './lib/tutorTurn';
import type { TutorTurn } from './types/tutorTurn';

function parseSse(body: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  let event = 'message';
  let dataLines: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    } else if (line === '') {
      if (dataLines.length) {
        events.push({ event, data: dataLines.join('\n') });
      }
      event = 'message';
      dataLines = [];
    }
  }
  if (dataLines.length) {
    events.push({ event, data: dataLines.join('\n') });
  }
  return events;
}

describe('GET /health', () => {
  it('returns ok JSON', async () => {
    const app = createApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: 'ok',
      service: 'unitutor-backend',
    });
  });
});

describe('POST /api/tutor/turn', () => {
  it('returns 503 llm_unavailable when GEMINI_API_KEY is missing', async () => {
    const app = createApp();
    const res = await app.request('/api/tutor/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: 'cs50p-l0',
        sourceSpanId: 'span-1',
      }),
    });
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('llm_unavailable');
    expect(JSON.stringify(json)).not.toMatch(/AIza|sk-|gemini.*key/i);
  });

  it('streams tutor_turn_delta then a valid tutor_turn via SSE', async () => {
    const fakeLlm: LlmClient = {
      async *streamQuestion() {
        yield { text: '함수가 ' };
        yield { text: '맡는 역할을 한 문장으로 말해 볼까요?' };
      },
    };
    const app = createApp({
      createLlm: () => fakeLlm,
    });
    const res = await app.request(
      '/api/tutor/turn',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: 'cs50p-l0',
          sourceSpanId: 'span-functions',
          concept: 'Functions',
          escalationStep: 1,
        }),
      },
      { GEMINI_API_KEY: 'test-key-not-a-secret' },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') ?? '').toMatch(/text\/event-stream/);
    const text = await res.text();
    expect(text).not.toContain('test-key-not-a-secret');

    const events = parseSse(text);
    const deltas = events.filter((e) => e.event === 'tutor_turn_delta');
    const finals = events.filter((e) => e.event === 'tutor_turn');
    expect(deltas.length).toBeGreaterThanOrEqual(1);
    expect(finals).toHaveLength(1);

    const turn = JSON.parse(finals[0].data) as TutorTurn;
    expect(() => assertValidTutorTurn(turn)).not.toThrow();
    expect(turn.sourceSpanId).toBe('span-functions');
    expect(turn.question).toContain('함수');
    expect(turn.scope).toBe('in_lecture');
    expect(turn.citations).toContain('span-functions');
  });

  it('rejects invalid body with 400', async () => {
    const app = createApp({
      createLlm: () => ({
        async *streamQuestion() {
          yield { text: 'x' };
        },
      }),
    });
    const res = await app.request(
      '/api/tutor/turn',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: 'only' }),
      },
      { GEMINI_API_KEY: 'k' },
    );
    expect(res.status).toBe(400);
  });

  it('uses one-shot BYOK header when GEMINI_API_KEY is missing', async () => {
    const seenKeys: string[] = [];
    const fakeLlm: LlmClient = {
      async *streamQuestion() {
        yield { text: 'BYOK로 질문할까요?' };
      },
    };
    const app = createApp({
      createLlm: (apiKey) => {
        seenKeys.push(apiKey);
        return fakeLlm;
      },
    });
    const byok = 'AIza-user-byok-not-a-secret';
    const res = await app.request('/api/tutor/turn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-UniTutor-Byok-Key': byok,
      },
      body: JSON.stringify({
        courseId: 'cs50p-l0',
        sourceSpanId: 'span-byok',
      }),
    });
    expect(res.status).toBe(200);
    expect(seenKeys).toEqual([byok]);
    const text = await res.text();
    expect(text).not.toContain(byok);
    expect(text).toContain('BYOK로');
  });

  it('prefers BYOK header over env GEMINI_API_KEY', async () => {
    const seenKeys: string[] = [];
    const app = createApp({
      createLlm: (apiKey) => {
        seenKeys.push(apiKey);
        return {
          async *streamQuestion() {
            yield { text: 'ok' };
          },
        };
      },
    });
    const res = await app.request(
      '/api/tutor/turn',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-UniTutor-Byok-Key': 'byok-wins',
        },
        body: JSON.stringify({
          courseId: 'cs50p-l0',
          sourceSpanId: 'span-1',
        }),
      },
      { GEMINI_API_KEY: 'env-key-should-not-win' },
    );
    expect(res.status).toBe(200);
    expect(seenKeys).toEqual(['byok-wins']);
    const text = await res.text();
    expect(text).not.toContain('byok-wins');
    expect(text).not.toContain('env-key-should-not-win');
  });
});
