import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudyCanvas } from './StudyCanvas';
import { TutorTurnView } from '../tutor/TutorTurnView';
import type { CourseRef } from '../../types/course';
import type { CitationSelected } from '../../types/events';
import type { TutorTurn } from '../../types/tutorTurn';
import type { SourceSpan } from '../../types/sourceSpan';

const course: CourseRef = {
  id: 'cs50p-2022-lecture-0',
  title: 'CS50P Lecture 0 — Functions, Variables',
  subject: 'Computer Science',
  playbackUrl: 'https://www.youtube.com/watch?v=JP7ITIXGpHk',
};

const spans: SourceSpan[] = [
  {
    id: 'cs50p-2022-lecture-0:span-002',
    courseId: 'cs50p-2022-lecture-0',
    concept: 'Functions',
    startSec: 341,
    endSec: 468,
    slideLabel: 'Functions',
  },
];

const turn: TutorTurn = {
  id: 't1',
  sourceSpanId: spans[0].id,
  question: '이 장면의 핵심은 무엇일까요?',
  escalationStep: 1,
  citations: [spans[0].id],
  scope: 'in_lecture',
};

function Harness() {
  const [seekSec, setSeekSec] = useState<number | undefined>(undefined);
  return (
    <StudyCanvas
      course={course}
      seekSec={seekSec}
      tutor={
        <TutorTurnView
          turn={turn}
          spans={spans}
          onCitationSelected={(e: CitationSelected) => setSeekSec(e.startSec)}
        />
      }
    />
  );
}

describe('CitationSelected → player seek', () => {
  it('updates YouTube embed start= to SourceSpan.startSec', () => {
    render(<Harness />);

    const before = screen.getByTitle(/CS50P Lecture 0/i) as HTMLIFrameElement;
    expect(before.src).not.toMatch(/[?&]start=/);

    fireEvent.click(screen.getByRole('button', { name: /Functions/i }));

    const after = screen.getByTitle(/CS50P Lecture 0/i) as HTMLIFrameElement;
    expect(after.src).toContain('start=341');
  });
});
