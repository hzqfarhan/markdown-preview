import { TEXT_TO_MARKDOWN_SYSTEM_PROMPT, cleanAIOutput } from './rules';

export async function refineWithOpenAI(text: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith('...') || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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
      max_tokens: 4000,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI failed: ${res.status}`);
  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content ?? '';
  return cleanAIOutput(rawText);
}
