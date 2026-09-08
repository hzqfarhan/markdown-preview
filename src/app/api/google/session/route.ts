import { NextRequest, NextResponse } from 'next/server';
import { parseSessionCookie, SESSION_COOKIE_NAME } from '@/lib/session';

export async function GET(req: NextRequest) {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSessionCookie(cookieValue);

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      name: session.name,
      email: session.email,
      picture: session.picture,
    },
    hasDocsAccess: !!session.accessToken,
  });
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Signed out successfully',
  });

  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
