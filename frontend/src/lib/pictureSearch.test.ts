import { describe, expect, it } from 'vitest';
import { searchPictureSpans } from './pictureSearch';
import type { SourceSpan } from '../types/sourceSpan';

const spans: SourceSpan[] = [
  {
    id: 'span-a',
    courseId: 'c',
    concept: 'Functions',
    startSec: 341,
    endSec: 468,
    slideLabel: 'Functions',
  },
  {
    id: 'span-b',
    courseId: 'c',
    concept: 'Bugs',
    startSec: 468,
    endSec: 766,
    slideLabel: 'Bugs',
  },
  {
    id: 'span-c',
    courseId: 'c',
    concept: 'Improving Your First Python Program',
    startSec: 766,
    endSec: 948,
    slideLabel: 'Improving Your First Python Program',
  },
  {
    id: 'span-d',
    courseId: 'c',
    concept: 'Variables',
    startSec: 948,
    endSec: 1214,
    // no slideLabel — still searchable via concept
  },
];

describe('searchPictureSpans', () => {
  it('returns empty for blank query', () => {
    expect(searchPictureSpans(spans, '   ')).toEqual([]);
  });

  it('matches slideLabel case-insensitively', () => {
    expect(searchPictureSpans(spans, 'func').map((s) => s.id)).toEqual([
      'span-a',
    ]);
  });

  it('matches concept when slideLabel is absent', () => {
    expect(searchPictureSpans(spans, 'vari').map((s) => s.id)).toEqual([
      'span-d',
    ]);
  });

  it('matches either field and preserves fixture order', () => {
    expect(searchPictureSpans(spans, 'ing').map((s) => s.id)).toEqual([
      'span-c',
    ]);
  });

  it('dedupes by id when both fields match', () => {
    expect(searchPictureSpans(spans, 'bugs')).toHaveLength(1);
  });
});
