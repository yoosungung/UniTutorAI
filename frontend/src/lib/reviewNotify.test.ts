import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReviewCard } from '../types/reviewCard';
import {
  DAILY_REVIEW_NOTIFY_LIMIT,
  REVIEW_NOTIFY_KEY,
  formatReviewNotifyBody,
  loadNotifyLedger,
  processCardFadedNotifications,
  saveNotifyLedger,
  selectFadedCards,
  takeWithinDailyLimit,
  utcDayKey,
  type ReviewNotifyLedger,
} from './reviewNotify';

function card(
  overrides: Partial<ReviewCard> & Pick<ReviewCard, 'id' | 'fadesAt'>,
): ReviewCard {
  return {
    sourceSpanId: `span-${overrides.id}`,
    summary: '요약',
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('selectFadedCards', () => {
  const now = '2026-10-02T12:00:00.000Z';

  it('returns only cards whose fadesAt has passed and are not yet notified', () => {
    const cards = [
      card({ id: 'a', fadesAt: '2026-10-02T11:00:00.000Z' }),
      card({ id: 'b', fadesAt: '2026-10-02T13:00:00.000Z' }),
      card({ id: 'c', fadesAt: '2026-10-01T00:00:00.000Z' }),
    ];
    expect(selectFadedCards(cards, now, ['c']).map((x) => x.id)).toEqual([
      'a',
    ]);
  });
});

describe('takeWithinDailyLimit', () => {
  it('caps at DAILY_REVIEW_NOTIFY_LIMIT (3) remaining for the day', () => {
    expect(DAILY_REVIEW_NOTIFY_LIMIT).toBe(3);
    const cards = [
      card({ id: '1', fadesAt: '2026-10-01T00:00:00.000Z' }),
      card({ id: '2', fadesAt: '2026-10-01T00:00:00.000Z' }),
      card({ id: '3', fadesAt: '2026-10-01T00:00:00.000Z' }),
      card({ id: '4', fadesAt: '2026-10-01T00:00:00.000Z' }),
    ];
    expect(takeWithinDailyLimit(cards, 0).map((c) => c.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(takeWithinDailyLimit(cards, 2).map((c) => c.id)).toEqual(['1']);
    expect(takeWithinDailyLimit(cards, 3)).toEqual([]);
  });
});

describe('formatReviewNotifyBody', () => {
  it('includes the concept name in the PRODUCT copy shape', () => {
    expect(formatReviewNotifyBody('선형변환')).toBe(
      '선형변환, 2분이면 확인할 수 있어요.',
    );
  });
});

describe('notify ledger localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('round-trips ledger and resets count when the UTC day changes', () => {
    const stored: ReviewNotifyLedger = {
      day: '2026-10-01',
      count: 2,
      notifiedCardIds: ['old'],
    };
    expect(saveNotifyLedger(stored)).toBe(true);
    expect(loadNotifyLedger(new Date('2026-10-01T15:00:00.000Z'))).toEqual(
      stored,
    );
    expect(loadNotifyLedger(new Date('2026-10-02T01:00:00.000Z'))).toEqual({
      day: '2026-10-02',
      count: 0,
      notifiedCardIds: ['old'],
    });
    expect(localStorage.getItem(REVIEW_NOTIFY_KEY)).toBeTruthy();
  });
});

describe('processCardFadedNotifications', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('skips when notification permission is not granted', async () => {
    const show = vi.fn();
    const result = await processCardFadedNotifications({
      cards: [card({ id: 'a', fadesAt: '2026-10-01T00:00:00.000Z' })],
      spans: [{ id: 'span-a', concept: '함수' }],
      now: new Date('2026-10-02T12:00:00.000Z'),
      permission: 'default',
      showNotification: show,
    });
    expect(show).not.toHaveBeenCalled();
    expect(result.events).toEqual([]);
  });

  it('emits CardFaded and shows SW-style notify up to the daily limit', async () => {
    const show = vi.fn(async () => undefined);
    const cards = [
      card({
        id: 'a',
        sourceSpanId: 'span-a',
        fadesAt: '2026-10-01T00:00:00.000Z',
      }),
      card({
        id: 'b',
        sourceSpanId: 'span-b',
        fadesAt: '2026-10-01T00:00:00.000Z',
      }),
      card({
        id: 'c',
        sourceSpanId: 'span-c',
        fadesAt: '2026-10-01T00:00:00.000Z',
      }),
      card({
        id: 'd',
        sourceSpanId: 'span-d',
        fadesAt: '2026-10-01T00:00:00.000Z',
      }),
    ];
    const spans = [
      { id: 'span-a', concept: '함수' },
      { id: 'span-b', concept: '변수' },
      { id: 'span-c', concept: '조건' },
      { id: 'span-d', concept: '루프' },
    ];
    const now = new Date('2026-10-02T12:00:00.000Z');
    const result = await processCardFadedNotifications({
      cards,
      spans,
      now,
      permission: 'granted',
      showNotification: show,
    });

    expect(result.events).toHaveLength(3);
    expect(result.events.every((e) => e.type === 'CardFaded')).toBe(true);
    expect(result.events.map((e) => e.concept)).toEqual([
      '함수',
      '변수',
      '조건',
    ]);
    expect(show).toHaveBeenCalledTimes(3);
    expect(show).toHaveBeenCalledWith('UniTutor', {
      body: '함수, 2분이면 확인할 수 있어요.',
      tag: 'review-a',
    });
    expect(result.ledger.count).toBe(3);
    expect(result.ledger.day).toBe(utcDayKey(now));
    expect(result.ledger.notifiedCardIds).toEqual(['a', 'b', 'c']);

    const again = await processCardFadedNotifications({
      cards,
      spans,
      now,
      permission: 'granted',
      showNotification: show,
    });
    expect(again.events).toEqual([]);
    expect(show).toHaveBeenCalledTimes(3);
  });

  it('does not exceed the daily cap when two processors race', async () => {
    const show = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(resolve, 30)),
    );
    const cards = [
      card({
        id: 'a',
        sourceSpanId: 'span-a',
        fadesAt: '2026-10-01T00:00:00.000Z',
      }),
      card({
        id: 'b',
        sourceSpanId: 'span-b',
        fadesAt: '2026-10-01T00:00:00.000Z',
      }),
      card({
        id: 'c',
        sourceSpanId: 'span-c',
        fadesAt: '2026-10-01T00:00:00.000Z',
      }),
      card({
        id: 'd',
        sourceSpanId: 'span-d',
        fadesAt: '2026-10-01T00:00:00.000Z',
      }),
    ];
    const spans = [
      { id: 'span-a', concept: '함수' },
      { id: 'span-b', concept: '변수' },
      { id: 'span-c', concept: '조건' },
      { id: 'span-d', concept: '루프' },
    ];
    const now = new Date('2026-10-02T12:00:00.000Z');
    const input = {
      cards,
      spans,
      now,
      permission: 'granted' as const,
      showNotification: show,
    };
    const [first, second] = await Promise.all([
      processCardFadedNotifications(input),
      processCardFadedNotifications(input),
    ]);
    const totalEvents = first.events.length + second.events.length;
    expect(totalEvents).toBe(3);
    expect(show).toHaveBeenCalledTimes(3);
    expect(loadNotifyLedger(now).count).toBe(3);
  });
});
