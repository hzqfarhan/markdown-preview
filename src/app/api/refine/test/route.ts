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
    let keyInfo = '';
    const prov = provider.toLowerCase();
    if (prov === 'gemini') {
      const res = await refineWithGemini(testText, apiKey);
      modelUsed = res.model;
      if (res.totalKeys && res.totalKeys > 1) {
        keyInfo = ` - Key ${(res.keyUsedIndex ?? 0) + 1}/${res.totalKeys}`;
      }
    } else if (prov === 'openai') {
      const res = await refineWithOpenAI(testText, apiKey);
      modelUsed = res.model;
      if (res.totalKeys && res.totalKeys > 1) {
        keyInfo = ` - Key ${(res.keyUsedIndex ?? 0) + 1}/${res.totalKeys}`;
      }
    } else if (prov === 'anthropic') {
      const res = await refineWithAnthropic(testText, apiKey);
      modelUsed = res.model;
      if (res.totalKeys && res.totalKeys > 1) {
        keyInfo = ` - Key ${(res.keyUsedIndex ?? 0) + 1}/${res.totalKeys}`;
      }
    } else {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      provider: `${provider}${modelUsed ? ` (${modelUsed}${keyInfo})` : ''}`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Connection test failed';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}
