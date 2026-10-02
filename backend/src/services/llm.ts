import type { TutorTurnRequest } from '../types/tutorTurn';

const GEMINI_MODEL = 'gemini-2.0-flash';

export type LlmDelta = { text: string };

export type LlmClient = {
  streamQuestion(req: TutorTurnRequest): AsyncGenerator<LlmDelta, void, unknown>;
};

function buildPrompt(req: TutorTurnRequest): string {
  const concept = req.concept?.trim() || req.sourceSpanId;
  const step = req.escalationStep ?? 1;
  const learner = req.learnerMessage?.trim();
  return [
    'You are a Socratic tutor for one lecture clip.',
    'Reply with ONE short guiding question in Korean only.',
    'Do not give the answer, solution, or worked steps.',
    `courseId=${req.courseId}`,
    `sourceSpanId=${req.sourceSpanId}`,
    `concept=${concept}`,
    `escalationStep=${step}`,
    learner ? `learnerMessage=${learner}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

type GeminiSseChunk = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

/**
 * Gemini streamGenerateContent (?alt=sse) client.
 * API key is query-param only; never include it in thrown Error messages.
 */
export function createGeminiClient(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): LlmClient {
  return {
    async *streamQuestion(req: TutorTurnRequest) {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}` +
        `:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

      let res: Response;
      try {
        res = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: buildPrompt(req) }] }],
            generationConfig: { temperature: 0.4 },
          }),
        });
      } catch {
        throw new Error('gemini_network');
      }

      if (!res.ok) {
        throw new Error(`gemini_http_${res.status}`);
      }
      if (!res.body) {
        throw new Error('gemini_empty');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() ?? '';
        for (const block of parts) {
          for (const line of block.split(/\r?\n/)) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const json = JSON.parse(payload) as GeminiSseChunk;
              const text = json.candidates?.[0]?.content?.parts
                ?.map((p) => p.text ?? '')
                .join('');
              if (text) yield { text };
            } catch {
              /* skip malformed chunk */
            }
          }
        }
      }
    },
  };
}
