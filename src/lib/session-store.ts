import type { ParsedData, DataAnalysis } from './data-processor';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  dataHash?: string;
  context?: {
    fileName?: string;
    rowCount?: number;
    columnCount?: number;
  };
}

export interface AnalysisRecord {
  id: string;
  dataHash: string;
  analysis: DataAnalysis;
  createdAt: number;
  updatedAt: number;
  fileName: string;
}

class SessionStore {
  private dbName = 'DataInsightSessions';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          chatStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('analyses')) {
          const analysisStore = db.createObjectStore('analyses', { keyPath: 'id' });
          analysisStore.createIndex('dataHash', 'dataHash', { unique: false });
          analysisStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  private getStore(storeName: 'chats' | 'analyses' | 'settings', mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async saveChatSession(session: ChatSession): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('chats', 'readwrite');
      const request = store.put(session);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save chat session'));
    });
  }

  async getChatSession(id: string): Promise<ChatSession | null> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('chats');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get chat session'));
    });
  }

  async getAllChatSessions(): Promise<ChatSession[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('chats');
      const index = store.index('updatedAt');
      const request = index.getAll();
      request.onsuccess = () => {
        const sessions = (request.result || []).sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(sessions);
      };
      request.onerror = () => reject(new Error('Failed to get chat sessions'));
    });
  }

  async deleteChatSession(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('chats', 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete chat session'));
    });
  }

  async getRecentChatSessions(limit: number = 10): Promise<ChatSession[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('chats');
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev');
      const results: ChatSession[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(new Error('Failed to get recent chat sessions'));
    });
  }

  async saveAnalysisRecord(record: AnalysisRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('analyses', 'readwrite');
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save analysis record'));
    });
  }

  async getAnalysisByDataHash(dataHash: string): Promise<AnalysisRecord | null> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('analyses');
      const index = store.index('dataHash');
      const request = index.get(dataHash);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get analysis by data hash'));
    });
  }

  async getAllAnalysisRecords(): Promise<AnalysisRecord[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('analyses');
      const index = store.index('updatedAt');
      const request = index.getAll();
      request.onsuccess = () => {
        const records = (request.result || []).sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(records);
      };
      request.onerror = () => reject(new Error('Failed to get all analysis records'));
    });
  }

  async deleteAnalysisRecord(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('analyses', 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete analysis record'));
    });
  }

  async saveSetting(key: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('settings', 'readwrite');
      const request = store.put({ key, value, updatedAt: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save setting'));
    });
  }

  async getSetting<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('settings');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(new Error('Failed to get setting'));
    });
  }

  async clearAllData(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats', 'analyses', 'settings'], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to clear data'));

      transaction.objectStore('chats').clear();
      transaction.objectStore('analyses').clear();
      transaction.objectStore('settings').clear();
    });
  }

  generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const sessionStore = new SessionStore();

export async function initSessionStore(): Promise<void> {
  try {
    await sessionStore.init();
  } catch (error) {
    console.error('Failed to initialize session store:', error);
    throw error;
  }
}

export function createChatMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  attachments?: string[]
): ChatMessage {
  return {
    id: sessionStore.generateMessageId(),
    role,
    content,
    timestamp: Date.now(),
    attachments
  };
}

export function createChatSession(
  title: string,
  dataHash?: string,
  context?: { fileName?: string; rowCount?: number; columnCount?: number }
): ChatSession {
  return {
    id: sessionStore.generateSessionId(),
    title,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    dataHash,
    context
  };
}
