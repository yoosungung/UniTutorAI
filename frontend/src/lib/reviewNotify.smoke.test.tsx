import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';
import { CS50P_LECTURE_0 } from '../data/cs50pLecture0';
import { clearLearnerState } from './storage';

afterEach(() => {
  cleanup();
  clearLearnerState(CS50P_LECTURE_0.id);
});

describe('CardFaded notify smoke', () => {
  it('offers the review-notify permission control on the study canvas', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /경로 만들기/i }));
    expect(
      screen.getByRole('button', { name: '다시 보기 알림 켜기' }),
    ).toBeInTheDocument();
  });
});
