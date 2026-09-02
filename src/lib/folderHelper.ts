/**
 * Helper to automatically create/detect folder names from markdown content,
 * while allowing user override and manual customization.
 */

export function autoDetectFolderName(markdown: string, fallbackTitle = 'Untitled'): string {
  const content = markdown.trim();

  if (!content) {
    return 'Drafts';
  }

  // 1. Check for YAML frontmatter with folder/category/collection/tag
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1];
    const folderMatch = yaml.match(/(?:folder|category|collection|notebook|group)\s*:\s*["']?([^"'\n\r]+)["']?/i);
    if (folderMatch && folderMatch[1].trim()) {
      return folderMatch[1].trim();
    }
  }

  const lowerContent = content.toLowerCase();

  // 2. Category detection by keywords & structure
  const patterns: { folder: string; keywords: string[]; regex?: RegExp }[] = [
    {
      folder: 'Guides & Docs',
      keywords: ['welcome', 'getting started', 'tutorial', 'documentation', 'guide', 'how-to', 'cheat sheet', 'reference manual', 'spec'],
      regex: /#+\s*(?:welcome|getting started|guide|documentation|tutorial)/i,
    },
    {
      folder: 'Development',
      keywords: ['api', 'function', 'endpoint', 'database', 'import ', 'export ', 'interface ', 'const ', 'class ', 'npm install', 'git clone', 'repository', 'bug fix'],
      regex: /```(?:javascript|typescript|python|go|rust|html|css|bash|json|sql)/i,
    },
    {
      folder: 'Projects',
      keywords: ['roadmap', 'sprint', 'milestone', 'deadline', 'deliverable', 'objective', 'okr', 'scope', 'architecture'],
      regex: /#+\s*(?:project|roadmap|sprint|milestone)/i,
    },
    {
      folder: 'Meetings',
      keywords: ['attendees', 'action items', 'meeting minutes', 'sync notes', 'standup', 'agenda', 'discussion points'],
      regex: /#+\s*(?:meeting|sync|standup|agenda)/i,
    },
    {
      folder: 'Tasks & Checklists',
      keywords: ['todo', 'to-do', 'checklist', 'action item'],
      regex: /-\s*\[(?: |x)\]/i,
    },
    {
      folder: 'Ideas & Brainstorm',
      keywords: ['brainstorm', 'pitch', 'concept', 'inspiration', 'ideation', 'hypotheses'],
      regex: /#+\s*(?:idea|brainstorm|concept)/i,
    },
    {
      folder: 'Study & Notes',
      keywords: ['lecture', 'homework', 'exam', 'chapter', 'syllabus', 'course', 'curriculum', 'study notes'],
      regex: /#+\s*(?:lecture|chapter|study)/i,
    },
    {
      folder: 'Journal',
      keywords: ['reflection', 'gratitude', 'diary', 'daily log', 'habits', 'morning pages', 'thoughts today'],
      regex: /#+\s*(?:journal|diary|daily log|reflection)/i,
    },
    {
      folder: 'Recipes',
      keywords: ['recipe', 'ingredients', 'instructions', 'prep time', 'cook time', 'tablespoon', 'teaspoon', 'servings'],
      regex: /#+\s*(?:recipe|ingredients)/i,
    },
    {
      folder: 'Finance',
      keywords: ['budget', 'invoice', 'expenses', 'revenue', 'tax', 'receipt', 'balance sheet'],
      regex: /#+\s*(?:budget|finance|invoice)/i,
    },
  ];

  for (const item of patterns) {
    if (item.regex && item.regex.test(content)) {
      return item.folder;
    }
    const matchCount = item.keywords.filter((kw) => lowerContent.includes(kw)).length;
    if (matchCount >= 2) {
      return item.folder;
    }
  }

  // 3. Check for colon/dash prefixes in the first heading
  // e.g. "# Marketing: Campaign Strategy" -> Folder: "Marketing"
  const firstHeadingMatch = content.match(/^#\s+([^:\-\n\r]+)[:\-]\s*(.+)$/m);
  if (firstHeadingMatch && firstHeadingMatch[1].trim().length >= 3) {
    const candidate = firstHeadingMatch[1].trim().replace(/[*_~`]/g, '');
    if (candidate.length <= 25) {
      return candidate;
    }
  }

  // Fallback default folder
  return 'General Notes';
}
