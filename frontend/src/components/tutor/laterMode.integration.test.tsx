import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudyCanvas } from '../canvas/StudyCanvas';
import { LaterModePane } from './LaterModePane';
import { TutorTurnView } from './TutorTurnView';
import type { CourseRef } from '../../types/course';
import type { SourceSpan } from '../../types/sourceSpan';
import type { TutorTurn } from '../../types/tutorTurn';
import type { CitationSelected } from '../../types/events';

const course: CourseRef = {
  id: 'cs50p-2022-lecture-0',
  title: 'CS50P Lecture 0 — Functions, Variables',
  subject: 'Computer Science',
  playbackUrl: 'https://www.youtube.com/watch?v=JP7ITIXGpHk',
};

const spans: SourceSpan[] = [
  {
    id: 'span-fn',
    courseId: 'cs50p-2022-lecture-0',
    concept: 'Functions',
    startSec: 341,
    endSec: 468,
    slideLabel: 'Functions',
  },
];

function Harness() {
  const [turn, setTurn] = useState<TutorTurn | null>(null);
  return (
    <StudyCanvas
      course={course}
      tutor={
        <LaterModePane
          sourceSpanId="span-fn"
          spans={spans}
          onTurn={setTurn}
          tutor={
            turn ? (
              <TutorTurnView
                turn={turn}
                spans={spans}
                onCitationSelected={(_e: CitationSelected) => undefined}
              />
            ) : (
              <p>tutor-body</p>
            )
          }
        />
      }
    />
  );
}

describe('LaterModePane on StudyCanvas', () => {
  it('keeps the player mounted when Roommate is out_of_scope', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('tab', { name: 'Roommate' }));
    fireEvent.change(screen.getByRole('textbox', { name: /분야/ }), {
      target: { value: '양자중력' },
    });
    fireEvent.click(screen.getByRole('button', { name: /잇기/ }));
    expect(screen.getByTitle(/CS50P Lecture 0/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /범위 밖/ })).toBeInTheDocument();
  });
});
