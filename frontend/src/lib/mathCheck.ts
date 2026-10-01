import { evaluate, simplify } from 'mathjs';
import type { FormulaVerdict, TutorTurn } from '../types/tutorTurn';

export type FormulaCheckResult = {
  verdict: FormulaVerdict;
  turn: TutorTurn;
};

const NUMERIC_EPS = 1e-9;
const SAMPLE_POINTS = [-2, -1, 0, 1, 2, 3.5];

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < NUMERIC_EPS;
}

/** Probe free variables so expanded forms like (x+1)^2 match x^2+2x+1. */
function sampleEquivalent(learner: string, expected: string): boolean {
  const scopeKeys = new Set<string>();
  for (const expr of [learner, expected]) {
    const matches = expr.match(/\b[a-zA-Z]\b/g);
    if (matches) for (const m of matches) scopeKeys.add(m);
  }
  const vars = [...scopeKeys];
  if (vars.length === 0) {
    try {
      const a = evaluate(learner);
      const b = evaluate(expected);
      return typeof a === 'number' && typeof b === 'number' && nearlyEqual(a, b);
    } catch {
      return false;
    }
  }

  for (const point of SAMPLE_POINTS) {
    const scope: Record<string, number> = {};
    for (const v of vars) scope[v] = point;
    try {
      const a = evaluate(learner, scope);
      const b = evaluate(expected, scope);
      if (typeof a !== 'number' || typeof b !== 'number' || !nearlyEqual(a, b)) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Client-side formula equivalence via Math.js (no server sandbox).
 * DESIGN: Math.js — not Pyodide (load/WASM cost out of scope for T3-02).
 */
export function checkFormula(
  learnerExpr: string,
  expectedExpr: string,
): FormulaVerdict {
  const learner = learnerExpr.trim();
  const expected = expectedExpr.trim();
  if (!learner || !expected) return 'incorrect';

  try {
    const a = evaluate(learner);
    const b = evaluate(expected);
    if (typeof a === 'number' && typeof b === 'number') {
      return nearlyEqual(a, b) ? 'correct' : 'incorrect';
    }
  } catch {
    // symbolic / with free vars
  }

  if (sampleEquivalent(learner, expected)) return 'correct';

  try {
    const sa = simplify(learner).toString();
    const sb = simplify(expected).toString();
    return sa === sb ? 'correct' : 'incorrect';
  } catch {
    return 'incorrect';
  }
}

/**
 * Apply formulaVerdict and replace the guiding question.
 * Incorrect never carries answer/solution fields (ARCHITECTURE §1).
 */
export function applyFormulaVerdict(input: {
  turn: TutorTurn;
  learnerExpr: string;
  expectedExpr: string;
}): FormulaCheckResult {
  const verdict = checkFormula(input.learnerExpr, input.expectedExpr);
  const question =
    verdict === 'correct'
      ? '맞아요. 이 장면에서 그 식이 의미하는 바를 한 문장으로 말해 볼까요?'
      : '어디를 다시 보면 좋을까요? 인용을 눌러 장면을 확인해 보세요.';

  const turn: TutorTurn = {
    id: input.turn.id,
    sourceSpanId: input.turn.sourceSpanId,
    question,
    escalationStep: input.turn.escalationStep,
    citations: [...input.turn.citations],
    scope: input.turn.scope,
    formulaVerdict: verdict,
  };

  return { verdict, turn };
}
