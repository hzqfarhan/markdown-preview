/**
 * Core AI Rules for Text-to-Markdown Transformation
 *
 * These rules guide AI models (Gemini, Claude, GPT) to convert arbitrary
 * unformatted or messy pasted text into clean, structured GitHub Flavored Markdown (GFM).
 */

export const TEXT_TO_MARKDOWN_SYSTEM_PROMPT = `You are an expert Text-to-Markdown transformation and typography engine.
Your mission is to take arbitrary unformatted, messy, or single-line pasted text and transform it into clean, beautifully structured, highly readable GitHub Flavored Markdown (GFM).

CRITICAL TRANSFORMATION RULES:

1. WALL-OF-TEXT & SINGLE-LINE UNWRAPPING:
   - If the input text is a single continuous line, a long unbroken wall of text, or has collapsed line breaks from copy-pasting, you MUST intelligently segment it into cohesive, readable paragraphs.
   - Separate every paragraph with a clean single blank line.
   - If the input has artificial hard line breaks in the middle of sentences (common in PDF or terminal copies), re-join the broken lines into natural, flowing sentences.

2. STRUCTURE & HIERARCHY:
   - Extract or infer the main topic and set it as an H1 heading (# Document Title) at the top.
   - Group related thoughts or sections under meaningful H2 headings (## Section Title).
   - Use H3 headings (### Sub-heading) for sub-sections. Never skip heading levels.

3. LISTS, STEPS & CHECKLISTS:
   - Convert bullet points, dashes, asterisks, or symbols (•, –, ›, ►, ▪) into standard markdown hyphens (- item).
   - Convert chronological sequences or numbered instructions into ordered lists (1., 2., 3.).
   - Convert action items, tasks, or requirements into GitHub task checkboxes (- [ ] task or - [x] done).
   - Use 2-space indentation for nested sub-bullets.

4. CODE, COMMANDS & CONFIGS:
   - Detect programming code, terminal commands, or structured data (JSON, YAML, SQL).
   - Wrap them in fenced triple backticks with the accurate language tag (e.g. \`\`\`bash, \`\`\`ts, \`\`\`json, \`\`\`sql, \`\`\`python).
   - Format inline variable names, functions, filenames, and shortcuts with single backticks (\`code\`).

5. TABLES & COMPARISONS:
   - Convert tabular, comma-separated, tab-separated, or comparison data into neat GitHub Flavored Markdown tables with headers and divider rows (| --- | --- |).

6. BLOCKQUOTES & EMPHASIS:
   - Highlight important notes, warnings, quotes, or key takeaways as blockquotes (> Note: ... or > **Key Takeaway:** ...).
   - Bold key terms (**concept**) to make the text easily scannable and visually engaging.

7. CONTENT FIDELITY & ZERO EMOJI:
   - Preserve 100% of facts, numbers, technical details, and original meaning. Never omit or summarize away important details.
   - Do NOT add any emojis (e.g. no 📝, 🚀, ✨). Maintain a clean, professional aesthetic.

8. STRICT OUTPUT FORMAT:
   - Output ONLY the final raw markdown content.
   - Do NOT wrap the entire response in an outer \`\`\`markdown ... \`\`\` block.
   - Do NOT include any conversational preamble or sign-off (e.g. "Here is your markdown:").
`;

/**
 * Robustly sanitizes and strips outer markdown code block wrappers
 * that some LLMs occasionally add around their output.
 */
export function cleanAIOutput(rawOutput: string): string {
  if (!rawOutput) return '';

  let cleaned = rawOutput.trim();

  // Strip leading code fence: ```markdown or ```md or ```
  cleaned = cleaned.replace(/^```(?:markdown|md)?[\r\n]+/i, '');
  // Strip trailing code fence: ```
  cleaned = cleaned.replace(/[\r\n]+```\s*$/i, '');

  // Strip conversational preamble if present
  cleaned = cleaned.replace(/^(?:Here (?:is|are) (?:the|your) (?:formatted |clean )?markdown:?[\r\n]+)/i, '');
  cleaned = cleaned.replace(/^(?:Certainly! Here is [^\n]+:?[\r\n]+)/i, '');

  return cleaned.trim();
}

/**
 * Fast offline/rule-based heuristic converter for when no AI API key is configured.
 * Intelligently breaks single-line pasted text into paragraphs, headings, and bullet points.
 */
export function heuristicTextToMarkdown(rawText: string): string {
  if (!rawText.trim()) return '';

  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // If text is a single continuous long line without newlines, segment into paragraphs by sentences
  if (!text.includes('\n') && text.length > 120) {
    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];
    const paragraphs: string[] = [];
    let currentPara: string[] = [];

    for (const s of sentences) {
      currentPara.push(s.trim());
      if (currentPara.length >= 3 || currentPara.join(' ').length > 250) {
        paragraphs.push(currentPara.join(' '));
        currentPara = [];
      }
    }
    if (currentPara.length > 0) {
      paragraphs.push(currentPara.join(' '));
    }
    text = paragraphs.join('\n\n');
  }

  const lines = text.split('\n');
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

    // First line without markdown heading markers can be promoted to H1 if short and title-like
    if (!hasH1 && i === 0 && !trimmed.startsWith('#') && trimmed.length < 80 && !trimmed.endsWith('.')) {
      resultLines.push(`# ${trimmed}`);
      hasH1 = true;
      continue;
    }

    // Convert bullet-like characters (•, –, ›, ►, ▪) to standard hyphen
    if (/^[•–›►▪]\s+/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^[•–›►▪]\s+/, '- '));
      continue;
    }

    // Detect section titles like "Features:", "Overview:", "Step 1: Setup"
    if (/^([A-Z][A-Za-z0-9\s]{2,30}):$/.test(trimmed) && !trimmed.startsWith('#')) {
      resultLines.push(`\n## ${trimmed.slice(0, -1)}\n`);
      continue;
    }

    // Detect common tab/pipe delimited table lines
    if (trimmed.includes('\t') && !trimmed.startsWith('|')) {
      const cells = trimmed.split('\t').map((c) => c.trim());
      resultLines.push(`| ${cells.join(' | ')} |`);
      continue;
    }

    resultLines.push(line);
  }

  return resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
