/** Vite injects `import.meta.env`; tests pass a plain bag. */
export type ApiEnv = {
  VITE_API_BASE_URL?: string;
};

export function getApiBaseUrl(env: ApiEnv = import.meta.env as ApiEnv): string {
  return (env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
}

/** Absolute Worker URL when `VITE_API_BASE_URL` is set; otherwise same-origin relative. */
export function apiUrl(path: string, base = getApiBaseUrl()): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalized;
  return `${base}${normalized}`;
}
