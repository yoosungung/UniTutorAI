import { useState } from 'react';
import { checkFormula } from '../../lib/mathCheck';
import type { FormulaVerdict } from '../../types/tutorTurn';

type Props = {
  expectedExpr: string;
  onChecked: (verdict: FormulaVerdict, learnerExpr: string) => void;
};

/**
 * Learner formula entry. Emits formulaVerdict before parent updates TutorTurn.question.
 */
export function FormulaInput({ expectedExpr, onChecked }: Props) {
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<FormulaVerdict | null>(null);

  function submit() {
    const next = checkFormula(value, expectedExpr);
    setVerdict(next);
    onChecked(next, value);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {verdict && (
        <p
          role="status"
          data-formula-verdict={verdict}
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: '20px',
            color:
              verdict === 'correct'
                ? 'var(--text-primary, #F8FAFC)'
                : 'var(--text-secondary, #94A3B8)',
          }}
        >
          {verdict === 'correct' ? '맞아요' : '다시 볼까요'}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="수식을 입력하세요..."
          aria-label="수식 입력"
          style={{
            flex: 1,
            padding: 10,
            backgroundColor: 'var(--bg-elevated, #1F2937)',
            border: '1px solid var(--border-subtle, #1E293B)',
            borderRadius: 6,
            color: 'var(--text-primary, #F8FAFC)',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={submit}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid var(--border-focused, #3B82F6)',
            backgroundColor: 'var(--bg-elevated, #1F2937)',
            color: 'var(--text-primary, #F8FAFC)',
            cursor: 'pointer',
          }}
        >
          판정
        </button>
      </div>
    </div>
  );
}
