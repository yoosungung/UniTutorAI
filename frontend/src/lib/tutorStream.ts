import { apiUrl } from './apiBase';
import { BYOK_HEADER } from './byok';
import type { EscalationStep, TutorTurn } from '../types/tutorTurn';
import { assertValidTutorTurn } from './tutorTurn';

export type TutorTurnRequestBody = {
  courseId: string;
  sourceSpanId: string;
  concept?: string;
  escalationStep?: EscalationStep;
  learnerMessage?: string;
  citationIds?: string[];
};

export type TutorStreamHandlers = {
  onDelta?: (text: string) => void;
  onTurn?: (turn: TutorTurn) => void;
  onError?: (error: string) => void;
};

/**
 * POST /api/tutor/turn and consume SSE (ARCHITECTURE §2.6).
 * Optional BYOK key is sent one-shot via header — never stored server-side.
 */
export async function streamTutorTurn(
  body: TutorTurnRequestBody,
  handlers: TutorStreamHandlers = {},
  init: {
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
    byokApiKey?: string | null;
  } = {},
): Promise<TutorTurn | null> {
  const fetchImpl = init.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  const byok = init.byokApiKey?.trim();
  if (byok) headers[BYOK_HEADER] = byok;

  const res = await fetchImpl(apiUrl('/api/tutor/turn'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: init.signal,
  });

  if (res.status === 503) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    const err = json?.error ?? 'llm_unavailable';
    handlers.onError?.(err);
    return null;
  }
  if (!res.ok || !res.body) {
    const err = `http_${res.status}`;
    handlers.onError?.(err);
    return null;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let dataLines: string[] = [];
  let finalTurn: TutorTurn | null = null;

  const flush = () => {
    if (!dataLines.length) {
      eventName = 'message';
      return;
    }
    const data = dataLines.join('\n');
    dataLines = [];
    const name = eventName;
    eventName = 'message';

    if (name === 'tutor_turn_delta') {
      try {
        const parsed = JSON.parse(data) as { text?: string };
        if (parsed.text) handlers.onDelta?.(parsed.text);
      } catch {
        /* ignore */
      }
      return;
    }
    if (name === 'tutor_turn') {
      try {
        const turn = JSON.parse(data) as TutorTurn;
        assertValidTutorTurn(turn);
        finalTurn = turn;
        handlers.onTurn?.(turn);
      } catch (e) {
        handlers.onError?.(
          e instanceof Error ? e.message : 'invalid_tutor_turn',
        );
      }
      return;
    }
    if (name === 'error') {
      try {
        const parsed = JSON.parse(data) as { error?: string };
        handlers.onError?.(parsed.error ?? 'stream_error');
      } catch {
        handlers.onError?.('stream_error');
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      } else if (line === '') {
        flush();
      }
    }
  }
  flush();
  return finalTurn;
}
