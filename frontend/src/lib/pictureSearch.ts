import type { SourceSpan } from '../types/sourceSpan';

/**
 * Client-side search over static SourceSpan slideLabel/concept (no vision/embedding).
 * Blank query → []; order follows the fixture list; ids are unique.
 */
export function searchPictureSpans(
  spans: SourceSpan[],
  query: string,
): SourceSpan[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return spans.filter((span) => {
    const label = span.slideLabel?.toLowerCase() ?? '';
    const concept = span.concept.toLowerCase();
    return label.includes(q) || concept.includes(q);
  });
}
