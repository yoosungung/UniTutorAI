import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { FormulaInput } from '../components/math/FormulaInput';
import { applyFormulaVerdict } from './mathCheck';
import { TutorTurnView } from '../components/tutor/TutorTurnView';
import type { TutorTurn } from '../types/tutorTurn';
import type { SourceSpan } from '../types/sourceSpan';

const span: SourceSpan = {
  id: 'span-a',
  courseId: 'course-a',
  concept: 'Demo',
  startSec: 0,
  endSec: 10,
};

const base: TutorTurn = {
  id: 'turn-1',
  sourceSpanId: 'span-a',
  question: '이 장면에서 핵심을 한 문장으로 말해 볼까요?',
  escalationStep: 1,
  citations: ['span-a'],
  scope: 'in_lecture',
};

function Harness() {
  const [turn, setTurn] = useState(base);
  return (
    <>
      <FormulaInput
        expectedExpr="4"
        onChecked={(_verdict, learnerExpr) => {
          setTurn(
            applyFormulaVerdict({
              turn: base,
              learnerExpr,
              expectedExpr: '4',
            }).turn,
          );
        }}
      />
      <TutorTurnView
        turn={turn}
        spans={[span]}
        onCitationSelected={vi.fn()}
      />
    </>
  );
}

describe('formulaVerdict smoke', () => {
  it('reflects formulaVerdict in the turn before the guiding question changes', () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText('수식 입력'), {
      target: { value: '2+2' },
    });
    fireEvent.click(screen.getByRole('button', { name: '판정' }));

    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('data-formula-verdict', 'correct');
    const statuses = screen.getAllByRole('status');
    const heading = screen.getByRole('heading', { level: 3 });
    const turnStatus = statuses.find((el) =>
      article.contains(el),
    ) as HTMLElement;
    expect(
      turnStatus.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
