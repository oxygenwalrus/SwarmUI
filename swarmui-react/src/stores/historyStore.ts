/**
 * History Store
 * 
 * UI slice for generation history. References entries in the entity store.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { useEntityStore } from './entityStore';
import type { HistoryEntryEntity } from './entityTypes';

// Legacy interface for backward compatibility
export interface HistoryEntry {
    id: string;
    timestamp: number;
    prompt: string;
    negativePrompt: string;
    model: string;
    imagePaths: string[];
    params: {
        steps?: number;
        cfgScale?: number;
        width?: number;
        height?: number;
        seed?: number;
        sampler?: string;
    };
}

interface HistoryUIState {
    entryIds: string[];
    maxEntries: number;

    // Memoization cache (not persisted)
    _cachedEntries: HistoryEntry[];
    _entriesCacheKey: string | null;
}

interface HistoryUIActions {
    addEntry: (entry: Omit<HistoryEntry, 'id'>) => void;
    removeEntry: (id: string) => void;
    clearHistory: () => void;
    getEntry: (id: string) => HistoryEntry | undefined;

    // Legacy getter for backward compatibility
    get entries(): HistoryEntry[];
}

// Convert HistoryEntryEntity to legacy HistoryEntry format
const toHistoryEntry = (entity: HistoryEntryEntity): HistoryEntry => ({
    id: entity.id,
    timestamp: entity.timestamp,
    prompt: entity.prompt,
    negativePrompt: entity.negativePrompt,
    model: entity.model,
    imagePaths: entity.imagePaths,
    params: entity.params,
});

// Memoized selector for entries - only recomputes when dependencies change
export const selectEntries = (
    state: HistoryUIState,
    entityHistory: Record<string, HistoryEntryEntity>
): HistoryEntry[] => {
    const cacheKey = `${state.entryIds.join(',')}:${Object.keys(entityHistory).length}`;

    if (cacheKey === state._entriesCacheKey) {
        return state._cachedEntries;
    }

    const entries = state.entryIds
        .map((id) => entityHistory[id])
        .filter(Boolean)
        .map(toHistoryEntry);

    queueMicrotask(() => {
        useHistoryStore.setState({ _cachedEntries: entries, _entriesCacheKey: cacheKey });
    });

    return entries;
};

export const useHistoryStore = create<HistoryUIState & HistoryUIActions>()(
    devtools(
        persist(
            (set, get) => ({
                entryIds: [],
                maxEntries: 50,

                // Memoization cache initialized
                _cachedEntries: [],
                _entriesCacheKey: null,

                // Legacy getter using memoized selector
                get entries() {
                    const entityStore = useEntityStore.getState();
                    return selectEntries(get(), entityStore.entities.history);
                },

                addEntry: (entry) => {
                    const id = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                    const historyEntity: HistoryEntryEntity = {
                        id,
                        timestamp: entry.timestamp,
                        prompt: entry.prompt,
                        negativePrompt: entry.negativePrompt,
                        model: entry.model,
                        imageIds: [], // For future use with normalized images
                        imagePaths: entry.imagePaths,
                        params: entry.params,
                    };

                    // Add to entity store
                    useEntityStore.getState().setEntity('history', historyEntity);

                    // Update UI state, keeping only maxEntries
                    set((state) => {
                        const newEntryIds = [id, ...state.entryIds].slice(0, state.maxEntries);

                        // Remove old entries from entity store
                        const removedIds = state.entryIds.filter(
                            (eid) => !newEntryIds.includes(eid)
                        );
                        if (removedIds.length > 0) {
                            useEntityStore.getState().removeEntities('history', removedIds);
                        }

                        return { entryIds: newEntryIds };
                    });
                },

                removeEntry: (id) => {
                    useEntityStore.getState().removeEntity('history', id);
                    set((state) => ({
                        entryIds: state.entryIds.filter((eid) => eid !== id),
                    }));
                },

                clearHistory: () => {
                    const { entryIds } = get();
                    useEntityStore.getState().removeEntities('history', entryIds);
                    set({ entryIds: [] });
                },

                getEntry: (id) => {
                    const entity = useEntityStore.getState().entities.history[id];
                    return entity ? toHistoryEntry(entity) : undefined;
                },
            }),
            {
                name: 'swarm-history',
                partialize: (state) => ({
                    entryIds: state.entryIds,
                    maxEntries: state.maxEntries,
                }),
            }
        ),
        { name: 'HistoryStore' }
    )
);
