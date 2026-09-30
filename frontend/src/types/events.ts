/** Domain events — ARCHITECTURE.md §2.5 */

/** Citation selected → player seeks to that SourceSpan.startSec. */
export type CitationSelected = {
  type: 'CitationSelected';
  sourceSpanId: string;
  startSec: number;
};
