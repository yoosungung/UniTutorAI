/** TutorTurn — ARCHITECTURE.md §2.3 */
export type EscalationStep = 1 | 2 | 3;
export type TutorScope = 'in_lecture' | 'out_of_scope';
export type FormulaVerdict = 'correct' | 'incorrect';

export type TutorTurn = {
  id: string;
  sourceSpanId: string;
  /** Single guiding question — never a full answer or worked solution. */
  question: string;
  escalationStep: EscalationStep;
  /** SourceSpan.id list to seek on CitationSelected. Empty when out_of_scope. */
  citations: string[];
  scope: TutorScope;
  formulaVerdict?: FormulaVerdict;
};
