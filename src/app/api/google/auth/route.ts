import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/google';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // If Google Client ID is not configured or is placeholder, redirect directly to Google accounts
  if (!clientId || clientId.startsWith('...') || clientId.trim() === '') {
    return NextResponse.redirect('https://accounts.google.com/');
  }

  const oauth2Client = getOAuthClient();

  if (!code) {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
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
    const { tokens } = await oauth2Client.getToken(code);
    const redirectUrl = new URL('/', req.url);
    redirectUrl.searchParams.set('google_token', tokens.access_token || '');
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('Google OAuth failed:', err);
    return NextResponse.redirect(new URL('/?error=oauth_failed', req.url));
  }
}
