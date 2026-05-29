import { API_URL } from './config';

export type User = {
  id: string;
  name: string;
  email: string | null;
  provider: string | null;
  created_at: number;
};

export type Sentence = {
  id: string;
  author_name: string;
  text: string;
  spreads: number;
  reach: number;
  created_at: number;
  spread_by_me?: boolean;
};

export type AuthoredSentence = {
  id: string;
  text: string;
  spreads: number;
  reach: number;
  created_at: number;
};

// The session token lives here in memory for requests; App.tsx persists it to
// device storage and rehydrates it on launch via setToken().
let token: string | null = null;
export function setToken(next: string | null) {
  token = next;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.headers) Object.assign(headers, options.headers);
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep default */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

// --- Auth ------------------------------------------------------------------

type AuthResult = { token: string; user: User };

export function authGoogle(idToken: string) {
  return request<AuthResult>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export function authApple(identityToken: string, fullName?: string) {
  return request<AuthResult>('/api/auth/apple', {
    method: 'POST',
    body: JSON.stringify({ identityToken, fullName }),
  });
}

export function authDev(email: string, name?: string) {
  return request<AuthResult>('/api/auth/dev', {
    method: 'POST',
    body: JSON.stringify({ email, name }),
  });
}

export function logout() {
  return request<{ ok: true }>('/api/auth/logout', { method: 'POST' });
}

// --- Me --------------------------------------------------------------------

export function fetchMe() {
  return request<User>('/api/me');
}

export function renameMe(name: string) {
  return request<User>('/api/me', { method: 'PATCH', body: JSON.stringify({ name }) });
}

export function fetchAuthored() {
  return request<{ sentences: AuthoredSentence[] }>('/api/me/sentences').then(
    (r) => r.sentences
  );
}

// --- Wisdom ----------------------------------------------------------------

export function fetchNext() {
  return request<{ sentence: Sentence | null }>('/api/feed').then((r) => r.sentence);
}

export function createSentence(text: string) {
  return request<Sentence>('/api/sentences', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function spreadSentence(sentenceId: string) {
  return request<{ id: string; spreads: number; reach: number; newly_spread: boolean }>(
    `/api/sentences/${sentenceId}/spread`,
    { method: 'POST', body: JSON.stringify({}) }
  );
}
