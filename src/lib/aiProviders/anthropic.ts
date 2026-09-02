import { TEXT_TO_MARKDOWN_SYSTEM_PROMPT, cleanAIOutput } from './rules';

export async function refineWithAnthropic(text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith('...') || apiKey.trim() === '') {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 4000,
      system: TEXT_TO_MARKDOWN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Convert the following unformatted text into clean, structured Markdown:\n\n${text}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic failed: ${res.status}`);
  const data = await res.json();
  const rawText = data.content?.[0]?.text ?? '';
  return cleanAIOutput(rawText);
}
