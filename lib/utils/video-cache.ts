import { openDB } from 'idb';

const initDB = async () => {
  console.log('Initializing IndexedDB...');
  try {
    const db = await openDB('sendpin-cache', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos');
        }
      },
    });
    console.log('IndexedDB initialized');
    return db;
  } catch (error) {
    console.error('Error initializing IndexedDB:', error);
    return null;
  }
};

export const cacheVideo = async (url: string, blob: Blob) => {
  console.log('Caching video:', url);
  const db = await initDB();
  if (!db) return;
  
  try {
    await db.put('videos', blob, url);
    console.log('Video cached successfully');
  } catch (error) {
    console.error('Error caching video:', error);
  }
};

export const getCachedVideo = async (url: string): Promise<Blob | null> => {
  console.log('Fetching cached video:', url);
  const db = await initDB();
  if (!db) return null;
  
  try {
    const blob = await db.get('videos', url);
    console.log('Cache result:', blob ? 'hit' : 'miss');
    return blob || null;
  } catch (error) {
    console.error('Error fetching cached video:', error);
    return null;
  }
}; 