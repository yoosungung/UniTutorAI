import { describe, expect, it } from 'vitest';
import {
  CS50P_LECTURE_0,
  CS50P_LECTURE_0_DAG,
  CS50P_LECTURE_0_SPANS,
} from './cs50pLecture0';

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

  it('exposes knowledge DAG nodes matching SourceSpan ids', () => {
    expect(CS50P_LECTURE_0_DAG.courseId).toBe(CS50P_LECTURE_0.id);
    expect(CS50P_LECTURE_0_DAG.nodes).toEqual(
      CS50P_LECTURE_0_SPANS.map((s) => s.id),
    );
    expect(CS50P_LECTURE_0_DAG.edges).toHaveLength(
      CS50P_LECTURE_0_DAG.nodes.length - 1,
    );
  });
});
