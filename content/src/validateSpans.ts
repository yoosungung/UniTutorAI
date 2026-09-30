import type { SourceSpan } from './types';

export function assertValidSourceSpans(
  spans: SourceSpan[],
  courseId: string,
): void {
  if (spans.length === 0) throw new Error('spans empty');

  let prevEnd = -Infinity;
  for (const span of spans) {
    if (span.courseId !== courseId) {
      throw new Error(`courseId mismatch: ${span.courseId} !== ${courseId}`);
    }
    if (!span.id || !span.concept) {
      throw new Error('id and concept required');
    }
    if (!(span.endSec > span.startSec)) {
      throw new Error(`endSec must be > startSec for ${span.id}`);
    }
    if (span.startSec < prevEnd) {
      throw new Error(`order/overlap at ${span.id}`);
    }
    prevEnd = span.endSec;
  }
}
