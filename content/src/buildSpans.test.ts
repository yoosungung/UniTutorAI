import { describe, expect, it } from 'vitest';
import { buildSourceSpans } from './buildSpans';
import { assertValidSourceSpans } from './validateSpans';
import type { ConceptMarker, SubtitleCue } from './types';

describe('buildSourceSpans', () => {
  const courseId = 'cs50p-2022-lecture-0';
  const cues: SubtitleCue[] = [
    { startSec: 0, endSec: 10, text: 'intro' },
    { startSec: 10, endSec: 40, text: 'functions' },
    { startSec: 40, endSec: 60, text: 'bugs' },
  ];
  const markers: ConceptMarker[] = [
    { concept: 'Creating Code with Python', startSec: 0, slideLabel: 'Creating Code with Python' },
    { concept: 'Functions', startSec: 10, slideLabel: 'Functions' },
    { concept: 'Bugs', startSec: 40, slideLabel: 'Bugs' },
  ];

  it('maps ordered concept markers onto SourceSpan fields without runtime indexing', () => {
    const spans = buildSourceSpans({ courseId, markers, cues });
    expect(spans).toEqual([
      {
        id: 'cs50p-2022-lecture-0:span-001',
        courseId,
        concept: 'Creating Code with Python',
        startSec: 0,
        endSec: 10,
        slideLabel: 'Creating Code with Python',
      },
      {
        id: 'cs50p-2022-lecture-0:span-002',
        courseId,
        concept: 'Functions',
        startSec: 10,
        endSec: 40,
        slideLabel: 'Functions',
      },
      {
        id: 'cs50p-2022-lecture-0:span-003',
        courseId,
        concept: 'Bugs',
        startSec: 40,
        endSec: 60,
        slideLabel: 'Bugs',
      },
    ]);
  });

  it('omits slideLabel when marker has none', () => {
    const spans = buildSourceSpans({
      courseId,
      markers: [{ concept: 'Only', startSec: 0 }],
      cues,
    });
    expect(spans[0]).not.toHaveProperty('slideLabel');
    expect(spans[0].endSec).toBe(60);
  });

  it('produces spans that pass SourceSpan validation', () => {
    const spans = buildSourceSpans({ courseId, markers, cues });
    expect(() => assertValidSourceSpans(spans, courseId)).not.toThrow();
  });
});
