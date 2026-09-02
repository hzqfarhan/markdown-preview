'use client';

import { useState, useRef, useEffect } from 'react';
import { ExportIcon, PdfDocIcon, WordDocIcon, GoogleDriveIcon, ChevronDownIcon } from './Icons';

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
        <ExportIcon size={16} />
        <span>Export</span>
        <ChevronDownIcon size={14} />
      </button>

      <div className={`dropdown-menu ${isOpen ? 'open' : ''}`} role="menu">
        <button
          className="dropdown-item"
          onClick={() => handleAction(onExportPdf)}
          role="menuitem"
        >
          <PdfDocIcon size={18} className="text-pink" />
          <span>Export as PDF</span>
        </button>
        <button
          className="dropdown-item"
          onClick={() => handleAction(onExportDocx)}
          role="menuitem"
        >
          <WordDocIcon size={18} className="text-purple" />
          <span>Export as DOCX</span>
        </button>
        <div className="dropdown-divider" />
        <button
          className="dropdown-item"
          onClick={() => handleAction(onExportGoogleDocs)}
          role="menuitem"
        >
          <GoogleDriveIcon size={18} className="text-pink" />
          <span>Export to Google Docs</span>
        </button>
      </div>
    </div>
  );
}
