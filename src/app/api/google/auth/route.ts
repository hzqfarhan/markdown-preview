import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/google';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const oauth2Client = getOAuthClient();

  if (!code) {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });
    return NextResponse.redirect(url);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    // In production, store tokens securely (session, encrypted cookie, or DB)
    // For now, return them so the client can use them for export
    const redirectUrl = new URL('/', req.url);
    redirectUrl.searchParams.set('google_token', tokens.access_token || '');
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('Google OAuth failed:', err);
    return NextResponse.json({ error: 'OAuth failed' }, { status: 500 });
  }
}
