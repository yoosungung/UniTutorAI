import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import { CS50P_LECTURE_0 } from '../data/cs50pLecture0';
import { clearLearnerState } from './storage';
import {
  AD_REWARD_TUTOR_TURNS,
  DAILY_FREE_TUTOR_TURN_LIMIT,
  saveEntitlement,
  saveTutorQuotaLedger,
  utcDayKey,
} from './tutorQuota';

afterEach(() => {
  cleanup();
  clearLearnerState(CS50P_LECTURE_0.id);
  localStorage.clear();
});

describe('free tutor quota smoke', () => {
  it('shows the paid CTA when the free daily cap is exhausted', async () => {
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
    expect(
      screen.getByRole('button', { name: '유료로 문답 해제 (테스트)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: `광고 보고 ${AD_REWARD_TUTOR_TURNS}회 충전 (테스트)`,
      }),
    ).toBeInTheDocument();
  });

  it('keeps TutorTurn available after the paid test unlock', async () => {
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
    await user.click(
      screen.getByRole('button', { name: '유료로 문답 해제 (테스트)' }),
    );

    expect(
      screen.queryByRole('region', { name: '무료 문답 한도' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Tutor/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/장면에서, 핵심을 한 문장으로/)).toBeInTheDocument();
  });

  it('restores TutorTurn after the rewarded-ad stub grants three turns', async () => {
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
    await user.click(
      screen.getByRole('button', {
        name: `광고 보고 ${AD_REWARD_TUTOR_TURNS}회 충전 (테스트)`,
      }),
    );

    expect(
      screen.queryByRole('region', { name: '무료 문답 한도' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/장면에서, 핵심을 한 문장으로/)).toBeInTheDocument();
  });
});
