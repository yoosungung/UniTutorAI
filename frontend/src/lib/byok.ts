/** Browser-only Gemini BYOK custody — never persisted on the server. */

export const BYOK_STORAGE_KEY = 'unitutor:byok-gemini';

export const BYOK_HEADER = 'X-UniTutor-Byok-Key';

function readRaw(): string | null {
  try {
    return localStorage.getItem(BYOK_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string): boolean {
  try {
    localStorage.setItem(BYOK_STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(): boolean {
  try {
    localStorage.removeItem(BYOK_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function loadByokApiKey(): string | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { apiKey?: unknown };
    if (typeof data.apiKey !== 'string') return null;
    const key = data.apiKey.trim();
    return key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

export function hasByokApiKey(): boolean {
  return loadByokApiKey() !== null;
}

/** Persist trimmed key in localStorage. Empty input is rejected. */
export function saveByokApiKey(apiKey: string): boolean {
  const key = apiKey.trim();
  if (!key) return false;
  return writeRaw(JSON.stringify({ provider: 'gemini', apiKey: key }));
}

export function clearByokApiKey(): boolean {
  return removeRaw();
}

/** UI mask — keep a short suffix only. */
export function maskByokApiKey(apiKey: string, suffixLen = 4): string {
  const key = apiKey.trim();
  if (key.length <= suffixLen) return '*'.repeat(Math.max(key.length, 1));
  return `${'*'.repeat(Math.max(8, key.length - suffixLen))}${key.slice(-suffixLen)}`;
}
