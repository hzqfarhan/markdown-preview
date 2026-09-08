import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClient } from '@/lib/google';
import { parseSessionCookie, SESSION_COOKIE_NAME } from '@/lib/session';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { title, markdown } = body;
  let accessToken = body.accessToken;

  // If no accessToken was explicitly provided, retrieve it from the session cookie
  if (!accessToken) {
    const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = parseSessionCookie(cookieValue);
    if (session?.accessToken) {
      accessToken = session.accessToken;
    }
  }

  if (!title || !markdown || !accessToken) {
    return NextResponse.json(
      { error: 'Missing required fields or unauthenticated with Google' },
      { status: 400 }
    );
  }


  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    const docs = google.docs({ version: 'v1', auth: oauth2Client });

    const createRes = await docs.documents.create({
      requestBody: { title },
    });
    const documentId = createRes.data.documentId!;

    // Insert markdown as plain text. For production, map remark AST to Docs API requests.
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          { insertText: { location: { index: 1 }, text: markdown } },
        ],
      },
    });

    return NextResponse.json({
      documentId,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
    });
  } catch (err) {
    console.error('Google export failed:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
