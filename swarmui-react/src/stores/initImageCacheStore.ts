/**
 * Init Image Cache Store
 * 
 * Caches metadata about init images to avoid redundant processing.
 * Works with the WebWorker to pre-compute hashes and thumbnails.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

interface InitImageCacheEntry {
    /** Hash of the image data */
    hash: string;
    /** Original image URL or data URL */
    originalUrl: string;
    /** Cached thumbnail data URL */
    thumbnailUrl?: string;
    /** Image dimensions */
    dimensions: {
        width: number;
        height: number;
    };
    /** File size in bytes */
    fileSize?: number;
    /** Dominant color for placeholder */
    dominantColor?: string;
    /** Timestamp when cached */
    timestamp: number;
    /** Number of times this image was used */
    useCount: number;
}

interface InitImageCacheState {
    /** Cached entries by hash */
    entries: Record<string, InitImageCacheEntry>;
    /** Maximum cache size */
    maxEntries: number;
    /** Current init image hash (if any) */
    currentHash: string | null;
}

interface InitImageCacheActions {
    /** Add or update an entry */
    addEntry: (entry: Omit<InitImageCacheEntry, 'timestamp' | 'useCount'>) => void;
    /** Get entry by hash */
    getEntry: (hash: string) => InitImageCacheEntry | null;
    /** Get entry by URL */
    getEntryByUrl: (url: string) => InitImageCacheEntry | null;
    /** Check if image is cached */
    hasImage: (hash: string) => boolean;
    /** Mark image as used (updates useCount and timestamp) */
    markUsed: (hash: string) => void;
    /** Set current init image */
    setCurrentImage: (hash: string | null) => void;
    /** Get current init image entry */
    getCurrentImage: () => InitImageCacheEntry | null;
    /** Remove entry */
    removeEntry: (hash: string) => void;
    /** Clear all entries */
    clear: () => void;
    /** Get frequently used images */
    getFrequentImages: (limit?: number) => InitImageCacheEntry[];
    /** Prune old entries */
    pruneOld: (maxAge: number) => void;
}

// ============================================================================
// Store
// ============================================================================

export const useInitImageCacheStore = create<InitImageCacheState & InitImageCacheActions>()(
    devtools(
        persist(
            (set, get) => ({
                // State
                entries: {},
                maxEntries: 50,
                currentHash: null,

                // Actions
                addEntry: (entry) => {
                    set(state => {
                        const entries = { ...state.entries };

                        // LRU eviction based on useCount and timestamp
                        const hashes = Object.keys(entries);
                        if (hashes.length >= state.maxEntries) {
                            // Find least recently used entry with lowest use count
                            let evictHash = hashes[0];
                            let evictScore = entries[evictHash].useCount * 1000000 + entries[evictHash].timestamp;

                            for (const h of hashes) {
                                const score = entries[h].useCount * 1000000 + entries[h].timestamp;
                                if (score < evictScore) {
                                    evictScore = score;
                                    evictHash = h;
                                }
                            }
                            delete entries[evictHash];
                        }

                        // Add or update entry
                        const existing = entries[entry.hash];
                        entries[entry.hash] = {
                            ...entry,
                            timestamp: Date.now(),
                            useCount: existing ? existing.useCount + 1 : 1,
                        };

                        return { entries };
                    });
                },

                getEntry: (hash) => {
                    return get().entries[hash] || null;
                },

                getEntryByUrl: (url) => {
                    const entries = Object.values(get().entries);
                    return entries.find(e => e.originalUrl === url) || null;
                },

                hasImage: (hash) => {
                    return !!get().entries[hash];
                },

                markUsed: (hash) => {
                    set(state => {
                        const entry = state.entries[hash];
                        if (!entry) return state;

                        return {
                            entries: {
                                ...state.entries,
                                [hash]: {
                                    ...entry,
                                    timestamp: Date.now(),
                                    useCount: entry.useCount + 1,
                                },
                            },
                        };
                    });
                },

                setCurrentImage: (hash) => {
                    set({ currentHash: hash });
                    if (hash) {
                        get().markUsed(hash);
                    }
                },

                getCurrentImage: () => {
                    const { currentHash, entries } = get();
                    if (!currentHash) return null;
                    return entries[currentHash] || null;
                },

                removeEntry: (hash) => {
                    set(state => {
                        const entries = { ...state.entries };
                        delete entries[hash];
                        return {
                            entries,
                            currentHash: state.currentHash === hash ? null : state.currentHash,
                        };
                    });
                },

                clear: () => {
                    set({ entries: {}, currentHash: null });
                },

                getFrequentImages: (limit = 10) => {
                    const entries = Object.values(get().entries);
                    return entries
                        .sort((a, b) => b.useCount - a.useCount)
                        .slice(0, limit);
                },

                pruneOld: (maxAge) => {
                    const cutoff = Date.now() - maxAge;
                    set(state => {
                        const entries: Record<string, InitImageCacheEntry> = {};
                        for (const [hash, entry] of Object.entries(state.entries)) {
                            if (entry.timestamp >= cutoff) {
                                entries[hash] = entry;
                            }
                        }
                        return { entries };
                    });
                },
            }),
            {
                name: 'swarmui-init-image-cache',
                partialize: (state) => ({
                    entries: state.entries,
                }),
            }
        ),
        { name: 'InitImageCacheStore' }
    )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCacheSize = (state: InitImageCacheState) =>
    Object.keys(state.entries).length;

export const selectCurrentImage = (state: InitImageCacheState & InitImageCacheActions) =>
    state.getCurrentImage();

export const selectHasCurrentImage = (state: InitImageCacheState) =>
    state.currentHash !== null;

export default useInitImageCacheStore;
