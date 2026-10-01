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

describe('App local-first learner state', () => {
  it('restores path current and wrong answers after remount (reload smoke)', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    expect(screen.getByLabelText('온보딩')).toBeInTheDocument();

    // Mark first concept known so path has a non-trivial current.
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(screen.getByRole('button', { name: /경로 만들기/i }));

    expect(screen.getByLabelText('학습 경로')).toBeInTheDocument();
    expect(
      screen.getByLabelText('학습 경로').querySelector('[data-placement="current"]'),
    ).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: /막힘 — 우회 삽입/i }),
    );
    expect(
      screen.getByLabelText('학습 경로').querySelector('[data-placement="detour"]'),
    ).toBeTruthy();

    const mid = loadLearnerState(CS50P_LECTURE_0.id);
    expect(mid?.path).toBeTruthy();
    expect(mid?.wrongAnswers.length).toBeGreaterThanOrEqual(1);
    const wrongSpan = mid!.wrongAnswers[0].sourceSpanId;

    unmount();

    // Simulate reload: new mount hydrates from localStorage.
    render(<App />);
    expect(
      screen.getByLabelText('학습 경로').querySelector('[data-placement="detour"]'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /우회 끝 — 원래 질문으로/i }),
    ).toBeInTheDocument();

    const restored = loadLearnerState(CS50P_LECTURE_0.id);
    expect(restored?.wrongAnswers[0].sourceSpanId).toBe(wrongSpan);
    expect(restored?.path?.some((p) => p.placement === 'detour')).toBe(true);
  });
});
