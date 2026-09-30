import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildSourceSpans } from './buildSpans';
import { parseSubtitles } from './parseSubtitles';
import { assertValidSourceSpans } from './validateSpans';
import type { ConceptMarker, CourseRef, SourceSpan } from './types';

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/cs50p-lecture0',
);

describe('cs50p-lecture0 fixture (batch once)', () => {
  it('reproduces committed SourceSpan JSON from VTT + concept markers', () => {
    const course = JSON.parse(
      readFileSync(join(fixtureDir, 'course.json'), 'utf8'),
    ) as CourseRef;
    const markers = JSON.parse(
      readFileSync(join(fixtureDir, 'concepts.json'), 'utf8'),
    ) as ConceptMarker[];
    const committed = JSON.parse(
      readFileSync(join(fixtureDir, 'sourceSpans.json'), 'utf8'),
    ) as SourceSpan[];
    const cues = parseSubtitles(
      readFileSync(join(fixtureDir, 'lecture0.vtt'), 'utf8'),
    );

    const spans = buildSourceSpans({
      courseId: course.id,
      markers,
      cues,
    });
    assertValidSourceSpans(spans, course.id);

    expect(course.playbackUrl).toContain('JP7ITIXGpHk');
    expect(spans.length).toBeGreaterThanOrEqual(10);
    expect(spans.every((s) => s.courseId === course.id)).toBe(true);
    expect(spans.every((s) => typeof s.slideLabel === 'string')).toBe(true);
    expect(spans).toEqual(committed);
  });
});
