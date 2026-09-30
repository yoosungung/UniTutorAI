import { describe, expect, it } from 'vitest';
import { CS50P_LECTURE_0, CS50P_LECTURE_0_SPANS } from './cs50pLecture0';

describe('cs50pLecture0 static fixture', () => {
  it('exposes CourseRef and SourceSpans without runtime indexing', () => {
    expect(CS50P_LECTURE_0.id).toBe('cs50p-2022-lecture-0');
    expect(CS50P_LECTURE_0.playbackUrl).toContain('JP7ITIXGpHk');
    expect(CS50P_LECTURE_0_SPANS.length).toBeGreaterThanOrEqual(10);
    expect(
      CS50P_LECTURE_0_SPANS.every((s) => s.courseId === CS50P_LECTURE_0.id),
    ).toBe(true);
    for (let i = 1; i < CS50P_LECTURE_0_SPANS.length; i++) {
      expect(CS50P_LECTURE_0_SPANS[i].startSec).toBe(
        CS50P_LECTURE_0_SPANS[i - 1].endSec,
      );
    }
  });
});
