import { NextRequest, NextResponse } from 'next/server';
import { refineWithGemini } from '@/lib/aiProviders/gemini';
import { refineWithOpenAI } from '@/lib/aiProviders/openai';
import { refineWithAnthropic } from '@/lib/aiProviders/anthropic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { provider = 'Gemini', apiKey } = body;

  const testText = 'Hello world';

  try {
    let modelUsed = '';
    const prov = provider.toLowerCase();
    if (prov === 'gemini') {
      const res = await refineWithGemini(testText, apiKey);
      modelUsed = res.model;
    } else if (prov === 'openai') {
      const res = await refineWithOpenAI(testText, apiKey);
      modelUsed = res.model;
    } else if (prov === 'anthropic') {
      const res = await refineWithAnthropic(testText, apiKey);
      modelUsed = res.model;
    } else {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      provider: `${provider}${modelUsed ? ` (${modelUsed})` : ''}`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Connection test failed';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}
