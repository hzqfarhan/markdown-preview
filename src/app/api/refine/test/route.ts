import { NextRequest, NextResponse } from 'next/server';
import { refineWithGemini } from '@/lib/aiProviders/gemini';
import { refineWithOpenAI } from '@/lib/aiProviders/openai';
import { refineWithAnthropic } from '@/lib/aiProviders/anthropic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { provider = 'Gemini', apiKey } = body;

  const testText = 'Hello world';

  try {
    const prov = provider.toLowerCase();
    if (prov === 'gemini') {
      await refineWithGemini(testText, apiKey);
    } else if (prov === 'openai') {
      await refineWithOpenAI(testText, apiKey);
    } else if (prov === 'anthropic') {
      await refineWithAnthropic(testText, apiKey);
    } else {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
    }

    return NextResponse.json({ success: true, provider });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Connection test failed' },
      { status: 400 }
    );
  }
}
