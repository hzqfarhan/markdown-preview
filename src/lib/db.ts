import Dexie, { Table } from 'dexie';

export interface DocEntry {
  id?: number;
  title: string;
  folder: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  folderCustomized?: boolean;
}

export class MarkdownDB extends Dexie {
  docs!: Table<DocEntry, number>;

  constructor() {
    super('markdownPwaDb');
    this.version(1).stores({
      docs: '++id, title, updatedAt',
    });
    this.version(2).stores({
      docs: '++id, title, folder, updatedAt',
    }).upgrade((tx) => {
      return tx.table('docs').toCollection().modify((doc) => {
        if (!doc.folder) doc.folder = 'General Notes';
      });
    });
  }
}

export const db = new MarkdownDB();

export async function saveVersion(
  title: string,
  content: string,
  folder = 'General Notes',
  folderCustomized = false
): Promise<number> {
  const now = Date.now();
  return db.docs.add({
    title,
    folder: folder || 'General Notes',
    content,
    createdAt: now,
    updatedAt: now,
    folderCustomized,
  });
}

export async function updateDoc(
  id: number,
  title: string,
  content: string,
  folder?: string,
  folderCustomized?: boolean
): Promise<void> {
  const updates: Partial<DocEntry> = {
    title,
    content,
    updatedAt: Date.now(),
  };
  if (folder !== undefined) updates.folder = folder;
  if (folderCustomized !== undefined) updates.folderCustomized = folderCustomized;

  await db.docs.update(id, updates);
}

export async function renameFolder(oldName: string, newName: string): Promise<void> {
  if (!newName.trim() || oldName === newName) return;
  const docsToUpdate = await db.docs.where('folder').equals(oldName).toArray();
  for (const doc of docsToUpdate) {
    if (doc.id) {
      await db.docs.update(doc.id, { folder: newName.trim(), updatedAt: Date.now() });
    }
  }
}

export async function getDoc(id: number): Promise<DocEntry | undefined> {
  return db.docs.get(id);
}

export async function deleteDoc(id: number): Promise<void> {
  await db.docs.delete(id);
}

export async function listHistory(): Promise<DocEntry[]> {
  return db.docs.orderBy('updatedAt').reverse().toArray();
}

export async function listFolders(): Promise<string[]> {
  const docs = await db.docs.toArray();
  const folderSet = new Set<string>();
  for (const doc of docs) {
    if (doc.folder) folderSet.add(doc.folder);
  }
  return Array.from(folderSet).sort();
}
