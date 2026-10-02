import type { TutorTurn } from '../types/tutorTurn';

const FORBIDDEN_KEYS = [
  'answer',
  'solution',
  'workedSolution',
  'correctAnswer',
] as const;

/**
 * Contract checks for TutorTurn (ARCHITECTURE §1 / §2.3).
 */
export function assertValidTutorTurn(turn: TutorTurn): void {
  if (!turn.question?.trim()) {
    throw new Error('TutorTurn.question must be a non-empty guiding question');
  }
  for (const key of FORBIDDEN_KEYS) {
    if (key in turn && (turn as Record<string, unknown>)[key] != null) {
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
