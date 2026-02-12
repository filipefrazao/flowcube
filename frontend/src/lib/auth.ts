const CANONICAL_TOKEN_KEY = "authToken";
const LEGACY_TOKEN_KEYS = ["auth_token", "token"] as const;

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const canonical = localStorage.getItem(CANONICAL_TOKEN_KEY);
  if (canonical) return canonical;

  // Backward-compat: accept legacy keys and migrate to canonical.
  for (const key of LEGACY_TOKEN_KEYS) {
    const v = localStorage.getItem(key);
    if (v) {
      localStorage.setItem(CANONICAL_TOKEN_KEY, v);
      return v;
    }
  }

  return null;
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CANONICAL_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CANONICAL_TOKEN_KEY);
  for (const key of LEGACY_TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}
