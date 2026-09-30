import { describe, expect, it } from 'vitest';
import { assertValidSourceSpans } from './validateSpans';
import type { SourceSpan } from './types';

describe('assertValidSourceSpans', () => {
  const base: SourceSpan = {
    id: 'c:span-001',
    courseId: 'c',
    concept: 'A',
    startSec: 0,
    endSec: 10,
  };

  it('rejects endSec <= startSec', () => {
    expect(() =>
      assertValidSourceSpans([{ ...base, endSec: 0 }], 'c'),
    ).toThrow(/endSec/);
  });

  it('rejects courseId mismatch', () => {
    expect(() => assertValidSourceSpans([base], 'other')).toThrow(/courseId/);
  });

  it('rejects overlapping or unsorted spans', () => {
    expect(() =>
      assertValidSourceSpans(
        [
          base,
          { ...base, id: 'c:span-002', concept: 'B', startSec: 5, endSec: 15 },
        ],
        'c',
      ),
    ).toThrow(/order|overlap/i);
  });
});
