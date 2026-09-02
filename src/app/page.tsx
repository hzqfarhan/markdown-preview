'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Preview from '@/components/Preview';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import ExportMenu from '@/components/ExportMenu';
import HistoryPanel from '@/components/HistoryPanel';
import Toast, { ToastData } from '@/components/Toast';
import {
  CrayonIcon,
  FolderIcon,
  FilePlusIcon,
  WandIcon,
  HistoryIcon,
  EditIcon,
  CheckIcon,
  CloseIcon,
  EyeIcon,
  ImageIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@/components/Icons';
import { saveVersion, updateDoc, listFolders, DocEntry } from '@/lib/db';
import { autoDetectFolderName } from '@/lib/folderHelper';
import { exportToPdf } from '@/lib/exportPdf';
import { exportToDocx } from '@/lib/exportDocx';

// Dynamic import Editor to avoid SSR
const Editor = dynamic(() => import('@/components/Editor'), { ssr: false });

const DEFAULT_MARKDOWN = `# Welcome to Markdown Previewer

Write your markdown here and see it come to life with a hand-drawn crayon aesthetic.

## Features

- Live Preview — Instant rendering as you type
- Crayon Themes — Select your preferred reading style
- Smart Folders — Auto-names your folders, with full edit control
- History — Auto-saved locally in your browser
- Export — Download as PDF, DOCX, or Google Docs
- AI Refine — Clean up unstructured notes into tidy markdown
- PWA — Fully offline-capable application

## Sample Code

\`\`\`javascript
function createGreeting(name) {
  return "Hello, " + name + "! Welcome to the markdown editor.";
}
\`\`\`

> "Creativity is intelligence having fun." — Albert Einstein

### Checklist

- [x] Crayon styled pink and purple UI
- [x] No emojis anywhere in the interface
- [x] Automatic folder naming with custom user edits
- [x] Client-side exports for PDF, DOCX, and Google Docs

### Comparison Table

| Feature | Status | Notes |
| :--- | :--- | :--- |
| Live Preview | Active | Instant updates |
| Auto-Folders | Active | Editable anytime |
| Local Storage | Active | Private and offline |
`;

export default function Home() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [previewTheme, setPreviewTheme] = useState('crayon');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [currentDocId, setCurrentDocId] = useState<number | null>(null);
  const [docTitle, setDocTitle] = useState('Welcome to Markdown Previewer');
  const [folder, setFolder] = useState('Guides & Docs');
  const [folderCustomized, setFolderCustomized] = useState(false);
  const [existingFolders, setExistingFolders] = useState<string[]>([]);

  // Folder edit state
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [folderInputVal, setFolderInputVal] = useState('');
  const folderPopoverRef = useRef<HTMLDivElement>(null);

  // Document title edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInputVal, setTitleInputVal] = useState('');

  // Wallpaper / Background customizer state
  const [isWallpaperOpen, setIsWallpaperOpen] = useState(false);
  const [customBgUrl, setCustomBgUrl] = useState('');
  const wallpaperPopoverRef = useRef<HTMLDivElement>(null);

  // Zoom state for text box sizing (11px to 26px, default 15px)
  const [editorFontSize, setEditorFontSize] = useState<number>(15);

  useEffect(() => {
    const savedSize = localStorage.getItem('editorFontSize');
    if (savedSize) {
      const parsed = parseInt(savedSize, 10);
      if (!isNaN(parsed) && parsed >= 11 && parsed <= 28) {
        setEditorFontSize(parsed);
      }
    }
  }, []);

  function handleZoomIn() {
    setEditorFontSize((prev) => {
      const next = Math.min(26, prev + 2);
      localStorage.setItem('editorFontSize', next.toString());
      return next;
    });
  }

  function handleZoomOut() {
    setEditorFontSize((prev) => {
      const next = Math.max(11, prev - 2);
      localStorage.setItem('editorFontSize', next.toString());
      return next;
    });
  }

  function handleZoomReset() {
    setEditorFontSize(15);
    localStorage.setItem('editorFontSize', '15');
  }

  const previewRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('previewTheme');
    if (saved) setPreviewTheme(saved);
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('previewTheme', previewTheme);
  }, [previewTheme]);

  // Load saved background wallpaper
  useEffect(() => {
    const savedBg = localStorage.getItem('userCustomBg');
    if (savedBg) {
      setCustomBgUrl(savedBg);
      document.body.style.setProperty('--user-custom-bg', `url("${savedBg}")`);
    }
  }, []);

  // Load existing folders for suggestions
  useEffect(() => {
    listFolders().then((f) => setExistingFolders(f)).catch(() => {});
  }, [currentDocId, folder]);

  // Click outside folder and wallpaper popovers to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (folderPopoverRef.current && !folderPopoverRef.current.contains(e.target as Node)) {
        setIsEditingFolder(false);
      }
      if (wallpaperPopoverRef.current && !wallpaperPopoverRef.current.contains(e.target as Node)) {
        setIsWallpaperOpen(false);
      }
    }
    if (isEditingFolder || isWallpaperOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditingFolder, isWallpaperOpen]);

  // Toast helper
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Extract title from first heading
  function extractTitle(md: string): string {
    const match = md.match(/^#\s+(.+)$/m);
    return match ? match[1].replace(/[*_~`]/g, '').trim() : 'Untitled';
  }

  // Auto-save with debounce
  const handleChange = useCallback(
    (value: string) => {
      setMarkdown(value);
      setIsSaved(false);

      // Auto update title if user hasn't explicitly locked it
      const autoTitle = extractTitle(value);
      if (!isEditingTitle) {
        setDocTitle(autoTitle);
      }

      // Auto update folder if not customized by user
      let currentFolder = folder;
      if (!folderCustomized) {
        currentFolder = autoDetectFolderName(value, autoTitle);
        setFolder(currentFolder);
      }

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          if (currentDocId) {
            await updateDoc(currentDocId, autoTitle, value, currentFolder, folderCustomized);
          } else {
            const id = await saveVersion(autoTitle, value, currentFolder, folderCustomized);
            setCurrentDocId(id);
          }
          setIsSaved(true);
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }, 1500);
    },
    [currentDocId, folder, folderCustomized, isEditingTitle]
  );

  // Restore from history
  function handleRestore(doc: DocEntry) {
    setMarkdown(doc.content);
    setCurrentDocId(doc.id!);
    setDocTitle(doc.title);
    setFolder(doc.folder || 'General Notes');
    setFolderCustomized(!!doc.folderCustomized);
    setIsSaved(true);
    setHistoryOpen(false);
    addToast(`Restored "${doc.title}"`, 'success');
  }

  // New document
  function handleNewDoc() {
    setMarkdown('');
    setCurrentDocId(null);
    setDocTitle('Untitled');
    setFolder('Drafts');
    setFolderCustomized(false);
    setIsSaved(true);
    addToast('New document created', 'info');
  }

  // Start folder edit
  function handleStartFolderEdit() {
    setFolderInputVal(folder);
    setIsEditingFolder(true);
  }

  // Save folder edit
  async function handleSaveFolder(newFolderName?: string) {
    const targetFolder = (newFolderName ?? folderInputVal).trim();
    if (!targetFolder) return;

    setFolder(targetFolder);
    setFolderCustomized(true);
    setIsEditingFolder(false);

    if (currentDocId) {
      await updateDoc(currentDocId, docTitle, markdown, targetFolder, true);
    }
    addToast(`Moved to folder "${targetFolder}"`, 'success');
  }

  // Reset to auto folder
  async function handleResetToAutoFolder() {
    const detected = autoDetectFolderName(markdown, docTitle);
    setFolder(detected);
    setFolderCustomized(false);
    setIsEditingFolder(false);

    if (currentDocId) {
      await updateDoc(currentDocId, docTitle, markdown, detected, false);
    }
    addToast(`Folder auto-set to "${detected}"`, 'info');
  }

  // Title edit
  function handleStartTitleEdit() {
    setTitleInputVal(docTitle);
    setIsEditingTitle(true);
  }

  async function handleSaveTitle() {
    const trimmed = titleInputVal.trim() || 'Untitled';
    setDocTitle(trimmed);
    setIsEditingTitle(false);

    if (currentDocId) {
      await updateDoc(currentDocId, trimmed, markdown, folder, folderCustomized);
    }
  }

  // Export PDF
  async function handleExportPdf() {
    if (!previewRef.current) {
      addToast('Preview pane not available', 'error');
      return;
    }
    try {
      await exportToPdf(previewRef.current, `${docTitle}.pdf`);
      addToast('PDF exported successfully', 'success');
    } catch {
      addToast('PDF export failed', 'error');
    }
  }

  // Export DOCX
  async function handleExportDocx() {
    try {
      await exportToDocx(markdown, `${docTitle}.docx`);
      addToast('DOCX exported successfully', 'success');
    } catch {
      addToast('DOCX export failed', 'error');
    }
  }

  // Export Google Docs
  function handleExportGoogleDocs() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('google_token');

    if (!token) {
      window.location.href = '/api/google/auth';
      return;
    }

    fetch('/api/google/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: docTitle,
        markdown,
        accessToken: token,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          window.open(data.url, '_blank');
          addToast('Exported to Google Docs', 'success');
        } else {
          addToast('Google Docs export failed', 'error');
        }
      })
      .catch(() => addToast('Google Docs export failed', 'error'));
  }

  // Custom background wallpaper handlers
  function handleApplyWallpaper(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    document.body.style.setProperty('--user-custom-bg', `url("${trimmed}")`);
    localStorage.setItem('userCustomBg', trimmed);
    setCustomBgUrl(trimmed);
    setIsWallpaperOpen(false);
    addToast('Background wallpaper updated', 'success');
  }

  function handleWallpaperFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        document.body.style.setProperty('--user-custom-bg', `url("${dataUrl}")`);
        localStorage.setItem('userCustomBg', dataUrl);
        setCustomBgUrl(dataUrl);
        setIsWallpaperOpen(false);
        addToast('Uploaded background wallpaper applied', 'success');
      }
    };
    reader.readAsDataURL(file);
  }

  function handleResetWallpaper() {
    document.body.style.setProperty('--user-custom-bg', 'none');
    localStorage.removeItem('userCustomBg');
    setCustomBgUrl('');
    setIsWallpaperOpen(false);
    addToast('Reset to default ambient background', 'info');
  }

  // AI Refine
  async function handleRefine() {
    if (!markdown.trim()) {
      addToast('Nothing to refine', 'info');
      return;
    }

    setIsRefining(true);
    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: markdown }),
      });

      if (!res.ok) throw new Error('Refinement failed');

      const { markdown: refined, provider } = await res.json();
      setMarkdown(refined);
      setIsSaved(false);
      addToast(`Refined with ${provider}`, 'success');
    } catch {
      addToast('AI refinement failed — check API keys', 'error');
    } finally {
      setIsRefining(false);
    }
  }

  const charCount = markdown.length;
  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <span className="app-logo-icon">
            <CrayonIcon size={24} />
          </span>
          <span>Markdown Previewer</span>
        </div>

        {/* Document breadcrumb: Folder / Title */}
        <div className="doc-breadcrumb-bar">
          <div className="folder-pill-container" ref={folderPopoverRef}>
            <button
              type="button"
              className={`folder-pill ${folderCustomized ? 'customized' : 'auto-named'}`}
              onClick={handleStartFolderEdit}
              title={
                folderCustomized
                  ? 'Custom folder (click to edit)'
                  : 'Auto-named folder (click to edit)'
              }
            >
              <FolderIcon size={14} className="text-purple" />
              <span className="folder-pill-text">{folder}</span>
              <span className="folder-status-tag">
                {folderCustomized ? 'Custom' : 'Auto'}
              </span>
            </button>

            {/* Folder edit popover */}
            {isEditingFolder && (
              <div className="folder-popover">
                <div className="folder-popover-header">
                  <span className="font-heading text-purple">Folder Name</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-xs"
                    onClick={() => setIsEditingFolder(false)}
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
                <div className="folder-popover-input-group">
                  <input
                    type="text"
                    className="input input-sm"
                    value={folderInputVal}
                    onChange={(e) => setFolderInputVal(e.target.value)}
                    placeholder="Enter folder name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveFolder();
                      if (e.key === 'Escape') setIsEditingFolder(false);
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSaveFolder()}
                  >
                    Save
                  </button>
                </div>

                {/* Existing folder quick-picks */}
                {existingFolders.length > 0 && (
                  <div className="folder-suggestions">
                    <span className="folder-suggestions-label">Existing folders:</span>
                    <div className="folder-suggestions-list">
                      {existingFolders.map((f) => (
                        <button
                          key={f}
                          type="button"
                          className="folder-suggestion-chip"
                          onClick={() => handleSaveFolder(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {folderCustomized && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-pink mt-sm"
                    onClick={handleResetToAutoFolder}
                  >
                    Reset to auto-detected folder
                  </button>
                )}
              </div>
            )}
          </div>

          <span className="breadcrumb-separator">/</span>

          {/* Document Title Editable */}
          <div className="title-container">
            {isEditingTitle ? (
              <div className="title-edit-group">
                <input
                  type="text"
                  className="input input-xs title-input"
                  value={titleInputVal}
                  onChange={(e) => setTitleInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-xs text-pink"
                  onClick={handleSaveTitle}
                  title="Save title"
                >
                  <CheckIcon size={12} />
                </button>
              </div>
            ) : (
              <div
                className="doc-title-display"
                onClick={handleStartTitleEdit}
                title="Click to edit document title"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleStartTitleEdit()}
              >
                <span className="doc-title-text">{docTitle}</span>
                <EditIcon size={12} className="doc-title-edit-icon" />
              </div>
            )}
          </div>
        </div>

        {/* Toolbar items */}
        <div className="app-toolbar">
          <ThemeSwitcher value={previewTheme} onChange={setPreviewTheme} />

          <button
            type="button"
            className="btn btn-ghost btn-icon wiggle"
            onClick={handleNewDoc}
            title="New document"
            aria-label="New document"
          >
            <FilePlusIcon size={18} />
          </button>

          <button
            type="button"
            className={`btn btn-ai btn-sm ${isRefining ? 'disabled' : ''}`}
            onClick={handleRefine}
            disabled={isRefining}
            title="Refine with AI"
          >
            {isRefining ? <span className="spinner" /> : <WandIcon size={16} />}
            <span>{isRefining ? 'Refining...' : 'AI Refine'}</span>
          </button>

          <ExportMenu
            onExportPdf={handleExportPdf}
            onExportDocx={handleExportDocx}
            onExportGoogleDocs={handleExportGoogleDocs}
          />

          {/* Wallpaper / Custom Background control */}
          <div style={{ position: 'relative' }} ref={wallpaperPopoverRef}>
            <button
              type="button"
              className="btn btn-ghost btn-icon wiggle"
              onClick={() => setIsWallpaperOpen(!isWallpaperOpen)}
              title="Custom background wallpaper"
              aria-label="Custom background wallpaper"
            >
              <ImageIcon size={18} />
            </button>

            {isWallpaperOpen && (
              <div className="wallpaper-popover">
                <div className="wallpaper-popover-header">
                  <span className="font-heading text-purple">Custom Background</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-xs"
                    onClick={() => setIsWallpaperOpen(false)}
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
                <p className="wallpaper-desc">
                  Set a custom wallpaper or background image behind this floating glass window.
                </p>

                <div className="wallpaper-options">
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      className="input input-sm"
                      placeholder="Paste image URL..."
                      value={customBgUrl}
                      onChange={(e) => setCustomBgUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyWallpaper(customBgUrl);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleApplyWallpaper(customBgUrl)}
                    >
                      Apply
                    </button>
                  </div>

                  {/* Presets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--crayon-text-muted)', fontFamily: 'var(--font-heading)' }}>
                      Quick Presets:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <button
                        type="button"
                        className="folder-suggestion-chip"
                        onClick={() => handleApplyWallpaper('/wallpapers/crayon-desktop.jpg')}
                      >
                        Crayon Landscape (Desktop)
                      </button>
                      <button
                        type="button"
                        className="folder-suggestion-chip"
                        onClick={() => handleApplyWallpaper('/wallpapers/crayon-mobile.jpg')}
                      >
                        Crayon Scenery (Mobile)
                      </button>
                      <button
                        type="button"
                        className="folder-suggestion-chip"
                        onClick={handleResetWallpaper}
                      >
                        Ambient Mesh
                      </button>
                    </div>
                  </div>

                  <label className="wallpaper-file-label">
                    <ImageIcon size={14} />
                    <span>Upload image from your computer</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleWallpaperFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {/* Download wallpaper links */}
                  <div style={{ borderTop: '1px solid rgba(232, 200, 216, 0.5)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <a
                      href="/wallpapers/crayon-desktop.jpg"
                      download="crayon-desktop-wallpaper.jpg"
                      className="btn btn-ghost btn-xs text-pink"
                      style={{ textDecoration: 'none' }}
                      title="Download full-res desktop wallpaper"
                    >
                      Download Desktop
                    </a>
                    <a
                      href="/wallpapers/crayon-mobile.jpg"
                      download="crayon-mobile-wallpaper.jpg"
                      className="btn btn-ghost btn-xs text-purple"
                      style={{ textDecoration: 'none' }}
                      title="Download full-res mobile wallpaper"
                    >
                      Download Mobile
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-icon wiggle"
            onClick={() => setHistoryOpen(true)}
            title="Document library and folders"
            aria-label="Document library and folders"
          >
            <HistoryIcon size={18} />
          </button>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="mobile-tabs">
        <button
          type="button"
          className={`mobile-tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          <CrayonIcon size={16} />
          <span>Editor</span>
        </button>
        <button
          type="button"
          className={`mobile-tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <EyeIcon size={16} />
          <span>Preview</span>
        </button>
      </div>

      {/* Main content — split pane */}
      <main className="app-main">
        <div className="split-pane">
          <div
            className={`pane pane-editor ${activeTab !== 'editor' ? 'hidden-mobile' : ''}`}
            style={{ ['--editor-font-size' as string]: `${editorFontSize}px` }}
          >
            {/* Floating Zoom Controls to fill the box */}
            <div className="editor-zoom-bar">
              <button
                type="button"
                className="btn-zoom"
                onClick={handleZoomOut}
                disabled={editorFontSize <= 11}
                title="Zoom out text"
                aria-label="Zoom out text"
              >
                <ZoomOutIcon size={14} />
              </button>
              <button
                type="button"
                className="btn-zoom-label"
                onClick={handleZoomReset}
                title="Click to reset zoom to 100%"
              >
                {Math.round((editorFontSize / 15) * 100)}%
              </button>
              <button
                type="button"
                className="btn-zoom"
                onClick={handleZoomIn}
                disabled={editorFontSize >= 26}
                title="Zoom in text to fill the box"
                aria-label="Zoom in text to fill the box"
              >
                <ZoomInIcon size={14} />
              </button>
            </div>

            <Editor value={markdown} onChange={handleChange} />
          </div>

          <div className="pane-divider" />

          <div
            className={`pane pane-preview ${activeTab !== 'preview' ? 'hidden-mobile' : ''}`}
            style={{ ['--preview-font-scale' as string]: `${editorFontSize / 15}` }}
          >
            <Preview markdown={markdown} theme={previewTheme} previewRef={previewRef} />
          </div>
        </div>
      </main>

      {/* Status bar */}
      <footer className="status-bar">
        <div className="status-bar-left">
          <span className="status-indicator">
            <span className={`status-dot ${isSaved ? 'status-dot-saved' : 'status-dot-unsaved'}`} />
            {isSaved ? 'Saved' : 'Unsaved'}
          </span>
          <span className="status-folder">
            <FolderIcon size={12} className="text-purple" />
            <span>{folder}</span>
          </span>
          <span className="status-doc-title">{docTitle}</span>
        </div>
        <div className="status-bar-right">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
      </footer>

      {/* History and folders drawer */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRestore}
      />

      {/* Toasts */}
      <Toast toasts={toasts} />
    </div>
  );
}
