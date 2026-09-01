'use client';

import { useState, useRef, useEffect } from 'react';

interface ExportMenuProps {
  onExportPdf: () => void;
  onExportDocx: () => void;
  onExportGoogleDocs: () => void;
}

export default function ExportMenu({ onExportPdf, onExportDocx, onExportGoogleDocs }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleAction(action: () => void) {
    action();
    setIsOpen(false);
  }

  return (
    <div className="dropdown" ref={menuRef}>
      <button
        className="btn btn-secondary wiggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Export document"
      >
        📤 Export
      </button>

      <div className={`dropdown-menu ${isOpen ? 'open' : ''}`} role="menu">
        <button
          className="dropdown-item"
          onClick={() => handleAction(onExportPdf)}
          role="menuitem"
        >
          📕 Export as PDF
        </button>
        <button
          className="dropdown-item"
          onClick={() => handleAction(onExportDocx)}
          role="menuitem"
        >
          📘 Export as DOCX
        </button>
        <div className="dropdown-divider" />
        <button
          className="dropdown-item"
          onClick={() => handleAction(onExportGoogleDocs)}
          role="menuitem"
        >
          📗 Export to Google Docs
        </button>
      </div>
    </div>
  );
}
