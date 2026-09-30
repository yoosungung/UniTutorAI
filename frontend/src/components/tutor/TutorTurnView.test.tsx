import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TutorTurnView } from './TutorTurnView';
import type { TutorTurn } from '../../types/tutorTurn';
import type { SourceSpan } from '../../types/sourceSpan';

const spans: SourceSpan[] = [
  {
    id: 'cs50p-2022-lecture-0:span-001',
    courseId: 'cs50p-2022-lecture-0',
    concept: 'Creating Code with Python',
    startSec: 24,
    endSec: 341,
    slideLabel: 'Creating Code with Python',
  },
  {
    id: 'cs50p-2022-lecture-0:span-002',
    courseId: 'cs50p-2022-lecture-0',
    concept: 'Functions',
    startSec: 341,
    endSec: 468,
    slideLabel: 'Functions',
  },
];

const inLecture: TutorTurn = {
  id: 'mock-turn-1',
  sourceSpanId: 'cs50p-2022-lecture-0:span-002',
  question: 'Functions 장면에서 함수가 하는 일을 한 문장으로 말해 볼까요?',
  escalationStep: 1,
  citations: [
    'cs50p-2022-lecture-0:span-001',
    'cs50p-2022-lecture-0:span-002',
  ],
  scope: 'in_lecture',
};

const outOfScope: TutorTurn = {
  id: 'mock-turn-oos',
  sourceSpanId: 'cs50p-2022-lecture-0:span-002',
  question:
    '이 강의 범위 밖입니다. 경로에서 다음 CS50P 장면을 선택해 이어서 보세요.',
  escalationStep: 1,
  citations: [],
  scope: 'out_of_scope',
};

describe('TutorTurnView', () => {
  it('renders one question and citation controls that emit CitationSelected', () => {
    const onCitation = vi.fn();
    render(
      <TutorTurnView
        turn={inLecture}
        spans={spans}
        onCitationSelected={onCitation}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: inLecture.question }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/정답|풀이 전문|완성된 식/)).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: /Creating Code with Python/i }),
    );
    expect(onCitation).toHaveBeenCalledWith({
      type: 'CitationSelected',
      sourceSpanId: 'cs50p-2022-lecture-0:span-001',
      startSec: 24,
    });
  });

  it('hides citations and shows out-of-scope copy when scope=out_of_scope', () => {
    const onCitation = vi.fn();
    render(
      <TutorTurnView
        turn={outOfScope}
        spans={spans}
        onCitationSelected={onCitation}
      />,
    );

    expect(screen.getByRole('heading', { name: /범위 밖/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Functions/i })).toBeNull();
    expect(onCitation).not.toHaveBeenCalled();
  });
});
