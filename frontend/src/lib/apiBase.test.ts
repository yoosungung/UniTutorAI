import { describe, expect, it } from 'vitest';
import { apiUrl, getApiBaseUrl } from './apiBase';

describe('getApiBaseUrl', () => {
  it('returns empty when VITE_API_BASE_URL is unset', () => {
    expect(getApiBaseUrl({})).toBe('');
  });

  it('trims trailing slash', () => {
    expect(getApiBaseUrl({ VITE_API_BASE_URL: 'https://api.example.com/' })).toBe(
      'https://api.example.com',
    );
  });
});

describe('apiUrl', () => {
  it('uses relative path when base is empty', () => {
    expect(apiUrl('/health', '')).toBe('/health');
    expect(apiUrl('health', '')).toBe('/health');
  });

  it('joins absolute base and path', () => {
    expect(apiUrl('/health', 'https://api.example.com')).toBe(
      'https://api.example.com/health',
    );
  });
});
