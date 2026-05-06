export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    window.location.reload();
    return null;
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const seconds = retryAfter ? ` Tente novamente em ${retryAfter} segundos.` : '';
    throw new RateLimitError(`Muitas tentativas. Aguarde um momento e tente novamente.${seconds}`);
  }
  return res;
}

export class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}
