import { TEXT_TO_MARKDOWN_SYSTEM_PROMPT, cleanAIOutput } from './rules';

export async function refineWithGemini(text: string, customApiKey?: string): Promise<string> {
  const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('...') || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const candidateModels = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
  let lastError = 'Gemini call failed';

  for (const model of candidateModels) {
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
        lastError = errorData?.error?.message || `Gemini (${model}) failed with status ${res.status}`;
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (rawText.trim()) {
        return cleanAIOutput(rawText);
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
      continue;
    }
  }

  throw new Error(lastError);
}

