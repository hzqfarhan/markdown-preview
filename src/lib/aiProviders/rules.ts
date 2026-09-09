/**
 * Core AI Rules for Text-to-Markdown Transformation
 *
 * These rules guide AI models (Gemini, Claude, GPT) to convert arbitrary
 * unformatted or messy pasted text into clean, structured GitHub Flavored Markdown (GFM).
 */

export const TEXT_TO_MARKDOWN_SYSTEM_PROMPT = `You are an expert Text-to-Markdown transformation and typography engine.
Your mission is to take arbitrary unformatted, messy, web-scraped, or single-line pasted text and transform it into clean, beautifully structured, highly readable GitHub Flavored Markdown (GFM) with full KaTeX math support.

CRITICAL TRANSFORMATION RULES:

1. WEB COPY-PASTE ARTIFACT REPAIR (GLUED HEADINGS & RUN-ONS):
   - You MUST detect and repair fused words caused by copy-pasting from web headers (e.g. "Euler's IdentityMathematics is often perceived" MUST become "# The Poetry of Mathematics: Euler's Identity\\n\\nMathematics is often perceived...").
   - Separate fused section titles (e.g. "The Mathematical FoundationTo understand" MUST become "## The Mathematical Foundation\\n\\nTo understand...").
   - Separate "The Philosophical ImplicationThis short string" into "## The Philosophical Implication\\n\\nThis short string...".
   - If an equation is glued to text (e.g. "gives:$$e^{i\\pi}...$$Because"), separate the equation onto its own lines with blank lines around it.

2. MATHEMATICAL & SCIENTIFIC NOTATION (LaTeX / KaTeX):
   - Recognize mathematical formulas, Euler's identity, complex numbers, exponents, fractions, integrals, and Greek letters (\\pi, \\theta, \\alpha).
   - Format inline math using single dollar signs with surrounding spaces: $x = \\pi$, $\\cos(\\pi) = -1$, $\\sin(\\pi) = 0$, $e$, $i$, $-1$.
   - Format display/block equations on dedicated lines with double dollar signs ($$) and blank lines before and after:
     $$
     e^{i\\pi} = \\cos(\\pi) + i\\sin(\\pi)
     $$
     $$
     e^{i\\pi} + 1 = 0
     $$
   - NEVER escape dollar signs with backslashes (write $e$, NEVER \\$e\\$).
   - NEVER leave $$ jammed against adjacent words.

3. WALL-OF-TEXT & SINGLE-LINE UNWRAPPING:
   - If the input text is a single continuous line or a long unbroken wall of text, intelligently segment it into cohesive, readable paragraphs.
   - Separate every paragraph with a clean single blank line.
   - If the input has artificial hard line breaks in the middle of sentences (from PDF copies), re-join them into flowing sentences.

4. STRUCTURE & HIERARCHY:
   - Extract the main topic as an H1 heading (# Document Title) at the top.
   - Group related sections under H2 headings (## Section Title).
   - Use H3 headings (### Sub-heading) for sub-sections. Never skip heading levels.

5. LISTS, STEPS & CHECKLISTS:
   - Convert bullet points, dashes, asterisks, or symbols (•, –, ›, ►, ▪) into standard markdown hyphens (- item).
   - Convert chronological sequences or numbered instructions into ordered lists (1., 2., 3.).
   - Convert action items or requirements into task checkboxes (- [ ] task or - [x] done).
   - Use 2-space indentation for nested sub-bullets.

6. CODE, COMMANDS & CONFIGS:
   - Detect code, shell commands, or structured data (JSON, YAML, SQL).
   - Recognize and clean web copy-paste artifacts where language badges are glued directly to code keywords (e.g. "Cint callMe" -> \`\`\`c\\nint callMe, "Cvoid pop()" -> \`\`\`c\\nvoid pop(), "PlaintextTry My Best" -> \`\`\`plaintext\\nTry My Best).
   - Wrap all code snippets and program outputs in fenced triple backticks with the accurate language tag (e.g. \`\`\`c, \`\`\`plaintext, \`\`\`bash, \`\`\`ts, \`\`\`json, \`\`\`python).
   - Format inline variable names, functions, and filenames with single backticks (\`code\`).

7. EXAM QUESTIONS, SECTIONS & HIERARCHIES:
   - Recognize question indicators like "Q1:", "Q2:", "Question 1:", "Part A:" and format them as bold section headings (## Q1: ...).
   - Recognize sub-questions like "(a)", "(b)", "(c)", "(d)" and format them as clean subheadings (### (a) ...).
   - When text represents tree/graph structures (e.g. "Root: 500Left Child of 500: 365..."), format them into clear nested bulleted lists showing parent-child hierarchy.
   - When text represents traversals (Preorder, Inorder, Postorder), separate the order rule and list the numbers clearly.

8. TABLES & COMPARISONS:
   - Convert structured comparison data into neat GitHub Flavored Markdown tables with headers and divider rows (| --- | --- |).
   - Do NOT convert tab-delimited console output (like "P 1: 34\\t26\\t11...") into tables; format program output as \`\`\`plaintext code blocks.

9. BLOCKQUOTES & EMPHASIS:
   - Highlight important notes, warnings, or key takeaways as blockquotes (> **Note:** ...).
   - Bold key terms (**concept**) to make the text easily scannable and visually engaging.

10. CONTENT FIDELITY & ZERO EMOJI:
   - Preserve 100% of facts, formulas, numbers, and technical details. Never omit or summarize away content.
   - Do NOT add any emojis (no 📝, 🚀, ✨). Maintain a clean, professional aesthetic.

11. STRICT OUTPUT FORMAT:
   - Output ONLY the final raw markdown content.
   - Do NOT wrap the entire response in an outer \`\`\`markdown ... \`\`\` block.
   - Do NOT include any conversational preamble or sign-off.
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

  // Fix accidental escaped dollar signs in math output
  cleaned = cleaned.replace(/\\(\$)/g, '$1');

  // Strip conversational preamble if present
  cleaned = cleaned.replace(/^(?:Here (?:is|are) (?:the|your) (?:formatted |clean )?markdown:?[\r\n]+)/i, '');
  cleaned = cleaned.replace(/^(?:Certainly! Here is [^\n]+:?[\r\n]+)/i, '');

  return cleaned.trim();
}

/**
 * Fast offline/rule-based heuristic converter for when no AI API key is configured.
 * Intelligently breaks single-line pasted text into paragraphs, headings, math blocks, and bullet points.
 */
export function heuristicTextToMarkdown(rawText: string): string {
  if (!rawText.trim()) return '';

  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Un-escape accidental \$ backslashes
  text = text.replace(/\\(\$)/g, '$1');

  // Un-glue LaTeX $$ blocks from text using replacer functions
  text = text
    .replace(/([^\n\s])\$\$/g, (_, p1) => `${p1}\n\n$$\n`)
    .replace(/\$\$([^\n\s])/g, (_, p1) => `\n$$\n\n${p1}`);

  // 1. Separate exam/study questions glued to preceding text, e.g. "order.  Q3:" or "500Q2:"
  text = text.replace(/([^\n])\s*(Q\d+:|Question\s+\d+:|Part\s+[A-Z\d]+:)/gi, '$1\n\n## $2');

  // 2. If text starts with Q1: or Question 1:
  text = text.replace(/^(Q\d+:|Question\s+\d+:|Part\s+[A-Z\d]+:)/i, '# $1');

  // 3. Separate sub-questions glued to text, e.g. "Traversal(a)" -> "Traversal\n\n### (a)"
  text = text.replace(/([^\n\s])\s*(\([a-z\d]\)\s+[A-Z][^\n]+?)/g, '$1\n\n### $2');
  text = text.replace(/(\n|^)\s*(\([a-z\d]\)\s+[A-Z][^\n]+?)/g, '$1### $2');

  // 4. Separate glued code badges (e.g. "(Linear Search)Cint callMe3" or "list).  Cvoid pop() {")
  text = text.replace(
    /([^\n])\s*C(int|void|char|float|double|bool|struct|long)\s+([a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/g,
    '$1\n\n```c\n$2 $3'
  );

  // 5. Separate glued Plaintext output (e.g. "Output of the programPlaintextTry My Best" or "right.  PlaintextP 1:")
  text = text.replace(/([^\n])\s*Plaintext([^\n]+)/g, '$1\n\n```plaintext\n$2');

  // 6. Fix Traversal parenthetical sequences: "(b) Preorder Traversal(Root, Left, Right)500, 365, 212..."
  text = text.replace(/(Traversal)\s*(\([^)]+\))\s*([\d,\s]+)/gi, '$1\n\n*$2*\n\n$3\n');

  // 7. Repair common copy-paste concatenated headings and sentences
  text = text
    .replace(/(Identity)(Mathematics)/g, '$1\n\n$2')
    .replace(/(Foundation)(To\b)/g, '$1\n\n$2')
    .replace(/(Implication)(This\b)/g, '$1\n\n$2')
    .replace(/([a-z0-9]{2,})([A-Z][a-z]+(?:\s+(?:is|often|to|was|were|the|this|that|in|on|at|by|from|with)\b|[A-Z]))/g, '$1\n\n$2');

  const lines = text.split('\n');
  const resultLines: string[] = [];
  let inCode = false;
  let inPlaintext = false;
  let braceCount = 0;
  let hasH1 = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (!inCode && !inPlaintext) {
        resultLines.push('');
      }
      continue;
    }

    // Toggle existing code blocks
    if (trimmed.startsWith('```c') || (trimmed.startsWith('```') && !trimmed.startsWith('```plaintext'))) {
      inCode = true;
      braceCount = 0;
      resultLines.push(line);
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      continue;
    }

    if (trimmed.startsWith('```plaintext')) {
      inPlaintext = true;
      resultLines.push(line);
      continue;
    }

    if (inCode) {
      resultLines.push(line);
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      if (braceCount <= 0 && line.includes('}')) {
        resultLines.push('```\n');
        inCode = false;
      }
      continue;
    }

    if (inPlaintext) {
      if (
        trimmed.startsWith('### ') ||
        trimmed.startsWith('## ') ||
        trimmed.startsWith('# ') ||
        (trimmed.startsWith('(') && trimmed.includes('Explain'))
      ) {
        resultLines.push('```\n');
        inPlaintext = false;
        resultLines.push(line);
        continue;
      }
      resultLines.push(line);
      continue;
    }

    // Check for "P 1: ... P 9: ..." block that should be inside plaintext block
    if (/^P\s*\d+:/.test(trimmed)) {
      const codeLines = [line];
      while (
        i + 1 < lines.length &&
        (/^P\s*\d+:/.test(lines[i + 1].trim()) || lines[i + 1].trim().startsWith('(Note:'))
      ) {
        i++;
        codeLines.push(lines[i]);
      }
      resultLines.push('```plaintext');
      for (const cl of codeLines) {
        if (cl.trim().startsWith('(Note:')) {
          resultLines.push('```');
          resultLines.push(`\n*${cl.trim()}*\n`);
        } else {
          resultLines.push(cl);
        }
      }
      if (!codeLines[codeLines.length - 1].trim().startsWith('(Note:')) {
        resultLines.push('```\n');
      }
      continue;
    }

    // Check for Tree structure ungluing: "Root: 500Left Child of 500: 365..."
    if (line.includes('Root:') && line.includes('Child of')) {
      const parts = line.split(/(?=(?:Root:|Left Child of|Right Child of))/g);
      for (const p of parts) {
        const pt = p.trim();
        if (pt.startsWith('Root:')) {
          resultLines.push(`- **${pt}**`);
        } else if (pt.startsWith('Left Child of') || pt.startsWith('Right Child of')) {
          resultLines.push(`  - ${pt}`);
        } else if (pt) {
          resultLines.push(pt);
        }
      }
      continue;
    }

    // Close plaintext output if following line is a new subsection
    if (trimmed.startsWith('Ouput value is') || trimmed.startsWith('Output value is')) {
      resultLines.push(line);
      if (i + 1 < lines.length && lines[i + 1].trim().startsWith('###')) {
        resultLines.push('```\n');
      }
      continue;
    }

    // First line heading
    if (!hasH1 && i === 0 && !trimmed.startsWith('#') && trimmed.length < 80 && !trimmed.endsWith('.')) {
      resultLines.push(`# ${trimmed}`);
      hasH1 = true;
      continue;
    }

    // Bullet-like characters
    if (/^[•–›►▪]\s+/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^[•–›►▪]\s+/, '- '));
      continue;
    }

    // Detect section titles like "Features:", "Overview:", "Step 1: Setup"
    if (/^([A-Z][A-Za-z0-9\s]{2,30}):$/.test(trimmed) && !trimmed.startsWith('#')) {
      resultLines.push(`\n## ${trimmed.slice(0, -1)}\n`);
      continue;
    }

    // Delimited tables (only when not inside code/output)
    if (trimmed.includes('\t') && !trimmed.startsWith('|') && !/^P\s*\d+:/.test(trimmed)) {
      const cells = trimmed.split('\t').map((c) => c.trim());
      resultLines.push(`| ${cells.join(' | ')} |`);
      continue;
    }

    resultLines.push(line);
  }

  if (inCode || inPlaintext) {
    resultLines.push('```\n');
  }

  return resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
