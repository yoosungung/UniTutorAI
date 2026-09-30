import { lectureEndSec } from './parseSubtitles';
import type { ConceptMarker, SourceSpan, SubtitleCue } from './types';

export type BuildSourceSpansInput = {
  courseId: string;
  markers: ConceptMarker[];
  cues: SubtitleCue[];
};

function spanId(courseId: string, index: number): string {
  return `${courseId}:span-${String(index + 1).padStart(3, '0')}`;
}

/**
 * One-shot batch: concept markers + subtitle duration → static SourceSpan[].
 * Does not index text at runtime.
 */
export function buildSourceSpans(input: BuildSourceSpansInput): SourceSpan[] {
  const { courseId, markers, cues } = input;
  if (markers.length === 0) throw new Error('markers required');

  const sorted = [...markers].sort((a, b) => a.startSec - b.startSec);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startSec < sorted[i - 1].startSec) {
      throw new Error('markers must be non-decreasing by startSec');
    }
    if (sorted[i].startSec === sorted[i - 1].startSec) {
      throw new Error(`duplicate marker startSec at ${sorted[i].startSec}`);
    }
  }

  const end = lectureEndSec(cues);
  const spans: SourceSpan[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const marker = sorted[i];
    const endSec = i + 1 < sorted.length ? sorted[i + 1].startSec : end;
    if (endSec <= marker.startSec) {
      throw new Error(
        `invalid range for "${marker.concept}": ${marker.startSec}..${endSec}`,
      );
    }

    const span: SourceSpan = {
      id: spanId(courseId, i),
      courseId,
      concept: marker.concept,
      startSec: marker.startSec,
      endSec,
    };
    if (marker.slideLabel !== undefined && marker.slideLabel !== '') {
      span.slideLabel = marker.slideLabel;
    }
    spans.push(span);
  }

  return spans;
}
