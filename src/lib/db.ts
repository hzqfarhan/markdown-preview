import Dexie, { Table } from 'dexie';

export interface DocEntry {
  id?: number;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export class MarkdownDB extends Dexie {
  docs!: Table<DocEntry, number>;

  constructor() {
    super('markdownPwaDb');
    this.version(1).stores({
      docs: '++id, title, updatedAt',
    });
  }
}

export const db = new MarkdownDB();

export async function saveVersion(title: string, content: string): Promise<number> {
  const now = Date.now();
  return db.docs.add({ title, content, createdAt: now, updatedAt: now });
}

export async function updateDoc(id: number, title: string, content: string): Promise<void> {
  await db.docs.update(id, { title, content, updatedAt: Date.now() });
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
