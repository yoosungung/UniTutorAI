import {
  Rating,
  createEmptyCard,
  fsrs,
  generatorParameters,
  type FSRSParameters,
} from 'ts-fsrs';
import type { SessionClosed } from '../types/events';
import type { ReviewCard } from '../types/reviewCard';

/**
 * Local FSRS defaults for SessionClosed → ReviewCard.
 * enable_fuzz=false keeps fadesAt deterministic in tests/UI smoke.
 */
export const DEFAULT_FSRS_PARAMS: FSRSParameters = generatorParameters({
  enable_fuzz: false,
  enable_short_term: false,
});

const scheduler = fsrs(DEFAULT_FSRS_PARAMS);

export type CreateReviewCardOptions = {
  id: string;
};

/**
 * On SessionClosed, schedule a new FSRS card with Good (session completed)
 * and map card.due → ReviewCard.fadesAt.
 */
export function createReviewCardFromSessionClosed(
  event: SessionClosed,
  opts: CreateReviewCardOptions,
): ReviewCard {
  const closedAt = new Date(event.closedAt);
  const empty = createEmptyCard(closedAt);
  const { card } = scheduler.next(empty, closedAt, Rating.Good);
  const fadesAt =
    card.due instanceof Date ? card.due.toISOString() : new Date(card.due).toISOString();

  return {
    id: opts.id,
    sourceSpanId: event.sourceSpanId,
    summary: event.summary,
    createdAt: event.closedAt,
    fadesAt,
  };
}
