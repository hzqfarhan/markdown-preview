'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, DocEntry, deleteDoc, renameFolder } from '@/lib/db';
import { useState, useMemo } from 'react';
import {
  HistoryIcon,
  FolderIcon,
  FileIcon,
  TrashIcon,
  CloseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  CheckIcon,
  EmptyDocIllustration,
} from './Icons';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (doc: DocEntry) => void;
}

export default function HistoryPanel({ isOpen, onClose, onRestore }: HistoryPanelProps) {
  const docs = useLiveQuery(() => db.docs.orderBy('updatedAt').reverse().toArray());
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [editingFolderName, setEditingFolderName] = useState<string | null>(null);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Group documents by folder
  const groupedDocs = useMemo(() => {
    if (!docs) return {};
    const groups: Record<string, DocEntry[]> = {};

    const filtered = searchQuery.trim()
      ? docs.filter(
          (d) =>
            d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.folder && d.folder.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : docs;

    for (const doc of filtered) {
      const folder = doc.folder || 'General Notes';
      if (!groups[folder]) {
        groups[folder] = [];
      }
      groups[folder].push(doc);
    }
    return groups;
  }, [docs, searchQuery]);

  const folderNames = Object.keys(groupedDocs).sort();

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setDeletingId(id);
    await deleteDoc(id);
    setDeletingId(null);
  }

  function toggleFolder(folder: string) {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folder]: !prev[folder],
    }));
  }

  function startRenameFolder(e: React.MouseEvent, folder: string) {
    e.stopPropagation();
    setEditingFolderName(folder);
    setNewFolderNameInput(folder);
  }

  async function saveFolderRename(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (editingFolderName && newFolderNameInput.trim()) {
      await renameFolder(editingFolderName, newFolderNameInput.trim());
    }
    setEditingFolderName(null);
    setNewFolderNameInput('');
  }

  function cancelFolderRename(e: React.MouseEvent) {
    e.stopPropagation();
    setEditingFolderName(null);
    setNewFolderNameInput('');
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Drawer */}
      <div className={`drawer ${isOpen ? 'open' : ''}`} role="dialog" aria-label="Document History and Folders">
        <div className="drawer-header">
          <div className="drawer-title">
            <HistoryIcon size={20} className="text-purple" />
            <h2>Library & Folders</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close history">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="history-search-box">
          <input
            type="text"
            className="input input-sm"
            placeholder="Search notes or folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="drawer-body">
          {!docs || docs.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">
                <EmptyDocIllustration size={56} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--crayon-text-muted)' }}>
                No saved documents yet
              </h3>
              <p style={{ color: 'var(--crayon-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                Your documents and folders will be saved automatically as you write.
              </p>
            </div>
          ) : folderNames.length === 0 ? (
            <div className="history-empty">
              <p style={{ color: 'var(--crayon-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                No documents match &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : (
            folderNames.map((folder) => {
              const isCollapsed = !!collapsedFolders[folder];
              const folderDocs = groupedDocs[folder] || [];
              const isEditing = editingFolderName === folder;

              return (
                <div key={folder} className="history-folder-group">
                  {/* Folder header */}
                  <div
                    className="history-folder-header"
                    onClick={() => toggleFolder(folder)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && toggleFolder(folder)}
                  >
                    <div className="history-folder-title-wrap">
                      <span className="folder-chevron">
                        {isCollapsed ? <ChevronRightIcon size={14} /> : <ChevronDownIcon size={14} />}
                      </span>
                      <FolderIcon size={16} className="text-purple" />

                      {isEditing ? (
                        <div
                          className="folder-rename-form"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            className="input input-xs"
                            value={newFolderNameInput}
                            onChange={(e) => setNewFolderNameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveFolderRename();
                              if (e.key === 'Escape') setEditingFolderName(null);
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-xs text-pink"
                            onClick={() => saveFolderRename()}
                            title="Save folder name"
                          >
                            <CheckIcon size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-xs"
                            onClick={cancelFolderRename}
                            title="Cancel"
                          >
                            <CloseIcon size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="history-folder-name">
                          {folder}
                          <span className="history-folder-count">({folderDocs.length})</span>
                        </span>
                      )}
                    </div>

                    {!isEditing && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-xs folder-edit-btn"
                        onClick={(e) => startRenameFolder(e, folder)}
                        title="Rename folder"
                        aria-label={`Rename folder ${folder}`}
                      >
                        <EditIcon size={12} />
                      </button>
                    )}
                  </div>

                  {/* Folder children */}
                  {!isCollapsed && (
                    <div className="history-folder-items">
                      {folderDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="history-item"
                          onClick={() => onRestore(doc)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && onRestore(doc)}
                        >
                          <FileIcon size={16} className="text-pink flex-shrink-0" />
                          <div className="history-item-info">
                            <div className="history-item-title">{doc.title || 'Untitled'}</div>
                            <div className="history-item-date">
                              {formatDate(doc.updatedAt)} · {doc.content.length} chars
                            </div>
                          </div>
                          <div className="history-item-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={(e) => handleDelete(e, doc.id!)}
                              disabled={deletingId === doc.id}
                              aria-label={`Delete ${doc.title || 'Untitled'}`}
                              title="Delete document"
                            >
                              <TrashIcon size={14} className="text-muted" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
