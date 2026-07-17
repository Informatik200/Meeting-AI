export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export type AuthUser = { id: number; email: string; name: string | null; has_password: boolean };

type AuthResponse = { access_token: string; token_type: string; user: AuthUser };

// In-memory only - never persisted to localStorage/sessionStorage, so an XSS
// bug has the smallest possible window to steal it. Lost on a full page
// reload, which is why refreshSession() below re-acquires a fresh one from
// the httpOnly refresh cookie on app mount.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

async function parseAuthResponse(res: Response): Promise<AuthResponse> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail ?? "Authentication failed.");
  }
  accessToken = data.access_token;
  return data;
}

export async function register(email: string, password: string, name?: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, name }),
  });
  return (await parseAuthResponse(res)).user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  return (await parseAuthResponse(res)).user;
}

export async function loginWithGoogle(googleIdToken: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id_token: googleIdToken }),
  });
  return (await parseAuthResponse(res)).user;
}

/** Silently re-acquires an access token from the httpOnly refresh cookie.
 * Returns the user on success, or null if there's no valid session (e.g.
 * first visit, or the refresh token expired/was revoked elsewhere). */
export async function refreshSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) {
      accessToken = null;
      return null;
    }
    return (await parseAuthResponse(res)).user;
  } catch {
    accessToken = null;
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
  } finally {
    accessToken = null;
  }
}

export async function updateProfile(name: string): Promise<AuthUser> {
  const res = await apiFetch(`${API_URL}/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Could not update profile.");
  return data;
}

export async function changePassword(currentPassword: string | null, newPassword: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Could not change password.");
  }
}

/** Drop-in fetch() replacement for authenticated API calls: attaches the
 * in-memory access token, and on a 401 attempts exactly one silent refresh
 * + retry before giving up - so an access token expiring mid-session doesn't
 * force a full re-login while the refresh cookie is still valid. */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = () => {
    const headers = new Headers(init.headers);
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return fetch(url, { ...init, headers, credentials: "include" });
  };

  let response = await doFetch();
  if (response.status === 401) {
    const user = await refreshSession();
    if (user) {
      response = await doFetch();
    }
  }
  return response;
}
