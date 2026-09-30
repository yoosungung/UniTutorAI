import { describe, expect, it } from 'vitest';
import { assertValidTutorTurn } from './tutorTurn';
import type { TutorTurn } from '../types/tutorTurn';

const base: TutorTurn = {
  id: 'turn-1',
  sourceSpanId: 'span-a',
  question: '이 장면에서 print가 하는 일은 무엇일까요?',
  escalationStep: 1,
  citations: ['span-a'],
  scope: 'in_lecture',
};

describe('assertValidTutorTurn', () => {
  it('accepts a single guiding question with citations in_lecture', () => {
    expect(() => assertValidTutorTurn(base)).not.toThrow();
  });

  it('rejects empty question', () => {
    expect(() => assertValidTutorTurn({ ...base, question: '  ' })).toThrow(
      /question/,
    );
  });

  it('rejects answer-like fields on the turn payload', () => {
    expect(() =>
      assertValidTutorTurn({
        ...base,
        answer: 'print는 출력을 합니다',
      } as TutorTurn & { answer: string }),
    ).toThrow(/answer|solution|풀이/i);
  });

  it('requires empty citations when scope is out_of_scope', () => {
    expect(() =>
      assertValidTutorTurn({
        ...base,
        scope: 'out_of_scope',
        citations: ['span-a'],
        question: '이 강의 범위 밖입니다. 관련 장면을 먼저 골라 보세요.',
      }),
    ).toThrow(/citations/);
  });

  it('accepts out_of_scope with empty citations and out-of-scope wording', () => {
    expect(() =>
      assertValidTutorTurn({
        ...base,
        scope: 'out_of_scope',
        citations: [],
        question: '이 강의 범위 밖입니다. 경로에서 다음 장면을 선택해 주세요.',
      }),
    ).not.toThrow();
  });
});
