import type { CitationSelected } from '../types/events';
import type { SourceSpan } from '../types/sourceSpan';

/** Build CitationSelected from a citation id and known SourceSpans. */
export function resolveCitationSelected(
  sourceSpanId: string,
  spans: SourceSpan[],
): CitationSelected {
  const span = spans.find((s) => s.id === sourceSpanId);
  if (!span) {
    throw new Error(`Unknown SourceSpan id for citation: ${sourceSpanId}`);
  }
  return {
    type: 'CitationSelected',
    sourceSpanId: span.id,
    startSec: span.startSec,
  };
}
