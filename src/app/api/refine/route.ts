import { NextRequest, NextResponse } from 'next/server';
import { refineToMarkdown } from '@/lib/aiProviders';

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }

  try {
    const result = await refineToMarkdown(text);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Refinement failed:', err);
    return NextResponse.json({ error: 'Refinement failed' }, { status: 502 });
  }
}
