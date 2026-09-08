import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClient } from '@/lib/google';
import { serializeSession, SESSION_COOKIE_NAME, UserSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // If Google Client ID is not configured or is placeholder, redirect with error flag
  if (!clientId || clientId.startsWith('...') || clientId.trim() === '') {
    return NextResponse.redirect(new URL('/?error=missing_credentials', req.url));
  }

  // Derive redirect URI dynamically or fallback to env
  const origin = req.nextUrl.origin;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() || `${origin}/api/google/auth`;

  const oauth2Client = getOAuthClient(redirectUri);

  if (!code) {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      redirect_uri: redirectUri,
      scope: [
        'openid',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });
    return NextResponse.redirect(url);
  }

  try {
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: redirectUri,
    });
    oauth2Client.setCredentials(tokens);

    // Fetch user profile from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfoRes = await oauth2.userinfo.get();
    const userInfo = userInfoRes.data;

    const session: UserSession = {
      id: userInfo.id || '',
      name: userInfo.name || 'Google User',
      email: userInfo.email || '',
      picture: userInfo.picture || '',
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || undefined,
      expiryDate: tokens.expiry_date || undefined,
    };

    const redirectUrl = new URL('/', req.url);
    redirectUrl.searchParams.set('auth', 'success');

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(SESSION_COOKIE_NAME, serializeSession(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Google OAuth failed:', err);
    return NextResponse.redirect(new URL('/?error=oauth_failed', req.url));
  }
}

