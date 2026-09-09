'use client';

import { useEffect, useState, useCallback } from 'react';
import { markdownToHtml } from '@/lib/markdown';
import { DEFAULT_MARKDOWN } from '@/lib/defaultMarkdown';

interface PreviewProps {
  markdown: string;
  theme: string;
  previewRef?: React.RefObject<HTMLDivElement | null>;
}

export default function Preview({ markdown, theme, previewRef }: PreviewProps) {
  const [html, setHtml] = useState('');

  // Fallback to default showcase profile when editor is empty
  const effectiveMarkdown = markdown.trim() ? markdown : DEFAULT_MARKDOWN;

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const result = await markdownToHtml(effectiveMarkdown);
        if (!cancelled) setHtml(result);
      } catch (err) {
        console.error('Markdown render error:', err);
      }
    }

    const timer = setTimeout(render, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [effectiveMarkdown]);

  // Ensure external links open in a new tab without interrupting editing session
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (anchor && anchor.href && /^https?:\/\//i.test(anchor.href)) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
  }, []);

  return (
    <div data-preview-theme={theme} style={{ height: '100%', overflow: 'auto' }}>
      <div
        ref={previewRef}
        className="preview-content"
        onClick={handleContentClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
