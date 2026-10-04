import type { SourceSpan } from '../types/sourceSpan';
import type { TutorTurn } from '../types/tutorTurn';
import { assertValidTutorTurn } from './tutorTurn';

export type LaterMode = 'tutor' | 'editor' | 'roommate';

function matchingSpans(spans: SourceSpan[], text: string): SourceSpan[] {
  const q = text.trim().toLowerCase();
  if (!q) return [];
  return spans.filter((span) => {
    const label = span.slideLabel?.toLowerCase() ?? '';
    const concept = span.concept.toLowerCase();
    return (
      (label.length > 0 && q.includes(label)) ||
      (concept.length > 0 && q.includes(concept))
    );
  });
}

/**
 * Editor MVP: one coaching TutorTurn on the current scene (no rewrite / solution).
 */
export function coachEditorDraft(opts: {
  draft: string;
  sourceSpanId: string;
  spans: SourceSpan[];
  turnId?: string;
}): TutorTurn | null {
  if (!opts.draft.trim()) return null;
  const span = opts.spans.find((s) => s.id === opts.sourceSpanId);
  const concept = span?.concept ?? '이 장면';
  const turn: TutorTurn = {
    id: opts.turnId ?? `editor-${opts.sourceSpanId}`,
    sourceSpanId: opts.sourceSpanId,
    question: `이 초안에서 한 군데만 골라, ${concept} 장면과 어떻게 맞는지 짧게 말해 볼까요?`,
    escalationStep: 1,
    citations: [opts.sourceSpanId],
    scope: 'in_lecture',
  };
  assertValidTutorTurn(turn);
  return turn;
}

/**
 * Roommate MVP: same canvas. Lecture hit → in_lecture; else out_of_scope (empty citations).
 */
export function linkRoommateTopic(opts: {
  message: string;
  sourceSpanId: string;
  spans: SourceSpan[];
  turnId?: string;
}): TutorTurn | null {
  if (!opts.message.trim()) return null;
  const hits = matchingSpans(opts.spans, opts.message);
  const inLecture = hits.length > 0;
  const turn: TutorTurn = inLecture
    ? {
        id: opts.turnId ?? `roommate-${opts.sourceSpanId}`,
        sourceSpanId: opts.sourceSpanId,
        question:
          '지금 장면과 그 분야를 한 줄로 어떻게 잇겠어요? 풀이 전문은 말고 연결만 말해 볼까요?',
        escalationStep: 1,
        citations: [hits[0].id],
        scope: 'in_lecture',
      }
    : {
        id: opts.turnId ?? `roommate-${opts.sourceSpanId}`,
        sourceSpanId: opts.sourceSpanId,
        question:
          '이 강의 범위 밖입니다. 같은 화면에서 강의 장면을 고르거나, 질문을 장면 개념으로 바꿔 보세요.',
        escalationStep: 1,
        citations: [],
        scope: 'out_of_scope',
      };
  assertValidTutorTurn(turn);
  return turn;
}
