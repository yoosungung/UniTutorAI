import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BYOK_STORAGE_KEY,
  clearByokApiKey,
  hasByokApiKey,
  loadByokApiKey,
  maskByokApiKey,
  saveByokApiKey,
} from './byok';

afterEach(() => {
  clearByokApiKey();
  vi.unstubAllGlobals();
});

describe('byok browser custody', () => {
  it('saves and loads a Gemini API key from localStorage', () => {
    expect(hasByokApiKey()).toBe(false);
    expect(saveByokApiKey('  AIza-test-key-not-secret  ')).toBe(true);
    expect(loadByokApiKey()).toBe('AIza-test-key-not-secret');
    expect(hasByokApiKey()).toBe(true);
    expect(localStorage.getItem(BYOK_STORAGE_KEY)).toContain(
      'AIza-test-key-not-secret',
    );
  });

  it('clears the stored key', () => {
    saveByokApiKey('AIza-clear-me');
    expect(clearByokApiKey()).toBe(true);
    expect(loadByokApiKey()).toBeNull();
    expect(hasByokApiKey()).toBe(false);
  });

  it('rejects empty keys', () => {
    expect(saveByokApiKey('   ')).toBe(false);
    expect(hasByokApiKey()).toBe(false);
  });

  it('masks keys for UI (never full reveal beyond short suffix)', () => {
    const masked = maskByokApiKey('AIzaSyShort');
    expect(masked).toMatch(/\*+hort$/);
    expect(masked).not.toContain('AIzaSy');
    expect(masked.endsWith('hort')).toBe(true);
  });

  it('gracefully degrades when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('quota');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('quota');
      },
    });
    expect(saveByokApiKey('AIza-x')).toBe(false);
    expect(loadByokApiKey()).toBeNull();
    expect(clearByokApiKey()).toBe(false);
  });
});
