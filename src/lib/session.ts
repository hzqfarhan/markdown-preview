export interface UserSession {
  id: string;
  name: string;
  email: string;
  picture: string;
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
}

export const SESSION_COOKIE_NAME = 'md_user_session';

export function parseSessionCookie(cookieValue?: string): UserSession | null {
  if (!cookieValue) return null;
  try {
    const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as UserSession;
    if (parsed && parsed.email) {
      return parsed;
    }
  } catch {
    try {
      // Fallback in case raw JSON was stored
      const parsed = JSON.parse(cookieValue) as UserSession;
      if (parsed && parsed.email) return parsed;
    } catch {}
  }
  return null;
}

export function serializeSession(session: UserSession): string {
  const json = JSON.stringify(session);
  return Buffer.from(json, 'utf-8').toString('base64');
}
