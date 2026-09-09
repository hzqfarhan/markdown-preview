import { TEXT_TO_MARKDOWN_SYSTEM_PROMPT, cleanAIOutput } from './rules';
import { ProviderResult, extractApiKeys } from './gemini';

export async function refineWithOpenAI(
  text: string,
  customApiKey?: string
): Promise<ProviderResult> {
  const keys = extractApiKeys(customApiKey, 'OPENAI_API_KEY');
  if (keys.length === 0) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const candidateModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
  let lastError = 'OpenAI call failed';

  for (let k = 0; k < keys.length; k++) {
    const apiKey = keys[k];
    const keyLabel = keys.length > 1 ? `Key ${k + 1}/${keys.length}` : 'Key';

    for (let m = 0; m < candidateModels.length; m++) {
      const model = candidateModels[m];
      const isFallback = k > 0 || m > 0;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: TEXT_TO_MARKDOWN_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: `Convert the following unformatted text into clean, structured Markdown:\n\n${text}`,
            },
          ],
          max_tokens: 8192,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const msg = errorData?.error?.message || `Status ${res.status}`;
        console.warn(
          `[OpenAI] [${keyLabel}] Model ${model} failed (${res.status}): ${msg}`
        );
        lastError = `[${keyLabel} ${model}] ${msg}`;
        continue;
      }

      const data = await res.json();
      const rawText = data.choices?.[0]?.message?.content ?? '';
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
      console.warn(`[OpenAI] [${keyLabel}] Error contacting ${model}: ${errMsg}`);
      lastError = `[${keyLabel} ${model}] ${errMsg || 'Network error'}`;
      continue;
    }
  }
}

  throw new Error(`All OpenAI API keys and candidate models failed. ${lastError}`);
}

