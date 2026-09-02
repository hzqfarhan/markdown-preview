/**
 * Core AI Rules for Text-to-Markdown Transformation
 *
 * These rules guide AI models (Gemini, Claude, GPT) to convert arbitrary
 * unformatted or messy pasted text into clean, structured GitHub Flavored Markdown (GFM).
 */

export const TEXT_TO_MARKDOWN_SYSTEM_PROMPT = `You are a specialized Text-to-Markdown formatting engine.
Your sole job is to transform raw, unformatted, or unstructured text into clean, beautiful, well-structured GitHub Flavored Markdown (GFM).

CORE TRANSFORMATION RULES:

1. STRUCTURE & HIERARCHY:
   - Identify the primary title/topic and assign it as an H1 heading (# Document Title).
   - Organize distinct logical sections into H2 headings (## Section Title).
   - Use H3 (### Sub-heading) for subtopics. Never skip heading levels (do not jump from # to ###).
   - Keep paragraphs separated by a single blank line.

2. LISTS & OUTLINES:
   - Convert bullet points, dashes, asterisks, or bullet-like characters (•, –, ›, ►) into standard markdown hyphens (- item).
   - Detect step-by-step processes or chronological steps and format them as numbered lists (1., 2., 3.).
   - Detect action items, todos, or task lists and convert them to task checkboxes (- [ ] task or - [x] completed).
   - Maintain proper indentation (2 spaces) for nested sub-bullets.

3. CODE & COMMANDS:
   - Detect programming code, snippets, shell commands, or configuration files.
   - Wrap them in fenced triple backticks with the correct language identifier (e.g. \`\`\`ts, \`\`\`py, \`\`\`bash, \`\`\`json, \`\`\`html, \`\`\`sql).
   - Format inline variable names, functions, file paths, and keyboard shortcuts with single backticks (\`code\`).

4. TABLES:
   - Detect tab-separated, comma-separated, pipe-separated, or spreadsheet-like data.
   - Format them into aligned GitHub Flavored Markdown tables with header rows and separator dashes (| --- | --- |).

5. BLOCKQUOTES & EMPHASIS:
   - Format quotes, testimonies, or important notes as blockquotes (> Note: ...).
   - Emphasize key terms with bold (**text**) or italics (*text*) where appropriate for readability.
   - Convert raw URLs into descriptive markdown links ([Text](https://url)) when the context provides clear link labels.

6. CONTENT FIDELITY:
   - Preserve 100% of the facts, technical details, numbers, and meaning from the original text.
   - Fix obvious typos, broken line breaks from copy-pasting, and inconsistent spacing.
   - Do NOT omit content, do NOT hallucinate new claims, and do NOT truncate long text.

7. STRICT ZERO-EMOJI RULE:
   - Do NOT add any emojis (e.g. 📝, 🚀, ✨, 📌). The project uses a strictly zero-emoji clean aesthetic.

8. OUTPUT FORMAT:
   - Return ONLY the final raw markdown string.
   - NEVER wrap the entire response in outer \`\`\`markdown ... \`\`\` code blocks.
   - NEVER include conversational preambles, introductory greetings, or commentary (e.g. "Here is your formatted markdown:").
`;

/**
 * Sanitizes and strips accidental outer markdown code block wrappers
 * that some LLMs occasionally add around their output.
 */
export function cleanAIOutput(rawOutput: string): string {
  if (!rawOutput) return '';

  let cleaned = rawOutput.trim();

  // If output starts with ```markdown or ``` and ends with ```, strip outer fence
  if (cleaned.startsWith('```markdown\n') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(12, -3).trim();
  } else if (cleaned.startsWith('```\n') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(4, -3).trim();
  } else if (cleaned.startsWith('```markdown') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(11, -3).trim();
  }

  // Ensure no conversational leading lines like "Here is your markdown:"
  cleaned = cleaned.replace(/^(Here is (the|your) (formatted )?markdown:?\s*\n+)/i, '');

  return cleaned;
}

/**
 * Fast offline/rule-based heuristic converter for when no AI API key is configured.
 * Guarantees that users without an active API key still get instant text-to-markdown formatting!
 */
export function heuristicTextToMarkdown(rawText: string): string {
  if (!rawText.trim()) return '';

  const lines = rawText.split(/\r?\n/);
  const resultLines: string[] = [];
  let hasH1 = false;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      resultLines.push('');
      continue;
    }

    // Toggle existing code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      resultLines.push(line);
      continue;
    }

    if (inCodeBlock) {
      resultLines.push(line);
      continue;
    }

    // First non-empty line without markdown heading markers can be promoted to H1 if it's title-like
    if (!hasH1 && i === 0 && !trimmed.startsWith('#') && trimmed.length < 80 && !trimmed.endsWith('.')) {
      resultLines.push(`# ${trimmed}`);
      hasH1 = true;
      continue;
    }

    // Convert bullet-like characters (•, –, ›, ►) to standard hyphen
    if (/^[•–›►]\s+/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^[•–›►]\s+/, '- '));
      continue;
    }

    // Detect section titles like "Features:", "Overview:", "Step 1: Setup"
    if (/^([A-Z][A-Za-z0-9\s]{2,30}):$/.test(trimmed) && !trimmed.startsWith('#')) {
      resultLines.push(`\n## ${trimmed.slice(0, -1)}\n`);
      continue;
    }

    // Detect common tab/comma/pipe delimited table lines
    if (trimmed.includes('\t') && !trimmed.startsWith('|')) {
      const cells = trimmed.split('\t').map((c) => c.trim());
      resultLines.push(`| ${cells.join(' | ')} |`);
      continue;
    }

    resultLines.push(line);
  }

  return resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
