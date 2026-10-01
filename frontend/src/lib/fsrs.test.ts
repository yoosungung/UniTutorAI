import { describe, expect, it } from 'vitest';
import type { SessionClosed } from '../types/events';
import {
  DEFAULT_FSRS_PARAMS,
  createReviewCardFromSessionClosed,
} from './fsrs';

describe('createReviewCardFromSessionClosed', () => {
  const closedAt = '2026-10-01T12:00:00.000Z';
  const event: SessionClosed = {
    type: 'SessionClosed',
    sourceSpanId: 'span-functions',
    summary: '함수와 변수 장면을 짧게 확인했습니다.',
    closedAt,
  };

  it('builds one ReviewCard with contract fields from SessionClosed', () => {
    const card = createReviewCardFromSessionClosed(event, {
      id: 'review-1',
    });

    expect(card).toEqual({
      id: 'review-1',
      sourceSpanId: 'span-functions',
      summary: event.summary,
      createdAt: closedAt,
      fadesAt: expect.any(String),
    });
    expect(Date.parse(card.fadesAt)).toBeGreaterThan(Date.parse(closedAt));
  });

  it('uses local default FSRS params (no fuzz) so fadesAt is stable', () => {
    const a = createReviewCardFromSessionClosed(event, { id: 'a' });
    const b = createReviewCardFromSessionClosed(event, { id: 'b' });
    expect(a.fadesAt).toBe(b.fadesAt);
    expect(DEFAULT_FSRS_PARAMS.enable_fuzz).toBe(false);
  });
});
