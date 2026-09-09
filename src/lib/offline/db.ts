/**
 * Offline persistence layer (IndexedDB).
 *
 * A zero-dependency, promise-based wrapper around the native IndexedDB API.
 * Every public function is defensive: any IndexedDB failure (quota, private
 * mode, corrupted DB, SSR) resolves to `null` / `false` instead of throwing,
 * because the offline layer must NEVER break the online experience.
 *
 * Object stores:
 * - `payloads`          : raw API response shadows (keys: "setlists", "songs")
 * - `pinned_setlists`   : fully hydrated setlists pinned via "Offline Opslaan"
 */

const DB_NAME = "gigmanager-offline";
const DB_VERSION = 1;
const PAYLOAD_STORE = "payloads";
const PINNED_STORE = "pinned_setlists";

/** A setlist explicitly pinned for offline use ("Offline Opslaan"). */
export interface PinnedSetlistRecord {
  id: string;
  pinnedAt: string;
  /** Raw /api/setlists payload entry (includes items, gigs, description meta). */
  setlist: unknown;
  /** Attachments per setlist-item id, as loaded by loadItemAttachments(). */
  itemAttachments: Record<string, unknown[]>;
  /** Snapshot of the raw /api/songs payload at pin time (lyrics, attachments). */
  songs: unknown[];
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function hasIndexedDB(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDB()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PAYLOAD_STORE)) {
          db.createObjectStore(PAYLOAD_STORE);
        }
        if (!db.objectStoreNames.contains(PINNED_STORE)) {
          db.createObjectStore(PINNED_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // A version-change request from another tab must not leave us with a
        // closed connection mid-operation.
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => {
        console.warn("[offline/db] failed to open IndexedDB:", request.error);
        resolve(null);
      };
    } catch (err) {
      console.warn("[offline/db] IndexedDB unavailable:", err);
      resolve(null);
    }
  });

  return dbPromise;
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  return openDb().then((db) => {
    if (!db) return null;
    return new Promise<T | null>((resolve) => {
      try {
        const tx = db.transaction(storeName, mode);
        const request = run(tx.objectStore(storeName));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => {
          console.warn("[offline/db] request failed:", request.error);
          resolve(null);
        };
      } catch (err) {
        console.warn("[offline/db] transaction failed:", err);
        resolve(null);
      }
    });
  });
}

// --- Raw payload shadow copies (auto-written on every successful load) ------

export function savePayload<T>(key: string, data: T): Promise<boolean> {
  return withStore<IDBValidKey>(PAYLOAD_STORE, "readwrite", (store) => store.put(data, key)).then(
    (result) => result !== null,
  );
}

export function getPayload<T>(key: string): Promise<T | null> {
  return withStore<T>(PAYLOAD_STORE, "readonly", (store) => store.get(key)).then(
    (result) => (result === undefined ? null : result),
  );
}

// --- Pinned setlists ---------------------------------------------------------

export function savePinnedSetlist(record: PinnedSetlistRecord): Promise<boolean> {
  return withStore<IDBValidKey>(PINNED_STORE, "readwrite", (store) => store.put(record)).then(
    (result) => result !== null,
  );
}

export function deletePinnedSetlist(id: string): Promise<boolean> {
  return withStore<undefined>(PINNED_STORE, "readwrite", (store) => store.delete(id)).then(
    (result) => result !== null,
  );
}

export function getPinnedSetlist(id: string): Promise<PinnedSetlistRecord | null> {
  return withStore<PinnedSetlistRecord>(PINNED_STORE, "readonly", (store) => store.get(id));
}

export async function getPinnedSetlists(): Promise<PinnedSetlistRecord[]> {
  const all = await withStore<PinnedSetlistRecord[]>(
    PINNED_STORE,
    "readonly",
    (store) => store.getAll(),
  );
  return Array.isArray(all) ? all : [];
}

export async function getPinnedSetlistIds(): Promise<Set<string>> {
  const records = await getPinnedSetlists();
  return new Set(records.map((record) => record.id));
}
