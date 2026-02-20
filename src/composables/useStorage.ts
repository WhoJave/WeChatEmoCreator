import { openDB, type IDBPDatabase } from 'idb';

export interface StoredAsset {
    id: string;
    name: string;
    dataUrl: string;
    type: 'image' | 'sticker';
    createdAt: number;
}

const DB_NAME = 'wechat-emoji-creator';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

let db: IDBPDatabase | null = null;

const getDb = async (): Promise<IDBPDatabase> => {
    if (db) return db;
    db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(database) {
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    });
    return db;
};

export function useStorage() {
    const saveAsset = async (asset: StoredAsset): Promise<void> => {
        const database = await getDb();
        await database.put(STORE_NAME, asset);
    };

    const loadAllAssets = async (): Promise<StoredAsset[]> => {
        const database = await getDb();
        const all = await database.getAll(STORE_NAME);
        // Sort newest first
        return all.sort((a, b) => b.createdAt - a.createdAt);
    };

    const deleteAsset = async (id: string): Promise<void> => {
        const database = await getDb();
        await database.delete(STORE_NAME, id);
    };

    const clearAllAssets = async (): Promise<void> => {
        const database = await getDb();
        await database.clear(STORE_NAME);
    };

    return { saveAsset, loadAllAssets, deleteAsset, clearAllAssets };
}
