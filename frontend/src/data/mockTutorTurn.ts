/**
 * TutorTurn fixtures for unit tests (SSE is runtime source).
 * Uses CS50P Lecture 0 SourceSpan fixtures.
 */
import type { TutorTurn } from '../types/tutorTurn';
import { CS50P_LECTURE_0_SPANS } from './cs50pLecture0';
import { assertValidTutorTurn } from '../lib/tutorTurn';

const first = CS50P_LECTURE_0_SPANS[0];
const second = CS50P_LECTURE_0_SPANS[1];

export const MOCK_TUTOR_TURN_IN_LECTURE: TutorTurn = {
  id: 'mock-tutor-turn-cs50p-l0-1',
  sourceSpanId: second.id,
  question:
    'Functions 장면에서, 함수가 코드에서 맡는 역할을 한 문장으로 말해 볼까요?',
  escalationStep: 1,
  citations: [first.id, second.id],
  scope: 'in_lecture',
};

export const MOCK_TUTOR_TURN_OUT_OF_SCOPE: TutorTurn = {
  id: 'mock-tutor-turn-cs50p-l0-oos',
  sourceSpanId: second.id,
  question:
    '이 강의 범위 밖입니다. 경로에서 다음 CS50P 장면을 선택해 이어서 보세요.',
  escalationStep: 1,
  citations: [],
  scope: 'out_of_scope',
};

assertValidTutorTurn(MOCK_TUTOR_TURN_IN_LECTURE);
assertValidTutorTurn(MOCK_TUTOR_TURN_OUT_OF_SCOPE);
