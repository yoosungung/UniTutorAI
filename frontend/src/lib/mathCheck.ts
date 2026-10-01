import {
  evaluate,
  isSymbolNode,
  parse,
  rationalize,
  simplify,
  type MathNode,
} from 'mathjs';
import type { FormulaVerdict, TutorTurn } from '../types/tutorTurn';

export type FormulaCheckResult = {
  verdict: FormulaVerdict;
  turn: TutorTurn;
};

const NUMERIC_EPS = 1e-9;
const SAMPLE_POINTS = [-2, -1, -0.5, 0, 0.5, 1, 2, 3, Math.PI / 4];

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
      return Math.abs(a - b) < NUMERIC_EPS ? 'correct' : 'incorrect';
    }
  } catch {
    // fall through — free symbols or non-numeric forms
  }

  try {
    const residual = rationalize(`(${learner}) - (${expected})`);
    if (residual.toString() === '0') return 'correct';
  } catch {
    // rationalize cannot solve some transcendental diffs
  }

  try {
    const sa = simplify(learner).toString();
    const sb = simplify(expected).toString();
    if (sa === sb) return 'correct';
  } catch {
    // ignore
  }

  if (agreeOnSamples(learner, expected)) return 'correct';
  return 'incorrect';
}

function freeSymbols(expr: string): string[] {
  try {
    const node = parse(expr);
    const names = new Set<string>();
    node.traverse((n: MathNode) => {
      if (isSymbolNode(n)) names.add(n.name);
    });
    return [...names];
  } catch {
    return [];
  }
}

function agreeOnSamples(learner: string, expected: string): boolean {
  const symbols = [
    ...new Set([...freeSymbols(learner), ...freeSymbols(expected)]),
  ];
  if (symbols.length === 0) return false;

  try {
    for (const t of SAMPLE_POINTS) {
      const scope: Record<string, number> = {};
      for (const name of symbols) scope[name] = t;
      const a = evaluate(learner, scope);
      const b = evaluate(expected, scope);
      if (typeof a !== 'number' || typeof b !== 'number') return false;
      if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
      if (Math.abs(a - b) >= NUMERIC_EPS) return false;
    }
    return true;
  } catch {
    return false;
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
