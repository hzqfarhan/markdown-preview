import { google } from 'googleapis';

export function getOAuthClient(redirectUri?: string) {
  const resolvedRedirectUri =
    redirectUri ||
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:3000/api/google/auth';

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    resolvedRedirectUri
  );
}

