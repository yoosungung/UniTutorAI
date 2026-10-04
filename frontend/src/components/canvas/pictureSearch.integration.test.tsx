import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PictureSearch } from './PictureSearch';
import { StudyCanvas } from './StudyCanvas';
import type { CourseRef } from '../../types/course';
import type { CitationSelected } from '../../types/events';
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

function Harness() {
  const [seekSec, setSeekSec] = useState<number | undefined>(undefined);
  return (
    <StudyCanvas
      course={course}
      seekSec={seekSec}
      tutor={
        <PictureSearch
          spans={spans}
          onCitationSelected={(e: CitationSelected) => setSeekSec(e.startSec)}
        />
      }
    />
  );
}

describe('PictureSearch → CitationSelected seek', () => {
  it('updates YouTube embed start= from static slideLabel search', () => {
    render(<Harness />);

    fireEvent.change(screen.getByRole('searchbox', { name: /슬라이드|개념/i }), {
      target: { value: 'Functions' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Functions/i }));

    const iframe = screen.getByTitle(/CS50P Lecture 0/i) as HTMLIFrameElement;
    expect(iframe.src).toContain('start=341');
  });
});
