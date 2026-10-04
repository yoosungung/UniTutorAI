import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LaterModePane } from './LaterModePane';
import type { SourceSpan } from '../../types/sourceSpan';
import type { TutorTurn } from '../../types/tutorTurn';

const spans: SourceSpan[] = [
  {
    id: 'span-fn',
    courseId: 'c',
    concept: 'Functions',
    startSec: 341,
    endSec: 468,
    slideLabel: 'Functions',
  },
];

describe('LaterModePane', () => {
  it('keeps Tutor as default and does not leave the study pane', () => {
    render(
      <LaterModePane
        sourceSpanId="span-fn"
        spans={spans}
        onTurn={vi.fn()}
        tutor={<p>tutor-body</p>}
      />,
    );
    expect(screen.getByText('tutor-body')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tutor' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('Editor submit emits a coaching TutorTurn for the current scene', () => {
    const onTurn = vi.fn<(turn: TutorTurn) => void>();
    render(
      <LaterModePane
        sourceSpanId="span-fn"
        spans={spans}
        onTurn={onTurn}
        tutor={<p>tutor-body</p>}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Editor' }));
    fireEvent.change(screen.getByRole('textbox', { name: /글|코드/ }), {
      target: { value: 'print("hi")' },
    });
    fireEvent.click(screen.getByRole('button', { name: /첨삭/ }));
    expect(onTurn).toHaveBeenCalledOnce();
    const turn = onTurn.mock.calls[0][0];
    expect(turn.sourceSpanId).toBe('span-fn');
    expect(turn.scope).toBe('in_lecture');
  });

  it('Roommate out-of-scope topic stays on the canvas with empty citations', () => {
    const onTurn = vi.fn<(turn: TutorTurn) => void>();
    render(
      <LaterModePane
        sourceSpanId="span-fn"
        spans={spans}
        onTurn={onTurn}
        tutor={<p>tutor-body</p>}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Roommate' }));
    fireEvent.change(screen.getByRole('textbox', { name: /분야/ }), {
      target: { value: '양자중력' },
    });
    fireEvent.click(screen.getByRole('button', { name: /잇기/ }));
    const turn = onTurn.mock.calls[0][0];
    expect(turn.scope).toBe('out_of_scope');
    expect(turn.citations).toEqual([]);
    expect(turn.sourceSpanId).toBe('span-fn');
  });
});
