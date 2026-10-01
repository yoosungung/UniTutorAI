import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureReviewServiceWorker,
  requestReviewNotifyPermission,
  showReviewNotification,
} from './reviewNotify';

describe('review notify browser helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ensureReviewServiceWorker registers /sw.js when supported', async () => {
    const register = vi.fn(async () => ({ scope: '/' }));
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
    });
    const reg = await ensureReviewServiceWorker();
    expect(register).toHaveBeenCalledWith('/sw.js');
    expect(reg).toEqual({ scope: '/' });
  });

  it('requestReviewNotifyPermission returns granted without prompt when already granted', async () => {
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: vi.fn(),
    });
    await expect(requestReviewNotifyPermission()).resolves.toBe('granted');
    expect(Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('showReviewNotification prefers serviceWorker.ready.showNotification', async () => {
    const showNotification = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({ showNotification }),
      },
    });
    await showReviewNotification('UniTutor', {
      body: '함수, 2분이면 확인할 수 있어요.',
      tag: 'review-a',
    });
    expect(showNotification).toHaveBeenCalledWith('UniTutor', {
      body: '함수, 2분이면 확인할 수 있어요.',
      tag: 'review-a',
    });
  });
});
