import type { CardFaded } from '../types/events';
import type { ReviewCard } from '../types/reviewCard';

/** Locked in ROADMAP — again-view notify daily cap. */
export const DAILY_REVIEW_NOTIFY_LIMIT = 3 as const;

export const REVIEW_NOTIFY_KEY = 'unitutor:review-notify';

export type ReviewNotifyLedger = {
  /** UTC calendar day YYYY-MM-DD */
  day: string;
  count: number;
  notifiedCardIds: string[];
};

export type ConceptSpan = {
  id: string;
  concept: string;
};

export type ShowNotificationFn = (
  title: string,
  options: { body: string; tag?: string },
) => Promise<void>;

export function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** PRODUCT §4.1 copy shape. */
export function formatReviewNotifyBody(concept: string): string {
  return `${concept}, 2분이면 확인할 수 있어요.`;
}

export function selectFadedCards(
  cards: ReviewCard[],
  nowIso: string,
  notifiedCardIds: ReadonlySet<string> | readonly string[],
): ReviewCard[] {
  const notified = new Set(notifiedCardIds);
  const now = Date.parse(nowIso);
  return cards.filter(
    (c) => Date.parse(c.fadesAt) <= now && !notified.has(c.id),
  );
}

export function takeWithinDailyLimit(
  candidates: ReviewCard[],
  alreadyToday: number,
  limit: number = DAILY_REVIEW_NOTIFY_LIMIT,
): ReviewCard[] {
  const remaining = Math.max(0, limit - alreadyToday);
  return candidates.slice(0, remaining);
}

function emptyLedger(day: string, notifiedCardIds: string[] = []): ReviewNotifyLedger {
  return { day, count: 0, notifiedCardIds };
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function saveNotifyLedger(ledger: ReviewNotifyLedger): boolean {
  return writeRaw(REVIEW_NOTIFY_KEY, JSON.stringify(ledger));
}

/** Load ledger; roll daily count to 0 when the UTC day changes (ids kept). */
export function loadNotifyLedger(now: Date = new Date()): ReviewNotifyLedger {
  const day = utcDayKey(now);
  const raw = readRaw(REVIEW_NOTIFY_KEY);
  if (!raw) return emptyLedger(day);
  try {
    const data = JSON.parse(raw) as Partial<ReviewNotifyLedger>;
    const notifiedCardIds = Array.isArray(data.notifiedCardIds)
      ? data.notifiedCardIds.filter((id) => typeof id === 'string')
      : [];
    if (data.day !== day) {
      return emptyLedger(day, notifiedCardIds);
    }
    const count = typeof data.count === 'number' && data.count >= 0 ? data.count : 0;
    return { day, count, notifiedCardIds };
  } catch {
    return emptyLedger(day);
  }
}

export function conceptForSpan(
  sourceSpanId: string,
  spans: ConceptSpan[],
): string {
  return spans.find((s) => s.id === sourceSpanId)?.concept ?? sourceSpanId;
}

export type ProcessCardFadedInput = {
  cards: ReviewCard[];
  spans: ConceptSpan[];
  now: Date;
  permission: NotificationPermission;
  showNotification: ShowNotificationFn;
  /** Optional seed ledger (tests); default loads from localStorage. */
  ledger?: ReviewNotifyLedger;
};

export type ProcessCardFadedResult = {
  events: CardFaded[];
  ledger: ReviewNotifyLedger;
};

/**
 * When permission is granted, emit CardFaded + SW/Notification for faded
 * ReviewCards, respecting the daily cap. Subscription state stays FE-local.
 */
export async function processCardFadedNotifications(
  input: ProcessCardFadedInput,
): Promise<ProcessCardFadedResult> {
  const day = utcDayKey(input.now);
  let ledger = input.ledger ?? loadNotifyLedger(input.now);
  if (ledger.day !== day) {
    ledger = emptyLedger(day, ledger.notifiedCardIds);
  }

  if (input.permission !== 'granted') {
    return { events: [], ledger };
  }

  const candidates = selectFadedCards(
    input.cards,
    input.now.toISOString(),
    ledger.notifiedCardIds,
  );
  const toNotify = takeWithinDailyLimit(candidates, ledger.count);
  if (toNotify.length === 0) {
    return { events: [], ledger };
  }

  // Reserve the daily budget before awaiting Notification/SW so concurrent
  // processors cannot exceed DAILY_REVIEW_NOTIFY_LIMIT.
  const next: ReviewNotifyLedger = {
    day,
    count: ledger.count + toNotify.length,
    notifiedCardIds: [
      ...ledger.notifiedCardIds,
      ...toNotify.map((c) => c.id),
    ],
  };
  saveNotifyLedger(next);

  const events: CardFaded[] = [];
  for (const c of toNotify) {
    const concept = conceptForSpan(c.sourceSpanId, input.spans);
    const body = formatReviewNotifyBody(concept);
    await input.showNotification('UniTutor', {
      body,
      tag: `review-${c.id}`,
    });
    events.push({
      type: 'CardFaded',
      reviewCardId: c.id,
      sourceSpanId: c.sourceSpanId,
      concept,
    });
  }

  return { events, ledger: next };
}

/** Register SW from Vite `public/sw.js` (copied to site root). */
export async function ensureReviewServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function requestReviewNotifyPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Prefer SW showNotification; fall back to page Notification. */
export async function showReviewNotification(
  title: string,
  options: { body: string; tag?: string },
): Promise<void> {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body: options.body,
        tag: options.tag,
      });
      return;
    } catch {
      /* fall through */
    }
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    const _n = new Notification(title, {
      body: options.body,
      tag: options.tag,
    });
    void _n;
  }
}
