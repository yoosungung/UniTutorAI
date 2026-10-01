/** Locked in ROADMAP — free daily TutorTurn asks. */
export const DAILY_FREE_TUTOR_TURN_LIMIT = 5 as const;
export const DAILY_FREE_TUTOR_TURNS = DAILY_FREE_TUTOR_TURN_LIMIT;

export const TUTOR_QUOTA_KEY = 'unitutor:tutor-quota';
export const ENTITLEMENT_KEY = 'unitutor:entitlement';

export type TutorQuotaLedger = {
  /** UTC calendar day YYYY-MM-DD */
  day: string;
  count: number;
  consumedTurnIds: string[];
};

export type TutorEntitlement = {
  plan: 'free' | 'paid';
};

export type TryConsumeResult = {
  allowed: boolean;
  reason?: 'quota_exceeded';
  ledger: TutorQuotaLedger;
  entitlement: TutorEntitlement;
};

export function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function emptyLedger(day: string): TutorQuotaLedger {
  return { day, count: 0, consumedTurnIds: [] };
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

export function saveTutorQuotaLedger(ledger: TutorQuotaLedger): boolean {
  return writeRaw(TUTOR_QUOTA_KEY, JSON.stringify(ledger));
}

/** Load ledger; roll count to 0 when the UTC day changes. */
export function loadTutorQuotaLedger(now: Date = new Date()): TutorQuotaLedger {
  const day = utcDayKey(now);
  const raw = readRaw(TUTOR_QUOTA_KEY);
  if (!raw) return emptyLedger(day);
  try {
    const data = JSON.parse(raw) as Partial<TutorQuotaLedger>;
    if (data.day !== day) return emptyLedger(day);
    const consumedTurnIds = Array.isArray(data.consumedTurnIds)
      ? data.consumedTurnIds.filter((id) => typeof id === 'string')
      : [];
    const count =
      typeof data.count === 'number' && data.count >= 0 ? data.count : 0;
    return { day, count, consumedTurnIds };
  } catch {
    return emptyLedger(day);
  }
}

export function saveEntitlement(entitlement: TutorEntitlement): boolean {
  return writeRaw(ENTITLEMENT_KEY, JSON.stringify(entitlement));
}

export function loadEntitlement(): TutorEntitlement {
  const raw = readRaw(ENTITLEMENT_KEY);
  if (!raw) return { plan: 'free' };
  try {
    const data = JSON.parse(raw) as Partial<TutorEntitlement>;
    if (data.plan === 'paid') return { plan: 'paid' };
    return { plan: 'free' };
  } catch {
    return { plan: 'free' };
  }
}

export function isPaidUnlocked(): boolean {
  return loadEntitlement().plan === 'paid';
}

/** Stub / test paid unlock — no payment vendor. */
export function setPaidUnlock(): TutorEntitlement {
  const next: TutorEntitlement = { plan: 'paid' };
  saveEntitlement(next);
  return next;
}

export function remainingFreeTurns(
  now: Date = new Date(),
  limit: number = DAILY_FREE_TUTOR_TURN_LIMIT,
): number {
  return Math.max(0, limit - loadTutorQuotaLedger(now).count);
}

export function canShowTutorTurn(
  ledger: TutorQuotaLedger,
  entitlement: TutorEntitlement,
  limit: number = DAILY_FREE_TUTOR_TURN_LIMIT,
): boolean {
  if (entitlement.plan === 'paid') return true;
  return ledger.count < limit;
}

/**
 * Reserve one free TutorTurn for `turnId` (idempotent per UTC day).
 * Paid entitlement always allows and never increments the free ledger.
 */
export function tryConsumeTutorTurn(
  turnId: string,
  now: Date = new Date(),
  entitlement: TutorEntitlement = loadEntitlement(),
  limit: number = DAILY_FREE_TUTOR_TURN_LIMIT,
): TryConsumeResult {
  const day = utcDayKey(now);
  let ledger = loadTutorQuotaLedger(now);
  if (ledger.day !== day) ledger = emptyLedger(day);

  if (entitlement.plan === 'paid') {
    return { allowed: true, ledger, entitlement };
  }

  if (ledger.consumedTurnIds.includes(turnId)) {
    return { allowed: true, ledger, entitlement };
  }

  if (ledger.count >= limit) {
    return {
      allowed: false,
      reason: 'quota_exceeded',
      ledger,
      entitlement,
    };
  }

  const next: TutorQuotaLedger = {
    day,
    count: ledger.count + 1,
    consumedTurnIds: [...ledger.consumedTurnIds, turnId],
  };
  saveTutorQuotaLedger(next);
  return { allowed: true, ledger: next, entitlement };
}
