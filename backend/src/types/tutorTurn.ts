/** TutorTurn — ARCHITECTURE.md §2.3 */
export type EscalationStep = 1 | 2 | 3;
export type TutorScope = 'in_lecture' | 'out_of_scope';
export type FormulaVerdict = 'correct' | 'incorrect';

export type TutorTurn = {
  id: string;
  sourceSpanId: string;
  question: string;
  escalationStep: EscalationStep;
  citations: string[];
  scope: TutorScope;
  formulaVerdict?: FormulaVerdict;
};

export type TutorTurnRequest = {
  courseId: string;
  sourceSpanId: string;
  concept?: string;
  escalationStep?: EscalationStep;
  learnerMessage?: string;
  /** Optional citation targets; default [sourceSpanId] when in_lecture. */
  citationIds?: string[];
};
