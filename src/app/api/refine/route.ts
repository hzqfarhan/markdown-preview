import { NextRequest, NextResponse } from 'next/server';
import { refineToMarkdown } from '@/lib/aiProviders';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { text, preferredProvider, customKey, customKeys } = body;

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid text' }, { status: 400 });
  }

  try {
    const result = await refineToMarkdown(text, {
      preferredProvider,
      customKey,
      customKeys,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Refinement failed:', err);
    return NextResponse.json(
      { error: err?.message || 'Refinement failed' },
      { status: 502 }
    );
  }
}
