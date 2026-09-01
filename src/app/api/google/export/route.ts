import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClient } from '@/lib/google';

export async function POST(req: NextRequest) {
  const { title, markdown, accessToken } = await req.json();

  if (!title || !markdown || !accessToken) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
