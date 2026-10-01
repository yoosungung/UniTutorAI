/** ReviewCard — ARCHITECTURE.md §2.4 */

export type ReviewCard = {
  id: string;
  sourceSpanId: string;
  summary: string;
  /** ISO-8601 — when the session closed. */
  createdAt: string;
  /** ISO-8601 — earliest time the card may surface on home / notify. */
  fadesAt: string;
};
