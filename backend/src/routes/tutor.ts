import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Bindings } from '../types/bindings';
import {
  createGeminiClient,
  type LlmClient,
} from '../services/llm';
import type { EscalationStep, TutorTurn, TutorTurnRequest } from '../types/tutorTurn';
import { assertValidTutorTurn } from '../lib/tutorTurn';

export type TutorRouteOptions = {
  createLlm?: (apiKey: string) => LlmClient;
};

function parseBody(raw: unknown): TutorTurnRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.courseId !== 'string' || !body.courseId.trim()) return null;
  if (typeof body.sourceSpanId !== 'string' || !body.sourceSpanId.trim()) {
    return null;
  }
  const step = body.escalationStep;
  const escalationStep =
    step === 1 || step === 2 || step === 3
      ? (step as EscalationStep)
      : undefined;
  return {
    courseId: body.courseId.trim(),
    sourceSpanId: body.sourceSpanId.trim(),
    concept: typeof body.concept === 'string' ? body.concept : undefined,
    escalationStep,
    learnerMessage:
      typeof body.learnerMessage === 'string' ? body.learnerMessage : undefined,
    citationIds: Array.isArray(body.citationIds)
      ? body.citationIds.filter((id): id is string => typeof id === 'string')
      : undefined,
  };
}

function buildTurn(req: TutorTurnRequest, question: string): TutorTurn {
  const turn: TutorTurn = {
    id: `turn-${req.sourceSpanId}-${Date.now()}`,
    sourceSpanId: req.sourceSpanId,
    question: question.trim(),
    escalationStep: req.escalationStep ?? 1,
    citations: req.citationIds?.length
      ? req.citationIds
      : [req.sourceSpanId],
    scope: 'in_lecture',
  };
  assertValidTutorTurn(turn);
  return turn;
}

export function createTutorRoutes(options: TutorRouteOptions = {}) {
  const tutor = new Hono<{ Bindings: Bindings }>();
  const createLlm = options.createLlm ?? createGeminiClient;

  tutor.post('/turn', async (c) => {
    // BYOK one-shot header wins; env key is unused when BYOK is present.
    const byok = c.req.header('X-UniTutor-Byok-Key')?.trim();
    const apiKey = byok || c.env?.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return c.json({ error: 'llm_unavailable' }, 503);
    }

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_json' }, 400);
    }
    const req = parseBody(raw);
    if (!req) {
      return c.json({ error: 'invalid_request' }, 400);
    }

    const llm = createLlm(apiKey);

    return streamSSE(c, async (stream) => {
      try {
        let question = '';
        for await (const chunk of llm.streamQuestion(req)) {
          if (!chunk.text) continue;
          question += chunk.text;
          await stream.writeSSE({
            event: 'tutor_turn_delta',
            data: JSON.stringify({ text: chunk.text }),
          });
        }
        const turn = buildTurn(req, question);
        await stream.writeSSE({
          event: 'tutor_turn',
          data: JSON.stringify(turn),
        });
      } catch {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: 'llm_failed' }),
        });
      }
    });
  });

  return tutor;
}
