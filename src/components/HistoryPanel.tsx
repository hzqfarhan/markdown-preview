'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, DocEntry, deleteDoc } from '@/lib/db';
import { useState } from 'react';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (doc: DocEntry) => void;
}

export default function HistoryPanel({ isOpen, onClose, onRestore }: HistoryPanelProps) {
  const docs = useLiveQuery(() => db.docs.orderBy('updatedAt').reverse().toArray());
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  return (
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Drawer */}
      <div className={`drawer ${isOpen ? 'open' : ''}`} role="dialog" aria-label="Document History">
        <div className="drawer-header">
          <h2>📚 History</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close history">
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {!docs || docs.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">📝</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--crayon-text-muted)' }}>
                No saved documents yet
              </h3>
              <p style={{ color: 'var(--crayon-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                Your documents will be saved automatically as you type.
              </p>
            </div>
          ) : (
            docs.map((doc) => (
              <div
                key={doc.id}
                className="history-item"
                onClick={() => onRestore(doc)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onRestore(doc)}
              >
                <div className="history-item-info">
                  <div className="history-item-title">{doc.title || 'Untitled'}</div>
                  <div className="history-item-date">
                    {formatDate(doc.updatedAt)} · {doc.content.length} chars
                  </div>
                </div>
                <div className="history-item-actions">
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={(e) => handleDelete(e, doc.id!)}
                    disabled={deletingId === doc.id}
                    aria-label={`Delete ${doc.title || 'Untitled'}`}
                    title="Delete"
                  >
                    {deletingId === doc.id ? '⏳' : '🗑️'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
