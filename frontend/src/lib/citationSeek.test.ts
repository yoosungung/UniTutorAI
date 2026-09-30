import { describe, expect, it } from 'vitest';
import { resolveCitationSelected } from './citationSeek';
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
  },
];

describe('resolveCitationSelected', () => {
  it('maps citation SourceSpan.id to CitationSelected with startSec', () => {
    expect(resolveCitationSelected('span-a', spans)).toEqual({
      type: 'CitationSelected',
      sourceSpanId: 'span-a',
      startSec: 341,
    });
  });

  it('throws when citation id is unknown', () => {
    expect(() => resolveCitationSelected('missing', spans)).toThrow(/SourceSpan/);
  });
});
