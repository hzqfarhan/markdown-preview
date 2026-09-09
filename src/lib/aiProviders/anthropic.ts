import { TEXT_TO_MARKDOWN_SYSTEM_PROMPT, cleanAIOutput } from './rules';
import { ProviderResult } from './gemini';

export async function refineWithAnthropic(
  text: string,
  customApiKey?: string
): Promise<ProviderResult> {
  const apiKey = (customApiKey && customApiKey.trim()) || process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith('...') || apiKey.trim() === '') {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const candidateModels = [
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
    'claude-3-haiku-20240307',
  ];
  let lastError = 'Anthropic call failed';

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    const isFallback = i > 0;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          system: TEXT_TO_MARKDOWN_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Convert the following unformatted text into clean, structured Markdown:\n\n${text}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const msg = errorData?.error?.message || `Status ${res.status}`;
        console.warn(
          `[Anthropic] Model ${model} failed (${res.status}): ${msg}.${
            i < candidateModels.length - 1 ? ` Falling back to ${candidateModels[i + 1]}...` : ''
          }`
        );
        lastError = `[${model}] ${msg}`;
        continue;
      }

      const data = await res.json();
      const rawText = data.content?.[0]?.text ?? '';
      if (rawText.trim()) {
        return {
          markdown: cleanAIOutput(rawText),
          model,
          wasFallback: isFallback,
        };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Anthropic] Error contacting ${model}: ${errMsg}`);
      lastError = `[${model}] ${errMsg || 'Network error'}`;
      continue;
    }
  }

  throw new Error(`All Anthropic candidate models failed. ${lastError}`);
}

