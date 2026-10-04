import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AD_REWARD_TUTOR_TURNS,
  DAILY_FREE_TUTOR_TURN_LIMIT,
  ENTITLEMENT_KEY,
  TUTOR_QUOTA_KEY,
  canShowTutorTurn,
  grantAdReward,
  loadEntitlement,
  loadTutorQuotaLedger,
  remainingFreeTurns,
  saveEntitlement,
  saveTutorQuotaLedger,
  setPaidUnlock,
  tryConsumeTutorTurn,
  utcDayKey,
  type TutorQuotaLedger,
} from './tutorQuota';

describe('DAILY_FREE_TUTOR_TURN_LIMIT', () => {
  it('is locked at 5 (ROADMAP product lock)', () => {
    expect(DAILY_FREE_TUTOR_TURN_LIMIT).toBe(5);
  });
});

describe('AD_REWARD_TUTOR_TURNS', () => {
  it('is locked at 3 (ROADMAP product lock)', () => {
    expect(AD_REWARD_TUTOR_TURNS).toBe(3);
  });
});

describe('canShowTutorTurn', () => {
  const day = '2026-10-02';

  it('allows free users under the daily cap', () => {
    const ledger: TutorQuotaLedger = {
      day,
      count: 4,
      consumedTurnIds: ['a', 'b', 'c', 'd'],
      bonusTurns: 0,
    };
    expect(canShowTutorTurn(ledger, { plan: 'free' })).toBe(true);
  });

  it('blocks free users at the daily cap', () => {
    const ledger: TutorQuotaLedger = {
      day,
      count: 5,
      consumedTurnIds: ['1', '2', '3', '4', '5'],
      bonusTurns: 0,
    };
    expect(canShowTutorTurn(ledger, { plan: 'free' })).toBe(false);
  });

  it('allows free users when ad bonus raises the effective cap', () => {
    const ledger: TutorQuotaLedger = {
      day,
      count: 5,
      consumedTurnIds: ['1', '2', '3', '4', '5'],
      bonusTurns: 3,
    };
    expect(canShowTutorTurn(ledger, { plan: 'free' })).toBe(true);
  });

  it('never blocks paid users', () => {
    const ledger: TutorQuotaLedger = {
      day,
      count: 99,
      consumedTurnIds: [],
      bonusTurns: 0,
    };
    expect(canShowTutorTurn(ledger, { plan: 'paid' })).toBe(true);
  });

  it('never blocks when BYOK is active (app inference cost $0)', () => {
    const ledger: TutorQuotaLedger = {
      day,
      count: 99,
      consumedTurnIds: [],
      bonusTurns: 0,
    };
    expect(canShowTutorTurn(ledger, { plan: 'free' }, 5, { byokActive: true })).toBe(
      true,
    );
  });

  it('never blocks when on-device is active (cloud inference cost $0)', () => {
    const ledger: TutorQuotaLedger = {
      day,
      count: 99,
      consumedTurnIds: [],
      bonusTurns: 0,
    };
    expect(
      canShowTutorTurn(ledger, { plan: 'free' }, 5, { onDeviceActive: true }),
    ).toBe(true);
  });
});

describe('tryConsumeTutorTurn', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('consumes a new turn id under the free cap', () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    const first = tryConsumeTutorTurn('turn-a', now);
    expect(first.allowed).toBe(true);
    expect(first.ledger.count).toBe(1);
    expect(first.ledger.consumedTurnIds).toEqual(['turn-a']);
    expect(loadTutorQuotaLedger(now).count).toBe(1);
    expect(remainingFreeTurns(now)).toBe(4);
  });

  it('does not double-count the same turn id on the same UTC day', () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    expect(tryConsumeTutorTurn('turn-a', now).ledger.count).toBe(1);
    expect(tryConsumeTutorTurn('turn-a', now).ledger.count).toBe(1);
  });

  it('denies a new turn when free cap is exhausted', () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    saveTutorQuotaLedger({
      day: utcDayKey(now),
      count: 5,
      consumedTurnIds: ['1', '2', '3', '4', '5'],
      bonusTurns: 0,
    });
    const result = tryConsumeTutorTurn('turn-new', now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('quota_exceeded');
    expect(result.ledger.count).toBe(5);
  });

  it('allows without counting when entitlement is paid', () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    saveEntitlement({ plan: 'paid' });
    saveTutorQuotaLedger({
      day: utcDayKey(now),
      count: 5,
      consumedTurnIds: ['1', '2', '3', '4', '5'],
      bonusTurns: 0,
    });
    const result = tryConsumeTutorTurn('turn-paid', now);
    expect(result.allowed).toBe(true);
    expect(result.ledger.count).toBe(5);
    expect(result.ledger.consumedTurnIds).not.toContain('turn-paid');
  });

  it('allows without counting when BYOK is active', () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    saveTutorQuotaLedger({
      day: utcDayKey(now),
      count: 5,
      consumedTurnIds: ['1', '2', '3', '4', '5'],
      bonusTurns: 0,
    });
    const result = tryConsumeTutorTurn('turn-byok', now, loadEntitlement(), 5, {
      byokActive: true,
    });
    expect(result.allowed).toBe(true);
    expect(result.ledger.count).toBe(5);
    expect(result.ledger.consumedTurnIds).not.toContain('turn-byok');
  });

  it('allows without counting when on-device is active', () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    saveTutorQuotaLedger({
      day: utcDayKey(now),
      count: 5,
      consumedTurnIds: ['1', '2', '3', '4', '5'],
      bonusTurns: 0,
    });
    const result = tryConsumeTutorTurn(
      'turn-on-device',
      now,
      loadEntitlement(),
      5,
      { onDeviceActive: true },
    );
    expect(result.allowed).toBe(true);
    expect(result.ledger.count).toBe(5);
    expect(result.ledger.consumedTurnIds).not.toContain('turn-on-device');
  });

  it('resets daily count when the UTC day rolls', () => {
    saveTutorQuotaLedger({
      day: '2026-10-01',
      count: 5,
      consumedTurnIds: ['old'],
      bonusTurns: 9,
    });
    const nextDay = new Date('2026-10-02T00:00:00.000Z');
    const result = tryConsumeTutorTurn('turn-fresh', nextDay);
    expect(result.allowed).toBe(true);
    expect(result.ledger.day).toBe('2026-10-02');
    expect(result.ledger.count).toBe(1);
    expect(result.ledger.bonusTurns).toBe(0);
  });
});

describe('grantAdReward', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('adds three bonus turns so an exhausted free user can continue', () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    saveTutorQuotaLedger({
      day: utcDayKey(now),
      count: 5,
      consumedTurnIds: ['1', '2', '3', '4', '5'],
      bonusTurns: 0,
    });
    expect(tryConsumeTutorTurn('turn-6', now).allowed).toBe(false);
    const ledger = grantAdReward(now);
    expect(ledger.bonusTurns).toBe(3);
    expect(remainingFreeTurns(now)).toBe(3);
    expect(tryConsumeTutorTurn('turn-6', now).allowed).toBe(true);
    expect(tryConsumeTutorTurn('turn-7', now).ledger.count).toBe(7);
    expect(remainingFreeTurns(now)).toBe(1);
  });
});

describe('setPaidUnlock', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists paid entitlement for the test stub CTA', () => {
    expect(loadEntitlement().plan).toBe('free');
    setPaidUnlock();
    expect(loadEntitlement()).toEqual({ plan: 'paid' });
    expect(localStorage.getItem(ENTITLEMENT_KEY)).toContain('paid');
    expect(localStorage.getItem(TUTOR_QUOTA_KEY)).toBeNull();
  });
});
