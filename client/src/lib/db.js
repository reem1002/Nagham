import { openDB } from 'idb';

// One IndexedDB database holds everything the app needs offline:
//  downloads – song metadata + audio Blob + cover Blob (the offline library)
//  cache     – last good JSON response per API path (so screens render offline)
//  shares    – files received from Android's Share menu, waiting to be imported
//  outbox    – listening events / favorite toggles made offline, synced later
export const dbPromise = openDB('nagham', 1, {
  upgrade(db) {
    const downloads = db.createObjectStore('downloads', { keyPath: 'id' });
    downloads.createIndex('savedAt', 'savedAt');
    db.createObjectStore('cache');
    db.createObjectStore('shares', { keyPath: 'id', autoIncrement: true });
    db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
  },
});

export async function cacheGet(key) {
  return (await dbPromise).get('cache', key);
}

export async function cacheSet(key, value) {
  return (await dbPromise).put('cache', value, key);
}
