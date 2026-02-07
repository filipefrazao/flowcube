export function getAuthToken(): string | null {
  if (typeof window === undefined) return null;

  const token =
    localStorage.getItem(authToken) ||
    localStorage.getItem(auth_token) ||
    localStorage.getItem(token);

  // Migrate legacy keys to the canonical one.
  if (token && !localStorage.getItem(authToken)) {
    localStorage.setItem(authToken, token);
  }

  return token;
}

export function clearAuthToken(): void {
  if (typeof window === undefined) return;
  localStorage.removeItem(authToken);
  localStorage.removeItem(auth_token);
  localStorage.removeItem(token);
}
