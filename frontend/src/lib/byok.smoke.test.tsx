import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import { CS50P_LECTURE_0 } from '../data/cs50pLecture0';
import { clearByokApiKey, hasByokApiKey, loadByokApiKey } from './byok';
import { clearLearnerState } from './storage';
import {
  DAILY_FREE_TUTOR_TURN_LIMIT,
  saveEntitlement,
  saveTutorQuotaLedger,
  utcDayKey,
} from './tutorQuota';

afterEach(() => {
  cleanup();
  clearLearnerState(CS50P_LECTURE_0.id);
  clearByokApiKey();
  localStorage.clear();
});

describe('BYOK smoke', () => {
  it('registers a key from QuotaGate and restores TutorTurn without consuming quota', async () => {
    const user = userEvent.setup();
    const day = utcDayKey(new Date());
    saveTutorQuotaLedger({
      day,
      count: DAILY_FREE_TUTOR_TURN_LIMIT,
      consumedTurnIds: ['1', '2', '3', '4', '5'],
      bonusTurns: 0,
    });
    saveEntitlement({ plan: 'free' });

    render(<App />);
    await user.click(screen.getByRole('button', { name: /경로 만들기/i }));

    expect(screen.getByRole('region', { name: '무료 문답 한도' })).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/Gemini API 키/i),
      'AIza-smoke-byok-key',
    );
    await user.click(screen.getByRole('button', { name: /API 키 등록/i }));

    expect(hasByokApiKey()).toBe(true);
    expect(loadByokApiKey()).toBe('AIza-smoke-byok-key');
    expect(
      screen.queryByRole('region', { name: '무료 문답 한도' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/장면에서, 핵심을 한 문장으로/)).toBeInTheDocument();
  });

  it('clears a registered key from the BYOK panel', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /경로 만들기/i }));

    await user.type(
      screen.getByLabelText(/Gemini API 키/i),
      'AIza-to-clear',
    );
    await user.click(screen.getByRole('button', { name: /API 키 등록/i }));
    expect(hasByokApiKey()).toBe(true);

    await user.click(screen.getByRole('button', { name: /API 키 해제/i }));
    expect(hasByokApiKey()).toBe(false);
  });
});
