/** Domain events — ARCHITECTURE.md §2.5 */

/** Citation selected → player seeks to that SourceSpan.startSec. */
export type CitationSelected = {
  type: 'CitationSelected';
  sourceSpanId: string;
  startSec: number;
};

/** Stuck on a question → splice detour span with returnToSpanId. */
export type DetourInserted = {
  type: 'DetourInserted';
  detourSpanId: string;
  returnToSpanId: string;
};

/** Short check + feedback finished → one ReviewCard is created. */
export type SessionClosed = {
  type: 'SessionClosed';
  sourceSpanId: string;
  summary: string;
  /** ISO-8601 moment the session closed. */
  closedAt: string;
};

/** ReviewCard.fadesAt reached → home surface + notify candidate. */
export type CardFaded = {
  type: 'CardFaded';
  reviewCardId: string;
  sourceSpanId: string;
  /** Concept label used in the notification body. */
  concept: string;
};
