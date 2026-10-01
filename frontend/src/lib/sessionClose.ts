import type { SessionClosed } from '../types/events';
import type { ReviewCard } from '../types/reviewCard';
import { createReviewCardFromSessionClosed } from './fsrs';
import { appendReviewCard, type LearnerState } from './storage';

export type CloseSessionInput = {
  state: LearnerState;
  sourceSpanId: string;
  summary: string;
  closedAt: string;
  cardId: string;
};

export type CloseSessionResult = {
  event: SessionClosed;
  card: ReviewCard;
  state: LearnerState;
};

/** Emit SessionClosed and append the resulting ReviewCard to local learner state. */
export function closeSession(input: CloseSessionInput): CloseSessionResult {
  const event: SessionClosed = {
    type: 'SessionClosed',
    sourceSpanId: input.sourceSpanId,
    summary: input.summary,
    closedAt: input.closedAt,
  };
  const card = createReviewCardFromSessionClosed(event, { id: input.cardId });
  return {
    event,
    card,
    state: appendReviewCard(input.state, card),
  };
}
