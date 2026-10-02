import { describe, expect, it, vi } from 'vitest';
import { streamTutorTurn } from './tutorStream';
import type { TutorTurn } from '../types/tutorTurn';

function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i++]));
    },
  });
}

describe('streamTutorTurn', () => {
  it('parses deltas and a valid final tutor_turn', async () => {
    const turn: TutorTurn = {
      id: 't1',
      sourceSpanId: 'span-a',
      question: '핵심을 한 문장으로 말해 볼까요?',
      escalationStep: 1,
      citations: ['span-a'],
      scope: 'in_lecture',
    };
    const body =
      'event: tutor_turn_delta\ndata: {"text":"핵심을 "}\n\n' +
      'event: tutor_turn_delta\ndata: {"text":"한 문장으로 말해 볼까요?"}\n\n' +
      `event: tutor_turn\ndata: ${JSON.stringify(turn)}\n\n`;

    const fetchImpl = vi.fn(async () => {
      return new Response(sseBody([body]), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }) as unknown as typeof fetch;

    const deltas: string[] = [];
    const result = await streamTutorTurn(
      { courseId: 'c', sourceSpanId: 'span-a' },
      { onDelta: (t) => deltas.push(t) },
      { fetchImpl },
    );

    expect(deltas.join('')).toContain('핵심');
    expect(result?.id).toBe('t1');
    expect(result?.question).toBe(turn.question);
  });

  it('surfaces 503 llm_unavailable without treating body as SSE', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ error: 'llm_unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const errors: string[] = [];
    const result = await streamTutorTurn(
      { courseId: 'c', sourceSpanId: 's' },
      { onError: (e) => errors.push(e) },
      { fetchImpl },
    );
    expect(result).toBeNull();
    expect(errors).toEqual(['llm_unavailable']);
  });

  it('sends BYOK key one-shot via X-UniTutor-Byok-Key (not in JSON body)', async () => {
    const turn: TutorTurn = {
      id: 't-byok',
      sourceSpanId: 'span-a',
      question: '질문?',
      escalationStep: 1,
      citations: ['span-a'],
      scope: 'in_lecture',
    };
    const body = `event: tutor_turn\ndata: ${JSON.stringify(turn)}\n\n`;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      return new Response(sseBody([body]), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }) as unknown as typeof fetch;

    await streamTutorTurn(
      { courseId: 'c', sourceSpanId: 'span-a' },
      {},
      { fetchImpl, byokApiKey: 'AIza-byok-secret-value' },
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    const headers = new Headers(init.headers);
    expect(headers.get('X-UniTutor-Byok-Key')).toBe('AIza-byok-secret-value');
    expect(String(init.body)).not.toContain('AIza-byok-secret-value');
  });
});
