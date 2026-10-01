import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import { CS50P_LECTURE_0 } from '../data/cs50pLecture0';
import { clearLearnerState, loadLearnerState } from './storage';

afterEach(() => {
  cleanup();
  clearLearnerState(CS50P_LECTURE_0.id);
});

describe('App SessionClosed → ReviewCard smoke', () => {
  it('stores one ReviewCard in local learner state after session close', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /경로 만들기/i }));
    await user.click(
      screen.getByRole('button', { name: /세션 종료 — ReviewCard/i }),
    );

    expect(screen.getByLabelText('세션 종료 요약')).toBeInTheDocument();

    const saved = loadLearnerState(CS50P_LECTURE_0.id);
    expect(saved?.reviewCards).toHaveLength(1);
    const card = saved!.reviewCards[0];
    expect(card.sourceSpanId).toBeTruthy();
    expect(card.summary).toBeTruthy();
    expect(card.createdAt).toBeTruthy();
    expect(Date.parse(card.fadesAt)).toBeGreaterThan(Date.parse(card.createdAt));
  });
});
