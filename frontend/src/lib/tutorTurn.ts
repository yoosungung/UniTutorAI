import type { TutorTurn } from '../types/tutorTurn';

const FORBIDDEN_KEYS = [
  'answer',
  'solution',
  'workedSolution',
  'fullSolution',
  '풀이',
] as const;

/**
 * Contract checks for TutorTurn (ARCHITECTURE §1 / §2.3).
 * Does not generate turns — validates shape for UI / mock payloads.
 */
export function assertValidTutorTurn(turn: TutorTurn): void {
  if (!turn.question?.trim()) {
    throw new Error('TutorTurn.question must be a non-empty guiding question');
  }

  for (const key of FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(turn, key)) {
      throw new Error(
        `TutorTurn must not carry answer/solution fields (found "${key}")`,
      );
    }
  }

  if (turn.scope === 'out_of_scope' && turn.citations.length > 0) {
    throw new Error(
      'TutorTurn.citations must be empty when scope is out_of_scope',
    );
  }
}
