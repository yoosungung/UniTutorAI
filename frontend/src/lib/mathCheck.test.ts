import { describe, expect, it } from 'vitest';
import {
  applyFormulaVerdict,
  checkFormula,
  type FormulaCheckResult,
} from './mathCheck';
import type { TutorTurn } from '../types/tutorTurn';
import { assertValidTutorTurn } from './tutorTurn';

const baseTurn: TutorTurn = {
  id: 'turn-math-1',
  sourceSpanId: 'span-a',
  question: '이 장면에서 핵심을 한 문장으로 말해 볼까요?',
  escalationStep: 1,
  citations: ['span-a'],
  scope: 'in_lecture',
};

describe('checkFormula', () => {
  it('returns correct when learner expression equals expected', () => {
    expect(checkFormula('2 + 2', '4')).toBe('correct');
    expect(checkFormula('(x+1)^2', 'x^2 + 2*x + 1')).toBe('correct');
  });

  it('returns incorrect when expressions are not equivalent', () => {
    expect(checkFormula('2 + 3', '4')).toBe('incorrect');
    expect(checkFormula('x + 1', 'x + 2')).toBe('incorrect');
  });

  it('returns incorrect on empty or unparseable input', () => {
    expect(checkFormula('  ', '4')).toBe('incorrect');
    expect(checkFormula('@@@', '4')).toBe('incorrect');
  });
});

describe('applyFormulaVerdict', () => {
  it('sets formulaVerdict before changing the guiding question', () => {
    const result: FormulaCheckResult = applyFormulaVerdict({
      turn: baseTurn,
      learnerExpr: '2+2',
      expectedExpr: '4',
    });

    expect(result.verdict).toBe('correct');
    expect(result.turn.formulaVerdict).toBe('correct');
    expect(result.turn.formulaVerdict).toBeDefined();
    expect(result.turn.question).not.toBe(baseTurn.question);
    expect(() => assertValidTutorTurn(result.turn)).not.toThrow();
  });

  it('never puts answer or worked solution on TutorTurn when incorrect', () => {
    const result = applyFormulaVerdict({
      turn: baseTurn,
      learnerExpr: '2+3',
      expectedExpr: '4',
    });

    expect(result.verdict).toBe('incorrect');
    expect(result.turn.formulaVerdict).toBe('incorrect');
    expect(result.turn).not.toHaveProperty('answer');
    expect(result.turn).not.toHaveProperty('solution');
    expect(result.turn).not.toHaveProperty('workedSolution');
    expect(result.turn.question).not.toMatch(/정답|풀이|완성된 식|2\s*\+\s*2\s*=\s*4/);
    expect(() => assertValidTutorTurn(result.turn)).not.toThrow();
  });
});
