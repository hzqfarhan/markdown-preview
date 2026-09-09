import { TEXT_TO_MARKDOWN_SYSTEM_PROMPT, cleanAIOutput } from './rules';

export interface ProviderResult {
  markdown: string;
  model: string;
  wasFallback: boolean;
}

export async function refineWithGemini(
  text: string,
  customApiKey?: string
): Promise<ProviderResult> {
  const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('...') || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Fallback chain prioritized according to quota & capability within the same API key
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ];

  let lastError = 'Gemini call failed';

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    const isFallback = i > 0;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: TEXT_TO_MARKDOWN_SYSTEM_PROMPT }],
            },
            contents: [
              {
                parts: [
                  {
                    text: `Convert the following unformatted text into clean, structured Markdown according to the system rules:\n\n${text}`,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 8192,
              temperature: 0.2,
            },
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error?.message || `Status ${res.status}`;
        const isRateLimit =
          res.status === 429 ||
          /quota|resource_exhausted|rate limit|exhausted/i.test(errorMsg);

        console.warn(
          `[Gemini] Model ${model} failed (${isRateLimit ? 'Rate limit / quota exceeded' : `Status ${res.status}`}): ${errorMsg}.${
            i < candidateModels.length - 1 ? ` Falling back to ${candidateModels[i + 1]}...` : ''
          }`
        );
        lastError = `[${model}] ${errorMsg}`;
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (rawText.trim()) {
        return {
          markdown: cleanAIOutput(rawText),
          model,
          wasFallback: isFallback,
        };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini] Error contacting ${model}: ${errMsg}`);
      lastError = `[${model}] ${errMsg || 'Network error'}`;
      continue;
    }
  }

  throw new Error(`All Gemini candidate models failed. ${lastError}`);
}

