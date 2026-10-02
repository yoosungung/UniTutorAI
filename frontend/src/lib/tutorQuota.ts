/** Locked in ROADMAP — free daily TutorTurn asks. */
export const DAILY_FREE_TUTOR_TURN_LIMIT = 5 as const;
export const DAILY_FREE_TUTOR_TURNS = DAILY_FREE_TUTOR_TURN_LIMIT;

/** Locked in ROADMAP — rewarded ad grants this many extra turns per watch. */
export const AD_REWARD_TUTOR_TURNS = 3 as const;

export const TUTOR_QUOTA_KEY = 'unitutor:tutor-quota';
export const ENTITLEMENT_KEY = 'unitutor:entitlement';

export type TutorQuotaLedger = {
  /** UTC calendar day YYYY-MM-DD */
  day: string;
  count: number;
  consumedTurnIds: string[];
  /** Extra turns from rewarded-ad stubs (same UTC day). */
  bonusTurns: number;
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
  return { day, count: 0, consumedTurnIds: [], bonusTurns: 0 };
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

export function effectiveFreeLimit(
  ledger: TutorQuotaLedger,
  base: number = DAILY_FREE_TUTOR_TURN_LIMIT,
): number {
  return base + Math.max(0, ledger.bonusTurns);
}

export function saveTutorQuotaLedger(ledger: TutorQuotaLedger): boolean {
  return writeRaw(TUTOR_QUOTA_KEY, JSON.stringify(ledger));
}

/** Load ledger; roll count/bonus to 0 when the UTC day changes. */
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
    const bonusTurns =
      typeof data.bonusTurns === 'number' && data.bonusTurns >= 0
        ? data.bonusTurns
        : 0;
    return { day, count, consumedTurnIds, bonusTurns };
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

/**
 * Stub rewarded-ad watch — grants AD_REWARD_TUTOR_TURNS without an ad SDK.
 * App inference cost is treated as offset by the ad path (PRODUCT §6).
 */
export function grantAdReward(
  now: Date = new Date(),
  reward: number = AD_REWARD_TUTOR_TURNS,
): TutorQuotaLedger {
  const day = utcDayKey(now);
  let ledger = loadTutorQuotaLedger(now);
  if (ledger.day !== day) ledger = emptyLedger(day);
  const next: TutorQuotaLedger = {
    ...ledger,
    day,
    bonusTurns: ledger.bonusTurns + Math.max(0, reward),
  };
  saveTutorQuotaLedger(next);
  return next;
}

export function remainingFreeTurns(
  now: Date = new Date(),
  base: number = DAILY_FREE_TUTOR_TURN_LIMIT,
): number {
  const ledger = loadTutorQuotaLedger(now);
  return Math.max(0, effectiveFreeLimit(ledger, base) - ledger.count);
}

export type TutorQuotaOptions = {
  /** When true, app inference cost is $0 — do not gate or charge free quota. */
  byokActive?: boolean;
};

export function canShowTutorTurn(
  ledger: TutorQuotaLedger,
  entitlement: TutorEntitlement,
  base: number = DAILY_FREE_TUTOR_TURN_LIMIT,
  options: TutorQuotaOptions = {},
): boolean {
  if (options.byokActive) return true;
  if (entitlement.plan === 'paid') return true;
  return ledger.count < effectiveFreeLimit(ledger, base);
}

/**
 * Reserve one free TutorTurn for `turnId` (idempotent per UTC day).
 * Paid entitlement and BYOK always allow and never increment the free ledger.
 */
export function tryConsumeTutorTurn(
  turnId: string,
  now: Date = new Date(),
  entitlement: TutorEntitlement = loadEntitlement(),
  base: number = DAILY_FREE_TUTOR_TURN_LIMIT,
  options: TutorQuotaOptions = {},
): TryConsumeResult {
  const day = utcDayKey(now);
  let ledger = loadTutorQuotaLedger(now);
  if (ledger.day !== day) ledger = emptyLedger(day);

  if (options.byokActive || entitlement.plan === 'paid') {
    return { allowed: true, ledger, entitlement };
  }

  if (ledger.consumedTurnIds.includes(turnId)) {
    return { allowed: true, ledger, entitlement };
  }

  const limit = effectiveFreeLimit(ledger, base);
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
    bonusTurns: ledger.bonusTurns,
  };
  saveTutorQuotaLedger(next);
  return { allowed: true, ledger: next, entitlement };
}
