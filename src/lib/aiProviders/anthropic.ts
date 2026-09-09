import { TEXT_TO_MARKDOWN_SYSTEM_PROMPT, cleanAIOutput } from './rules';
import { ProviderResult, extractApiKeys } from './gemini';

export async function refineWithAnthropic(
  text: string,
  customApiKey?: string
): Promise<ProviderResult> {
  const keys = extractApiKeys(customApiKey, 'ANTHROPIC_API_KEY');
  if (keys.length === 0) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const candidateModels = [
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
    'claude-3-haiku-20240307',
  ];
  let lastError = 'Anthropic call failed';

  for (let k = 0; k < keys.length; k++) {
    const apiKey = keys[k];
    const keyLabel = keys.length > 1 ? `Key ${k + 1}/${keys.length}` : 'Key';

    for (let m = 0; m < candidateModels.length; m++) {
      const model = candidateModels[m];
      const isFallback = k > 0 || m > 0;

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
            `[Anthropic] [${keyLabel}] Model ${model} failed (${res.status}): ${msg}`
          );
          lastError = `[${keyLabel} ${model}] ${msg}`;
          continue;
        }

        const data = await res.json();
        const rawText = data.content?.[0]?.text ?? '';
        if (rawText.trim()) {
          return {
            markdown: cleanAIOutput(rawText),
            model,
            wasFallback: isFallback,
            keyUsedIndex: k,
            totalKeys: keys.length,
          };
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[Anthropic] [${keyLabel}] Error contacting ${model}: ${errMsg}`);
        lastError = `[${keyLabel} ${model}] ${errMsg || 'Network error'}`;
        continue;
      }
    }
  }

  throw new Error(`All Anthropic API keys and candidate models failed. ${lastError}`);
}

